/*
  # Comment Counter Synchronization

  1. New Functions
    - get_comment_count_v7: Get comment count with caching and validation
    - handle_comment_count_change_v7: Handle comment count changes with notifications
    - validate_comment_count_v7: Validate and repair comment counts

  2. Security
    - All functions are SECURITY DEFINER
    - Input validation on all parameters
    - Error handling for edge cases

  3. Changes
    - Added validation and repair functionality
    - Improved error handling
    - Added detailed logging
*/

-- Function to get comment count with validation
CREATE OR REPLACE FUNCTION get_comment_count_v7(p_sermon_note_id UUID)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
  v_cached_count integer;
  v_actual_count integer;
BEGIN
  -- Input validation
  IF p_sermon_note_id IS NULL THEN
    RAISE EXCEPTION 'sermon_note_id cannot be null';
  END IF;

  -- Get count from cache first
  SELECT count INTO v_cached_count
  FROM comment_counts_v2
  WHERE sermon_note_id = p_sermon_note_id;

  -- Get actual count from comments table
  SELECT COUNT(*) INTO v_actual_count
  FROM comments
  WHERE sermon_note_id = p_sermon_note_id;

  -- If cache is missing or incorrect, update it
  IF v_cached_count IS NULL OR v_cached_count != v_actual_count THEN
    INSERT INTO comment_counts_v2 (sermon_note_id, count)
    VALUES (p_sermon_note_id, v_actual_count)
    ON CONFLICT (sermon_note_id) DO UPDATE
    SET 
      count = EXCLUDED.count,
      updated_at = now();
    
    v_count := v_actual_count;
  ELSE
    v_count := v_cached_count;
  END IF;

  -- Log the operation
  INSERT INTO system_logs (
    operation,
    details,
    metadata
  ) VALUES (
    'get_comment_count',
    format('Retrieved comment count for note %s', p_sermon_note_id),
    jsonb_build_object(
      'sermon_note_id', p_sermon_note_id,
      'count', v_count,
      'cached_count', v_cached_count,
      'actual_count', v_actual_count
    )
  );

  RETURN v_count;
END;
$$;

-- Function to handle comment count changes with validation
CREATE OR REPLACE FUNCTION handle_comment_count_change_v7()
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

  -- Update cache
  INSERT INTO comment_counts_v2 (sermon_note_id, count)
  VALUES (v_note_id, v_new_count)
  ON CONFLICT (sermon_note_id) DO UPDATE
  SET 
    count = v_new_count,
    updated_at = now();

  -- Notify clients
  PERFORM pg_notify(
    'comment_changes',
    json_build_object(
      'sermon_note_id', v_note_id,
      'action', TG_OP,
      'count', v_new_count,
      'timestamp', extract(epoch from now())
    )::text
  );

  -- Log the change
  INSERT INTO system_logs (
    operation,
    details,
    metadata
  ) VALUES (
    'comment_count_change',
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

-- Function to validate and repair comment counts
CREATE OR REPLACE FUNCTION validate_comment_count_v7(
  p_sermon_note_id UUID DEFAULT NULL
)
RETURNS TABLE (
  sermon_note_id UUID,
  cached_count integer,
  actual_count integer,
  was_repaired boolean
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
  ),
  repairs AS (
    SELECT 
      ac.sermon_note_id,
      cc.count as cached_count,
      ac.count as actual_count,
      COALESCE(cc.count, 0) != ac.count as needs_repair
    FROM actual_counts ac
    LEFT JOIN comment_counts_v2 cc ON cc.sermon_note_id = ac.sermon_note_id
  ),
  updates AS (
    INSERT INTO comment_counts_v2 (sermon_note_id, count)
    SELECT 
      r.sermon_note_id,
      r.actual_count
    FROM repairs r
    WHERE r.needs_repair
    ON CONFLICT (sermon_note_id) DO UPDATE
    SET 
      count = EXCLUDED.count,
      updated_at = now()
    RETURNING sermon_note_id
  )
  SELECT 
    r.sermon_note_id,
    r.cached_count,
    r.actual_count,
    u.sermon_note_id IS NOT NULL as was_repaired
  FROM repairs r
  LEFT JOIN updates u ON u.sermon_note_id = r.sermon_note_id;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS handle_comment_count_change_v7_trigger ON comments;

-- Create new trigger for comment count updates
CREATE TRIGGER handle_comment_count_change_v7_trigger
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION handle_comment_count_change_v7();

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_comments_sermon_note_id 
ON comments(sermon_note_id);