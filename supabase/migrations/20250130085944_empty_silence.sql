/*
  # Create storage bucket and policies
  
  1. New Storage
    - Create avatars bucket for profile photos
    - Create headers bucket for header images
  
  2. Security
    - Enable RLS on buckets
    - Add policies for authenticated users
*/

-- Create storage buckets if they don't exist
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('avatars', 'avatars', true),
  ('headers', 'headers', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create storage policies for headers
CREATE POLICY "Header images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'headers');

CREATE POLICY "Users can upload their own header"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'headers'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own header"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'headers'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own header"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'headers'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );