/*
  # Fix Comment Counter Functionality

  1. Changes
    - Add comment count cache table
    - Add functions for managing comment counts
    - Add triggers for automatic count updates
    - Add RLS policies for secure access

  2. Security
    - Enable RLS on comment_counts table
    - Add policy for reading comment counts
    - All functions are SECURITY DEFINER for proper access control

  3. Notes
    - Uses caching for better performance
    - Handles race conditions with transactions
    - Maintains data consistency with triggers
*/

-- Create comment counts cache table if it doesn't exist
CREATE TABLE IF NOT EXISTS comment_counts_v2 (
  sermon_note_id uuid PRIMARY KEY REFERENCES sermon_notes(id) ON DELETE CASCADE,
  count integer NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE comment_counts_v2 ENABLE ROW LEVEL SECURITY;

-- Create policy for reading comment counts
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'comment_counts_v2' 
    AND policyname = 'Anyone can read comment counts v2'
  ) THEN
    CREATE POLICY "Anyone can read comment counts v2"
      ON comment_counts_v2 FOR SELECT
      USING (true);
  END IF;
END $$;

-- Function to get comment count with caching
CREATE OR REPLACE FUNCTION get_comment_count_v2(p_sermon_note_id UUID)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  -- First try to get from cache
  SELECT count INTO v_count
  FROM comment_counts_v2
  WHERE sermon_note_id = p_sermon_note_id;
  
  -- If not in cache, calculate and cache
  IF v_count IS NULL THEN
    SELECT COUNT(*) INTO v_count
    FROM comments
    WHERE sermon_note_id = p_sermon_note_id;
    
    INSERT INTO comment_counts_v2 (sermon_note_id, count)
    VALUES (p_sermon_note_id, v_count)
    ON CONFLICT (sermon_note_id) DO UPDATE
    SET count = v_count, updated_at = now();
  END IF;
  
  RETURN v_count;
END;
$$;

-- Function to increment comment count
CREATE OR REPLACE FUNCTION increment_comment_count_v2(p_sermon_note_id UUID)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_count integer;
BEGIN
  INSERT INTO comment_counts_v2 (sermon_note_id, count)
  VALUES (p_sermon_note_id, 1)
  ON CONFLICT (sermon_note_id) DO UPDATE
  SET 
    count = comment_counts_v2.count + 1,
    updated_at = now()
  RETURNING count INTO v_new_count;
  
  RETURN v_new_count;
END;
$$;

-- Function to decrement comment count
CREATE OR REPLACE FUNCTION decrement_comment_count_v2(p_sermon_note_id UUID)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_count integer;
BEGIN
  UPDATE comment_counts_v2
  SET 
    count = GREATEST(0, count - 1),
    updated_at = now()
  WHERE sermon_note_id = p_sermon_note_id
  RETURNING count INTO v_new_count;
  
  RETURN COALESCE(v_new_count, 0);
END;
$$;

-- Function to handle comment changes
CREATE OR REPLACE FUNCTION handle_comment_count_change_v2()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM increment_comment_count_v2(NEW.sermon_note_id);
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM decrement_comment_count_v2(OLD.sermon_note_id);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS handle_comment_count_change_v2_trigger ON comments;

-- Create new trigger for comment count updates
CREATE TRIGGER handle_comment_count_change_v2_trigger
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION handle_comment_count_change_v2();

-- Function to sync all comment counts
CREATE OR REPLACE FUNCTION sync_comment_counts_v2()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO comment_counts_v2 (sermon_note_id, count)
  SELECT 
    sermon_note_id,
    COUNT(*) as count
  FROM comments
  GROUP BY sermon_note_id
  ON CONFLICT (sermon_note_id) DO UPDATE
  SET 
    count = EXCLUDED.count,
    updated_at = now();
END;
$$;

-- Initial sync of comment counts
SELECT sync_comment_counts_v2();