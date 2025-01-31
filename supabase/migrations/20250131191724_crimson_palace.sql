/*
  # Add Comment Praise System

  1. New Tables
    - `comment_praises`
      - `id` (uuid, primary key)
      - `comment_id` (uuid, references comments)
      - `user_id` (uuid, references profiles)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on comment_praises table
    - Add policies for authenticated users
*/

-- Create comment_praises table
CREATE TABLE IF NOT EXISTS comment_praises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid REFERENCES comments(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- Enable RLS
ALTER TABLE comment_praises ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view comment praises"
  ON comment_praises FOR SELECT
  USING (true);

CREATE POLICY "Users can praise comments"
  ON comment_praises FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their praises"
  ON comment_praises FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_comment_praises_comment_id ON comment_praises(comment_id);
CREATE INDEX idx_comment_praises_user_id ON comment_praises(user_id);

-- Create function to get comment praise state
CREATE OR REPLACE FUNCTION get_comment_praise_state(
  p_comment_id UUID,
  p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_praised BOOLEAN;
  v_count INTEGER;
BEGIN
  -- Check if user has praised
  SELECT EXISTS (
    SELECT 1 
    FROM comment_praises 
    WHERE comment_id = p_comment_id 
    AND user_id = p_user_id
  ) INTO v_has_praised;

  -- Get total praise count
  SELECT COUNT(*) 
  FROM comment_praises 
  WHERE comment_id = p_comment_id 
  INTO v_count;

  -- Return result
  RETURN json_build_object(
    'has_praised', v_has_praised,
    'praise_count', v_count
  );
END;
$$;