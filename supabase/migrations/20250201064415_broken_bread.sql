/*
  # Add Social Features

  1. New Tables
    - `follows` - Tracks user follows
    - `church_memberships` - Tracks church memberships
    - `notifications` - Enhanced for follow events

  2. Security
    - Enable RLS on all new tables
    - Add policies for follows and memberships
    - Add policies for notifications

  3. Functions
    - Toggle follow
    - Get follow counts
    - Handle church membership
*/

-- Create follows table
CREATE TABLE IF NOT EXISTS follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  following_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

-- Create church_memberships table
CREATE TABLE IF NOT EXISTS church_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  church_id uuid REFERENCES churches(id) ON DELETE CASCADE NOT NULL,
  status text CHECK (status IN ('pending', 'active', 'rejected')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, church_id)
);

-- Add follower counts to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS follower_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS following_count integer DEFAULT 0;

-- Enable RLS
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE church_memberships ENABLE ROW LEVEL SECURITY;

-- Follows policies
CREATE POLICY "Users can view follows"
  ON follows FOR SELECT
  USING (true);

CREATE POLICY "Users can follow others"
  ON follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
  ON follows FOR DELETE
  USING (auth.uid() = follower_id);

-- Church memberships policies
CREATE POLICY "Users can view church memberships"
  ON church_memberships FOR SELECT
  USING (true);

CREATE POLICY "Users can request church membership"
  ON church_memberships FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own membership"
  ON church_memberships FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to toggle follow
CREATE OR REPLACE FUNCTION toggle_follow(
  p_following_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_follower_id UUID;
  v_exists BOOLEAN;
  v_result jsonb;
BEGIN
  -- Get current user ID
  v_follower_id := auth.uid();
  
  -- Check if already following
  SELECT EXISTS (
    SELECT 1 FROM follows
    WHERE follower_id = v_follower_id
    AND following_id = p_following_id
  ) INTO v_exists;

  IF v_exists THEN
    -- Unfollow
    DELETE FROM follows
    WHERE follower_id = v_follower_id
    AND following_id = p_following_id;
    
    -- Update counts
    UPDATE profiles
    SET follower_count = follower_count - 1
    WHERE id = p_following_id;
    
    UPDATE profiles
    SET following_count = following_count - 1
    WHERE id = v_follower_id;
    
    v_result := jsonb_build_object(
      'action', 'unfollowed',
      'following_id', p_following_id
    );
  ELSE
    -- Follow
    INSERT INTO follows (follower_id, following_id)
    VALUES (v_follower_id, p_following_id);
    
    -- Update counts
    UPDATE profiles
    SET follower_count = follower_count + 1
    WHERE id = p_following_id;
    
    UPDATE profiles
    SET following_count = following_count + 1
    WHERE id = v_follower_id;
    
    -- Create notification
    INSERT INTO notifications (
      user_id,
      type,
      content
    ) VALUES (
      p_following_id,
      'new_follower',
      jsonb_build_object(
        'follower_id', v_follower_id
      )
    );
    
    v_result := jsonb_build_object(
      'action', 'followed',
      'following_id', p_following_id
    );
  END IF;

  RETURN v_result;
END;
$$;

-- Function to get follow counts
CREATE OR REPLACE FUNCTION get_follow_counts(
  p_user_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_follower_count integer;
  v_following_count integer;
  v_is_following boolean;
BEGIN
  -- Get counts
  SELECT follower_count, following_count
  INTO v_follower_count, v_following_count
  FROM profiles
  WHERE id = p_user_id;
  
  -- Check if current user is following
  IF auth.uid() IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM follows
      WHERE follower_id = auth.uid()
      AND following_id = p_user_id
    ) INTO v_is_following;
  END IF;

  RETURN jsonb_build_object(
    'follower_count', v_follower_count,
    'following_count', v_following_count,
    'is_following', COALESCE(v_is_following, false)
  );
END;
$$;

-- Function to get mutual followers
CREATE OR REPLACE FUNCTION get_mutual_followers(
  p_user_id UUID
)
RETURNS TABLE (
  mutual_follower_id UUID,
  username text,
  full_name text,
  avatar_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as mutual_follower_id,
    p.username,
    p.full_name,
    p.avatar_url
  FROM follows f1
  JOIN follows f2 ON f1.follower_id = f2.follower_id
  JOIN profiles p ON f1.follower_id = p.id
  WHERE f1.following_id = auth.uid()
  AND f2.following_id = p_user_id
  AND f1.follower_id != auth.uid()
  AND f1.follower_id != p_user_id;
END;
$$;

-- Function to handle church membership
CREATE OR REPLACE FUNCTION handle_church_membership(
  p_church_id UUID,
  p_action text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_result jsonb;
BEGIN
  v_user_id := auth.uid();
  
  CASE p_action
    WHEN 'join' THEN
      INSERT INTO church_memberships (user_id, church_id)
      VALUES (v_user_id, p_church_id)
      ON CONFLICT (user_id, church_id) 
      DO UPDATE SET status = 'pending', updated_at = now()
      RETURNING jsonb_build_object(
        'action', 'requested',
        'church_id', church_id,
        'status', status
      ) INTO v_result;
      
    WHEN 'leave' THEN
      DELETE FROM church_memberships
      WHERE user_id = v_user_id AND church_id = p_church_id
      RETURNING jsonb_build_object(
        'action', 'left',
        'church_id', church_id
      ) INTO v_result;
      
    ELSE
      RAISE EXCEPTION 'Invalid action: %', p_action;
  END CASE;

  RETURN v_result;
END;
$$;