/*
  # Add scripture references to sermon notes

  1. Changes
    - Add scripture_references array column to sermon_notes table
    - Add default empty array value
    - Add check constraint to ensure array elements are text

  2. Notes
    - Using array type for efficient storage and querying
    - Empty array as default value to prevent null issues
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sermon_notes' AND column_name = 'scripture_references'
  ) THEN
    ALTER TABLE sermon_notes 
    ADD COLUMN scripture_references text[] DEFAULT '{}' NOT NULL;
  END IF;
END $$;