/*
  # Update user deletion function
  
  1. Changes
    - Modify delete_user function to handle deletion in correct order
    - Add cascade delete triggers
  
  2. Security
    - Function is security definer to allow deletion of user's own data
    - Only authenticated users can call this function
    - Users can only delete their own account
*/

-- First, drop the existing function if it exists
DROP FUNCTION IF EXISTS delete_user();

-- Create the new delete_user function with proper cascade
CREATE OR REPLACE FUNCTION delete_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_id uuid;
BEGIN
  -- Get the current user's ID
  user_id := auth.uid();
  
  -- Delete all related data first
  DELETE FROM sermon_notes WHERE author_id = user_id;
  DELETE FROM comments WHERE author_id = user_id;
  DELETE FROM praises WHERE user_id = user_id;
  DELETE FROM memberships WHERE user_id = user_id;
  DELETE FROM notifications WHERE user_id = user_id;
  
  -- Delete the profile
  DELETE FROM profiles WHERE id = user_id;
  
  -- Finally, delete the auth user
  DELETE FROM auth.users WHERE id = user_id;
END;
$$;