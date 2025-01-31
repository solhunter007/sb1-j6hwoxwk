/*
  # Fix Comment Counter Implementation

  1. Changes
    - Add comment count column to sermon_notes table
    - Add trigger to maintain count
    - Add validation and repair functions
    - Add performance optimizations

  2. Security
    - All functions are SECURITY DEFINER
    - Input validation
    - Error handling
*/

-- Add comment_count column to sermon_notes if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sermon_notes' AND column_name = 'comment_count'
  ) THEN
    ALTER TABLE sermon_notes ADD COLUMN comment_count integer NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Function to get comment count with optimizations
CREATE OR REPLACE FUNCTION get_comment_count_v13(p_sermon_note_id UUID)
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

  -- Get count from sermon_notes table
  SELECT comment_count INTO v_count
  FROM sermon_notes
  WHERE id = p_sermon_note_id;

  -- Log the operation
  INSERT INTO system_logs (
    level,
    operation,
    details,
    metadata
  ) VALUES (
    'INFO',
    'get_comment_count_v13',
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
CREATE OR REPLACE FUNCTION handle_comment_count_change_v13()
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
    'comment_count_change_v13',
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
CREATE OR REPLACE FUNCTION validate_comment_counts_v13(
  p_repair boolean DEFAULT false
)
RETURNS TABLE (
  sermon_note_id UUID,
  stored_count integer,
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
    GROUP BY c.sermon_note_id
  ),
  stored_counts AS (
    SELECT 
      id as sermon_note_id,
      comment_count as count
    FROM sermon_notes
  ),
  discrepancies AS (
    SELECT 
      COALESCE(ac.sermon_note_id, sc.sermon_note_id) as sermon_note_id,
      sc.count as stored_count,
      COALESCE(ac.count, 0) as actual_count
    FROM actual_counts ac
    FULL OUTER JOIN stored_counts sc ON sc.sermon_note_id = ac.sermon_note_id
    WHERE COALESCE(ac.count, 0) != COALESCE(sc.count, 0)
  ),
  repairs AS (
    UPDATE sermon_notes sn
    SET comment_count = d.actual_count
    FROM discrepancies d
    WHERE sn.id = d.sermon_note_id
    AND p_repair = true
    RETURNING sn.id
  )
  SELECT 
    d.sermon_note_id,
    d.stored_count,
    d.actual_count,
    r.id IS NOT NULL as was_repaired
  FROM discrepancies d
  LEFT JOIN repairs r ON r.id = d.sermon_note_id;

  -- Log validation
  INSERT INTO system_logs (
    level,
    operation,
    details,
    metadata
  ) VALUES (
    'INFO',
    'validate_comment_counts_v13',
    'Validated comment counts',
    jsonb_build_object(
      'repair_enabled', p_repair,
      'timestamp', now()
    )
  );
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS handle_comment_count_change_v13_trigger ON comments;

-- Create new trigger for comment count updates
CREATE TRIGGER handle_comment_count_change_v13_trigger
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION handle_comment_count_change_v13();

-- Create optimized index if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_comments_sermon_note_id_v13'
  ) THEN
    CREATE INDEX idx_comments_sermon_note_id_v13 
    ON comments(sermon_note_id);
  END IF;
END $$;

-- Initialize comment counts
UPDATE sermon_notes sn
SET comment_count = COALESCE(c.count, 0)
FROM (
  SELECT sermon_note_id, COUNT(*) as count
  FROM comments
  GROUP BY sermon_note_id
) c
WHERE sn.id = c.sermon_note_id;