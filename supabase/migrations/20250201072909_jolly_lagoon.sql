-- Create church activity log table
CREATE TABLE IF NOT EXISTS church_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id uuid REFERENCES churches(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  content jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE church_activity_log ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Church admins can view their activity logs"
  ON church_activity_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM churches
      WHERE id = church_id
      AND admin_id = auth.uid()
    )
  );

-- Update get_church_dashboard_data function
CREATE OR REPLACE FUNCTION get_church_dashboard_data(
  p_church_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Verify user is church admin
  IF NOT EXISTS (
    SELECT 1 FROM churches
    WHERE id = p_church_id
    AND admin_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Build result
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
      ),
      'group_count', 0 -- Placeholder for future groups feature
    ),
    'recent_activity', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', id,
            'type', type,
            'timestamp', created_at,
            'data', content
          )
          ORDER BY created_at DESC
          LIMIT 5
        )
        FROM church_activity_log
        WHERE church_id = p_church_id
      ),
      '[]'::jsonb
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Function to log church activity
CREATE OR REPLACE FUNCTION log_church_activity(
  p_church_id UUID,
  p_type text,
  p_content jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO church_activity_log (
    church_id,
    type,
    content
  ) VALUES (
    p_church_id,
    p_type,
    p_content
  );
END;
$$;

-- Create trigger to log membership changes
CREATE OR REPLACE FUNCTION log_membership_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Log new membership request
    PERFORM log_church_activity(
      NEW.church_id,
      'new_member',
      jsonb_build_object(
        'user_id', NEW.user_id,
        'status', NEW.status,
        'message', format(
          'New member %s (%s)',
          (SELECT full_name FROM profiles WHERE id = NEW.user_id),
          CASE NEW.status
            WHEN 'pending' THEN 'requested to join'
            WHEN 'active' THEN 'joined'
            ELSE NEW.status
          END
        )
      )
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    -- Log membership status change
    PERFORM log_church_activity(
      NEW.church_id,
      'member_status',
      jsonb_build_object(
        'user_id', NEW.user_id,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'message', format(
          'Member %s status changed from %s to %s',
          (SELECT full_name FROM profiles WHERE id = NEW.user_id),
          OLD.status,
          NEW.status
        )
      )
    );
  ELSIF TG_OP = 'DELETE' THEN
    -- Log member leaving
    PERFORM log_church_activity(
      OLD.church_id,
      'member_left',
      jsonb_build_object(
        'user_id', OLD.user_id,
        'message', format(
          'Member %s left the church',
          (SELECT full_name FROM profiles WHERE id = OLD.user_id)
        )
      )
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for membership changes
DROP TRIGGER IF EXISTS log_membership_changes_trigger ON church_memberships;
CREATE TRIGGER log_membership_changes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON church_memberships
  FOR EACH ROW
  EXECUTE FUNCTION log_membership_changes();

-- Create trigger to log sermon note changes
CREATE OR REPLACE FUNCTION log_sermon_note_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.church_id IS NOT NULL THEN
    -- Log new sermon note
    PERFORM log_church_activity(
      NEW.church_id,
      'new_note',
      jsonb_build_object(
        'note_id', NEW.id,
        'author_id', NEW.author_id,
        'message', format(
          'New sermon note added: %s',
          NEW.title
        )
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for sermon note changes
DROP TRIGGER IF EXISTS log_sermon_note_changes_trigger ON sermon_notes;
CREATE TRIGGER log_sermon_note_changes_trigger
  AFTER INSERT ON sermon_notes
  FOR EACH ROW
  EXECUTE FUNCTION log_sermon_note_changes();