/*
  # Add user deletion function
  
  1. New Functions
    - `delete_user`: Allows users to delete their own account
  
  2. Security
    - Function is security definer to allow deletion of user's own data
    - Only authenticated users can call this function
    - Users can only delete their own account
*/

CREATE OR REPLACE FUNCTION delete_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete user's data (this will cascade to related tables)
  DELETE FROM auth.users
  WHERE id = auth.uid();
END;
$$;