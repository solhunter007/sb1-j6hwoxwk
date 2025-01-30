/*
  # Initial Schema for Sermon Buddy

  1. New Tables
    - `profiles`
      - Stores user profile information
      - Links to Supabase auth.users
    - `churches`
      - Stores church organization profiles
    - `memberships`
      - Links users to churches they're members of
    - `sermon_notes`
      - Stores sermon notes with rich text content
    - `comments`
      - Stores comments on sermon notes
    - `praises`
      - Tracks praise (likes) on sermon notes
    - `notifications`
      - Stores user notifications
    
  2. Security
    - RLS enabled on all tables
    - Policies for authenticated users
    - Special policies for church admins
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  username text UNIQUE NOT NULL,
  full_name text,
  avatar_url text,
  bio text,
  is_church_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Churches table
CREATE TABLE churches (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  logo_url text,
  website text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  admin_id uuid REFERENCES profiles(id) NOT NULL
);

-- Memberships table
CREATE TABLE memberships (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES profiles(id) NOT NULL,
  church_id uuid REFERENCES churches(id) NOT NULL,
  status text CHECK (status IN ('pending', 'active', 'rejected')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, church_id)
);

-- Sermon Notes table
CREATE TABLE sermon_notes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id uuid REFERENCES profiles(id) NOT NULL,
  church_id uuid REFERENCES churches(id),
  title text NOT NULL,
  content jsonb NOT NULL,
  tags text[] DEFAULT '{}',
  visibility text CHECK (visibility IN ('public', 'private', 'church')) DEFAULT 'public',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Comments table
CREATE TABLE comments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  sermon_note_id uuid REFERENCES sermon_notes(id) ON DELETE CASCADE NOT NULL,
  author_id uuid REFERENCES profiles(id) NOT NULL,
  parent_id uuid REFERENCES comments(id),
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Praises table
CREATE TABLE praises (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  sermon_note_id uuid REFERENCES sermon_notes(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(sermon_note_id, user_id)
);

-- Notifications table
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES profiles(id) NOT NULL,
  type text NOT NULL,
  content jsonb NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE churches ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE sermon_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE praises ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Churches Policies
CREATE POLICY "Churches are viewable by everyone"
  ON churches FOR SELECT
  USING (true);

CREATE POLICY "Church admins can update their churches"
  ON churches FOR UPDATE
  USING (auth.uid() = admin_id);

-- Memberships Policies
CREATE POLICY "Users can view their memberships"
  ON memberships FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM churches WHERE id = church_id AND admin_id = auth.uid()
  ));

CREATE POLICY "Users can request membership"
  ON memberships FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Sermon Notes Policies
CREATE POLICY "Users can view public and their own sermon notes"
  ON sermon_notes FOR SELECT
  USING (
    visibility = 'public' OR
    author_id = auth.uid() OR
    (visibility = 'church' AND EXISTS (
      SELECT 1 FROM memberships
      WHERE user_id = auth.uid()
      AND church_id = sermon_notes.church_id
      AND status = 'active'
    ))
  );

CREATE POLICY "Users can create sermon notes"
  ON sermon_notes FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update own sermon notes"
  ON sermon_notes FOR UPDATE
  USING (auth.uid() = author_id);

-- Comments Policies
CREATE POLICY "Users can view comments on viewable sermon notes"
  ON comments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM sermon_notes
    WHERE id = sermon_note_id
    AND (
      visibility = 'public' OR
      author_id = auth.uid() OR
      (visibility = 'church' AND EXISTS (
        SELECT 1 FROM memberships
        WHERE user_id = auth.uid()
        AND church_id = sermon_notes.church_id
        AND status = 'active'
      ))
    )
  ));

CREATE POLICY "Users can create comments"
  ON comments FOR INSERT
  WITH CHECK (auth.uid() = author_id);

-- Praises Policies
CREATE POLICY "Users can view praises"
  ON praises FOR SELECT
  USING (true);

CREATE POLICY "Users can praise sermon notes"
  ON praises FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Notifications Policies
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Functions
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();