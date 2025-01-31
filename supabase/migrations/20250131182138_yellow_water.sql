/*
  # Create Backup System
  
  1. New Tables
    - `system_backups`
      - `id` (uuid, primary key)
      - `created_at` (timestamptz)
      - `name` (text)
      - `description` (text)
      - `metadata` (jsonb)
      - `backup_data` (jsonb)
  
  2. New Functions
    - `create_system_backup`: Creates a full system backup
    - `restore_from_backup`: Restores system from a backup
  
  3. Security
    - Enable RLS on backup table
    - Only allow admin access
*/

-- Create backup table
CREATE TABLE IF NOT EXISTS system_backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  name text NOT NULL,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  backup_data jsonb NOT NULL
);

-- Enable RLS
ALTER TABLE system_backups ENABLE ROW LEVEL SECURITY;

-- Create backup function
CREATE OR REPLACE FUNCTION create_system_backup(
  p_name text,
  p_description text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_backup_id uuid;
  v_backup_data jsonb;
BEGIN
  -- Collect data from all relevant tables
  WITH backup_data AS (
    SELECT 
      jsonb_build_object(
        'profiles', (SELECT jsonb_agg(row_to_json(p)) FROM profiles p),
        'sermon_notes', (SELECT jsonb_agg(row_to_json(s)) FROM sermon_notes s),
        'comments', (SELECT jsonb_agg(row_to_json(c)) FROM comments c),
        'praises', (SELECT jsonb_agg(row_to_json(pr)) FROM praises pr),
        'churches', (SELECT jsonb_agg(row_to_json(ch)) FROM churches ch),
        'memberships', (SELECT jsonb_agg(row_to_json(m)) FROM memberships m),
        'notifications', (SELECT jsonb_agg(row_to_json(n)) FROM notifications n)
      ) as data
  )
  SELECT data INTO v_backup_data FROM backup_data;

  -- Create backup record
  INSERT INTO system_backups (name, description, backup_data, metadata)
  VALUES (
    p_name,
    p_description,
    v_backup_data,
    jsonb_build_object(
      'version', '1.0',
      'timestamp', extract(epoch from now()),
      'tables_included', array[
        'profiles',
        'sermon_notes',
        'comments',
        'praises',
        'churches',
        'memberships',
        'notifications'
      ]
    )
  )
  RETURNING id INTO v_backup_id;

  RETURN v_backup_id;
END;
$$;

-- Create restore function
CREATE OR REPLACE FUNCTION restore_from_backup(
  p_backup_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_backup_data jsonb;
BEGIN
  -- Get backup data
  SELECT backup_data INTO v_backup_data
  FROM system_backups
  WHERE id = p_backup_id;

  IF v_backup_data IS NULL THEN
    RAISE EXCEPTION 'Backup not found';
  END IF;

  -- Start transaction
  BEGIN
    -- Clear existing data
    TRUNCATE TABLE notifications CASCADE;
    TRUNCATE TABLE memberships CASCADE;
    TRUNCATE TABLE praises CASCADE;
    TRUNCATE TABLE comments CASCADE;
    TRUNCATE TABLE sermon_notes CASCADE;
    TRUNCATE TABLE churches CASCADE;
    TRUNCATE TABLE profiles CASCADE;

    -- Restore profiles
    INSERT INTO profiles
    SELECT * FROM jsonb_populate_recordset(null::profiles, v_backup_data->'profiles');

    -- Restore churches
    INSERT INTO churches
    SELECT * FROM jsonb_populate_recordset(null::churches, v_backup_data->'churches');

    -- Restore sermon notes
    INSERT INTO sermon_notes
    SELECT * FROM jsonb_populate_recordset(null::sermon_notes, v_backup_data->'sermon_notes');

    -- Restore comments
    INSERT INTO comments
    SELECT * FROM jsonb_populate_recordset(null::comments, v_backup_data->'comments');

    -- Restore praises
    INSERT INTO praises
    SELECT * FROM jsonb_populate_recordset(null::praises, v_backup_data->'praises');

    -- Restore memberships
    INSERT INTO memberships
    SELECT * FROM jsonb_populate_recordset(null::memberships, v_backup_data->'memberships');

    -- Restore notifications
    INSERT INTO notifications
    SELECT * FROM jsonb_populate_recordset(null::notifications, v_backup_data->'notifications');

    RETURN true;
  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback on error
      RAISE;
  END;
END;
$$;

-- Create policies
CREATE POLICY "Only super admins can view backups"
  ON system_backups FOR SELECT
  USING (auth.uid() IN (
    SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'super_admin'
  ));

CREATE POLICY "Only super admins can create backups"
  ON system_backups FOR INSERT
  WITH CHECK (auth.uid() IN (
    SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'super_admin'
  ));

-- Create backup view for monitoring
CREATE VIEW backup_history AS
SELECT 
  id,
  name,
  description,
  created_at,
  metadata->>'version' as version,
  (metadata->>'tables_included')::text[] as tables_included
FROM system_backups
ORDER BY created_at DESC;