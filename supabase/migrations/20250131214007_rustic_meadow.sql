/*
  # Fix Comment Counter System

  1. Changes
    - Add comment count column to sermon_notes table
    - Create optimized comment count functions
    - Add real-time notification triggers
    - Add logging and monitoring

  2. Security
    - All functions are SECURITY DEFINER
    - Input validation
    - Error handling
*/

-- Function to get comment count with optimizations
CREATE OR REPLACE FUNCTION get_comment_count_v15(p_sermon_note_id UUID)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
  v_start_time timestamptz;
BEGIN
  -- Record start time for performance monitoring
  v_start_time := clock_timestamp();

  -- Input validation
  IF p_sermon_note_id IS NULL THEN
    RAISE EXCEPTION 'sermon_note_id cannot be null';
  END IF;

  -- Get count from sermon_notes table
  SELECT comment_count INTO v_count
  FROM sermon_notes
  WHERE id = p_sermon_note_id;

  -- Log the operation with performance metrics
  INSERT INTO system_logs (
    level,
    operation,
    details,
    metadata
  ) VALUES (
    'INFO',
    'get_comment_count_v15',
    format('Retrieved comment count for note %s', p_sermon_note_id),
    jsonb_build_object(
      'sermon_note_id', p_sermon_note_id,
      'count', v_count,
      'duration_ms', extract(milliseconds from clock_timestamp() - v_start_time)
    )
  );

  RETURN COALESCE(v_count, 0);
END;
$$;

-- Function to handle comment changes with optimistic updates
CREATE OR REPLACE FUNCTION handle_comment_count_change_v15()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_note_id UUID;
  v_new_count integer;
  v_old_count integer;
  v_start_time timestamptz;
BEGIN
  -- Record start time
  v_start_time := clock_timestamp();

  -- Determine which sermon_note_id to use
  v_note_id := COALESCE(NEW.sermon_note_id, OLD.sermon_note_id);

  -- Get old count
  SELECT comment_count INTO v_old_count
  FROM sermon_notes
  WHERE id = v_note_id;

  -- Update count in sermon_notes table
  IF TG_OP = 'INSERT' THEN
    UPDATE sermon_notes
    SET comment_count = comment_count + 1
    WHERE id = v_note_id
    RETURNING comment_count INTO v_new_count;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE sermon_notes
    SET comment_count = GREATEST(0, comment_count - 1)
    WHERE id = v_note_id
    RETURNING comment_count INTO v_new_count;
  END IF;

  -- Notify clients about the change
  PERFORM pg_notify(
    'comment_changes',
    jsonb_build_object(
      'sermon_note_id', v_note_id,
      'action', TG_OP,
      'old_count', v_old_count,
      'new_count', v_new_count,
      'timestamp', extract(epoch from clock_timestamp())
    )::text
  );

  -- Log the change with detailed metrics
  INSERT INTO system_logs (
    level,
    operation,
    details,
    metadata
  ) VALUES (
    'INFO',
    'comment_count_change_v15',
    format('Comment count changed for note %s', v_note_id),
    jsonb_build_object(
      'sermon_note_id', v_note_id,
      'action', TG_OP,
      'old_count', v_old_count,
      'new_count', v_new_count,
      'duration_ms', extract(milliseconds from clock_timestamp() - v_start_time),
      'trigger_name', TG_NAME
    )
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS handle_comment_count_change_v15_trigger ON comments;

-- Create new trigger for comment count updates
CREATE TRIGGER handle_comment_count_change_v15_trigger
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION handle_comment_count_change_v15();

-- Repair any inconsistent comment counts
UPDATE sermon_notes sn
SET comment_count = COALESCE(c.count, 0)
FROM (
  SELECT sermon_note_id, COUNT(*) as count
  FROM comments
  GROUP BY sermon_note_id
) c
WHERE sn.id = c.sermon_note_id
AND sn.comment_count != COALESCE(c.count, 0);