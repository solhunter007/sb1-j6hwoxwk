/*
  # Fix ambiguous column references in delete_user function
  
  1. Changes
    - Add explicit table references to avoid ambiguous column references
    - Maintain the same deletion order for data integrity
  
  2. Security
    - Function remains security definer to allow deletion of user's own data
    - Only authenticated users can call this function
    - Users can only delete their own account
*/

-- Drop the existing function
DROP FUNCTION IF EXISTS delete_user();

-- Create the new delete_user function with explicit table references
CREATE OR REPLACE FUNCTION delete_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get the current user's ID
  v_user_id := auth.uid();
  
  -- Delete all related data first with explicit table references
  DELETE FROM sermon_notes WHERE sermon_notes.author_id = v_user_id;
  DELETE FROM comments WHERE comments.author_id = v_user_id;
  DELETE FROM praises WHERE praises.user_id = v_user_id;
  DELETE FROM memberships WHERE memberships.user_id = v_user_id;
  DELETE FROM notifications WHERE notifications.user_id = v_user_id;
  
  -- Delete the profile
  DELETE FROM profiles WHERE profiles.id = v_user_id;
  
  -- Finally, delete the auth user
  DELETE FROM auth.users WHERE auth.users.id = v_user_id;
END;
$$;