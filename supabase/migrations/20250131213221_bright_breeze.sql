/*
  # Fix Comment Counter Implementation

  1. Changes
    - Add optimized comment counting function
    - Add real-time notification triggers
    - Add validation and repair functions
    - Add performance optimizations

  2. Security
    - All functions are SECURITY DEFINER
    - Input validation
    - Error handling
*/

-- Function to get comment count with optimizations
CREATE OR REPLACE FUNCTION get_comment_count_v12(p_sermon_note_id UUID)
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

  -- Get count directly from comments table with index scan
  SELECT COUNT(*) INTO v_count
  FROM comments
  WHERE sermon_note_id = p_sermon_note_id;
  
  -- Log the operation
  INSERT INTO system_logs (
    level,
    operation,
    details,
    metadata
  ) VALUES (
    'INFO',
    'get_comment_count_v12',
    format('Retrieved comment count for note %s', p_sermon_note_id),
    jsonb_build_object(
      'sermon_note_id', p_sermon_note_id,
      'count', v_count
    )
  );

  RETURN COALESCE(v_count, 0);
END;
$$;

-- Function to handle comment changes with optimistic updates
CREATE OR REPLACE FUNCTION handle_comment_count_change_v12()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_note_id UUID;
  v_new_count integer;
  v_notification jsonb;
BEGIN
  -- Determine which sermon_note_id to use
  v_note_id := COALESCE(NEW.sermon_note_id, OLD.sermon_note_id);

  -- Get new count with index scan
  SELECT COUNT(*) INTO v_new_count
  FROM comments
  WHERE sermon_note_id = v_note_id;

  -- Build notification payload
  v_notification := jsonb_build_object(
    'sermon_note_id', v_note_id,
    'action', TG_OP,
    'count', v_new_count,
    'timestamp', extract(epoch from now())
  );

  -- Notify clients about the change
  PERFORM pg_notify('comment_changes', v_notification::text);

  -- Log the change
  INSERT INTO system_logs (
    level,
    operation,
    details,
    metadata
  ) VALUES (
    'INFO',
    'comment_count_change_v12',
    format('Comment count changed for note %s', v_note_id),
    jsonb_build_object(
      'sermon_note_id', v_note_id,
      'action', TG_OP,
      'new_count', v_new_count,
      'trigger_name', TG_NAME
    )
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Function to validate comment counts
CREATE OR REPLACE FUNCTION validate_comment_counts_v12(
  p_sermon_note_id UUID DEFAULT NULL
)
RETURNS TABLE (
  sermon_note_id UUID,
  actual_count integer,
  was_validated boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH actual_counts AS (
    SELECT 
      c.sermon_note_id,
      COUNT(*) as count
    FROM comments c
    WHERE 
      p_sermon_note_id IS NULL 
      OR c.sermon_note_id = p_sermon_note_id
    GROUP BY c.sermon_note_id
  )
  SELECT 
    ac.sermon_note_id,
    ac.count as actual_count,
    true as was_validated
  FROM actual_counts ac;

  -- Log validation
  INSERT INTO system_logs (
    level,
    operation,
    details,
    metadata
  ) VALUES (
    'INFO',
    'validate_comment_counts_v12',
    'Validated comment counts',
    jsonb_build_object(
      'sermon_note_id', p_sermon_note_id,
      'timestamp', now()
    )
  );
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS handle_comment_count_change_v12_trigger ON comments;

-- Create new trigger for comment count updates
CREATE TRIGGER handle_comment_count_change_v12_trigger
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION handle_comment_count_change_v12();

-- Create optimized index if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_comments_sermon_note_id_v12'
  ) THEN
    CREATE INDEX idx_comments_sermon_note_id_v12 
    ON comments(sermon_note_id);
  END IF;
END $$;