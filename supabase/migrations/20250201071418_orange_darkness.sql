-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Churches are viewable by everyone" ON churches;
DROP POLICY IF EXISTS "Church admins can update their churches" ON churches;

-- Create comprehensive church policies
CREATE POLICY "Anyone can view churches"
  ON churches FOR SELECT
  USING (true);

CREATE POLICY "Church users can create their own church"
  ON churches FOR INSERT
  WITH CHECK (
    auth.uid() = admin_id AND
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'user_type' = 'church'
    )
  );

CREATE POLICY "Church admins can update their churches"
  ON churches FOR UPDATE
  USING (auth.uid() = admin_id)
  WITH CHECK (auth.uid() = admin_id);

CREATE POLICY "Church admins can delete their churches"
  ON churches FOR DELETE
  USING (auth.uid() = admin_id);

-- Create function to initialize church
CREATE OR REPLACE FUNCTION initialize_church(
  p_name text,
  p_city text DEFAULT NULL,
  p_state text DEFAULT NULL,
  p_zip_code text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_church_id uuid;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  -- Verify user is church type
  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = v_user_id
    AND raw_user_meta_data->>'user_type' = 'church'
  ) THEN
    RAISE EXCEPTION 'Only church accounts can create churches';
  END IF;

  -- Check if church already exists
  SELECT id INTO v_church_id
  FROM churches
  WHERE admin_id = v_user_id;

  IF v_church_id IS NOT NULL THEN
    RETURN v_church_id;
  END IF;

  -- Create new church
  INSERT INTO churches (
    admin_id,
    name,
    city,
    state,
    zip_code
  ) VALUES (
    v_user_id,
    p_name,
    p_city,
    p_state,
    p_zip_code
  )
  RETURNING id INTO v_church_id;

  RETURN v_church_id;
END;
$$;

-- Create function to get church dashboard data
CREATE OR REPLACE FUNCTION get_church_dashboard_data(
  p_church_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_recent_activity jsonb;
BEGIN
  -- Verify user is church admin
  IF NOT EXISTS (
    SELECT 1 FROM churches
    WHERE id = p_church_id
    AND admin_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Get recent activity
  WITH recent_activity AS (
    SELECT 
      id,
      type,
      created_at,
      content
    FROM church_activity_log
    WHERE church_id = p_church_id
    ORDER BY created_at DESC
    LIMIT 5
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'type', type,
      'timestamp', created_at,
      'data', content
    )
  ) INTO v_recent_activity
  FROM recent_activity;

  -- Build complete result
  SELECT jsonb_build_object(
    'stats', jsonb_build_object(
      'member_count', (
        SELECT COUNT(*)
        FROM church_memberships
        WHERE church_id = p_church_id
        AND status = 'active'
      ),
      'sermon_note_count', (
        SELECT COUNT(*)
        FROM sermon_notes
        WHERE church_id = p_church_id
      ),
      'pending_requests', (
        SELECT COUNT(*)
        FROM church_memberships
        WHERE church_id = p_church_id
        AND status = 'pending'
      )
    ),
    'recent_activity', COALESCE(v_recent_activity, '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;