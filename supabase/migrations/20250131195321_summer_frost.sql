-- Create comment counts cache table
CREATE TABLE IF NOT EXISTS comment_counts (
  sermon_note_id uuid PRIMARY KEY REFERENCES sermon_notes(id) ON DELETE CASCADE,
  count integer NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE comment_counts ENABLE ROW LEVEL SECURITY;

-- Create policy for reading comment counts if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'comment_counts' 
    AND policyname = 'Anyone can read comment counts'
  ) THEN
    CREATE POLICY "Anyone can read comment counts"
      ON comment_counts FOR SELECT
      USING (true);
  END IF;
END $$;

-- Function to get comment count
CREATE OR REPLACE FUNCTION get_comment_count(p_sermon_note_id UUID)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  -- First try to get from cache
  SELECT count INTO v_count
  FROM comment_counts
  WHERE sermon_note_id = p_sermon_note_id;
  
  -- If not in cache, calculate and cache
  IF v_count IS NULL THEN
    SELECT COUNT(*) INTO v_count
    FROM comments
    WHERE sermon_note_id = p_sermon_note_id;
    
    INSERT INTO comment_counts (sermon_note_id, count)
    VALUES (p_sermon_note_id, v_count)
    ON CONFLICT (sermon_note_id) DO UPDATE
    SET count = v_count, updated_at = now();
  END IF;
  
  RETURN v_count;
END;
$$;

-- Function to update comment count
CREATE OR REPLACE FUNCTION update_comment_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  -- Calculate new count
  SELECT COUNT(*) INTO v_count
  FROM comments
  WHERE sermon_note_id = COALESCE(NEW.sermon_note_id, OLD.sermon_note_id);
  
  -- Update cache
  INSERT INTO comment_counts (sermon_note_id, count)
  VALUES (COALESCE(NEW.sermon_note_id, OLD.sermon_note_id), v_count)
  ON CONFLICT (sermon_note_id) DO UPDATE
  SET count = v_count, updated_at = now();
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_comment_count_on_insert ON comments;
DROP TRIGGER IF EXISTS update_comment_count_on_delete ON comments;

-- Create triggers for comment count updates
CREATE TRIGGER update_comment_count_on_insert
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_count();

CREATE TRIGGER update_comment_count_on_delete
  AFTER DELETE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_count();

-- Function to sync all comment counts
CREATE OR REPLACE FUNCTION sync_comment_counts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO comment_counts (sermon_note_id, count)
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
SELECT sync_comment_counts();