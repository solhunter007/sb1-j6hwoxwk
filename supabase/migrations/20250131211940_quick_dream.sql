/*
  # Comment System Fix

  1. Changes
    - Remove system_logs dependency
    - Simplify comment counting
    - Add real-time notifications
    - Add proper error handling

  2. Security
    - All functions are SECURITY DEFINER
    - Input validation
    - Error handling
*/

-- Function to get comment count
CREATE OR REPLACE FUNCTION get_comment_count_v9(p_sermon_note_id UUID)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  -- Input validation
  IF p_sermon_note_id IS NULL THEN
    RAISE EXCEPTION 'sermon_note_id cannot be null';
  END IF;

  -- Get count directly from comments table
  SELECT COUNT(*) INTO v_count
  FROM comments
  WHERE sermon_note_id = p_sermon_note_id;
  
  RETURN COALESCE(v_count, 0);
END;
$$;

-- Function to handle comment changes
CREATE OR REPLACE FUNCTION handle_comment_count_change_v9()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_note_id UUID;
  v_new_count integer;
BEGIN
  -- Determine which sermon_note_id to use
  v_note_id := COALESCE(NEW.sermon_note_id, OLD.sermon_note_id);

  -- Get new count
  SELECT COUNT(*) INTO v_new_count
  FROM comments
  WHERE sermon_note_id = v_note_id;

  -- Notify clients about the change
  PERFORM pg_notify(
    'comment_changes',
    json_build_object(
      'sermon_note_id', v_note_id,
      'action', TG_OP,
      'count', v_new_count,
      'timestamp', extract(epoch from now())
    )::text
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS handle_comment_count_change_v9_trigger ON comments;

-- Create new trigger for comment count updates
CREATE TRIGGER handle_comment_count_change_v9_trigger
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION handle_comment_count_change_v9();

-- Create index for performance if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_comments_sermon_note_id_v9'
  ) THEN
    CREATE INDEX idx_comments_sermon_note_id_v9 
    ON comments(sermon_note_id);
  END IF;
END $$;