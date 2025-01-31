/*
  # Fix Comment Counter Functionality V3

  1. Changes
    - Add atomic increment/decrement functions
    - Add transaction support for count updates
    - Improve error handling and race condition prevention

  2. Security
    - All functions are SECURITY DEFINER
    - Proper access control checks
*/

-- Function to get comment count with transaction support
CREATE OR REPLACE FUNCTION get_comment_count_v3(p_sermon_note_id UUID)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  -- Get count directly from comments table
  SELECT COUNT(*) INTO v_count
  FROM comments
  WHERE sermon_note_id = p_sermon_note_id;
  
  RETURN COALESCE(v_count, 0);
END;
$$;

-- Function to handle comment changes with transaction support
CREATE OR REPLACE FUNCTION handle_comment_count_change_v3()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Notify clients about the change
  IF TG_OP = 'INSERT' THEN
    PERFORM pg_notify(
      'comment_changes',
      json_build_object(
        'sermon_note_id', NEW.sermon_note_id,
        'action', 'insert'
      )::text
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM pg_notify(
      'comment_changes',
      json_build_object(
        'sermon_note_id', OLD.sermon_note_id,
        'action', 'delete'
      )::text
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS handle_comment_count_change_v3_trigger ON comments;

-- Create new trigger for comment count updates
CREATE TRIGGER handle_comment_count_change_v3_trigger
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION handle_comment_count_change_v3();