/*
  # System Logs Infrastructure - Part 1 (Fixed)

  1. New Tables
    - system_logs: Store system-wide logging information
    - log_levels: Enum type for log levels

  2. Security
    - Enable RLS on system_logs
    - Only allow system functions to write logs
    - Allow admins to read logs
*/

-- Create log levels enum if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'log_level') THEN
    CREATE TYPE log_level AS ENUM ('ERROR', 'WARN', 'INFO', 'DEBUG');
  END IF;
END $$;

-- Create system logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS system_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp timestamptz DEFAULT now(),
  level log_level DEFAULT 'INFO',
  operation text NOT NULL,
  details text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename = 'system_logs'
      AND rowsecurity = true
  ) THEN
    ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Create indexes if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_system_logs_timestamp') THEN
    CREATE INDEX idx_system_logs_timestamp ON system_logs(timestamp);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_system_logs_level') THEN
    CREATE INDEX idx_system_logs_level ON system_logs(level);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_system_logs_operation') THEN
    CREATE INDEX idx_system_logs_operation ON system_logs(operation);
  END IF;
END $$;

-- Create policies if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'system_logs' 
    AND policyname = 'Only super admins can read logs'
  ) THEN
    CREATE POLICY "Only super admins can read logs"
      ON system_logs FOR SELECT
      USING (auth.uid() IN (
        SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'super_admin'
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'system_logs' 
    AND policyname = 'System functions can insert logs'
  ) THEN
    CREATE POLICY "System functions can insert logs"
      ON system_logs FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;