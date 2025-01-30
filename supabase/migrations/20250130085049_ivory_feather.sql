/*
  # Add header image support
  
  1. Changes
    - Add header_url column to profiles table for storing header image URLs
  
  2. Notes
    - Maintains existing RLS policies
    - Allows null values for optional header images
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'header_url'
  ) THEN
    ALTER TABLE profiles ADD COLUMN header_url text;
  END IF;
END $$;