CREATE OR REPLACE FUNCTION check_data_consistency()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'orphaned_comments', (
      SELECT COUNT(*)
      FROM comments c
      LEFT JOIN sermon_notes sn ON c.sermon_note_id = sn.id
      WHERE sn.id IS NULL
    ),
    'orphaned_praises', (
      SELECT COUNT(*)
      FROM praises p
      LEFT JOIN sermon_notes sn ON p.sermon_note_id = sn.id
      WHERE sn.id IS NULL
    ),
    'invalid_memberships', (
      SELECT COUNT(*)
      FROM memberships m
      LEFT JOIN churches c ON m.church_id = c.id
      WHERE c.id IS NULL
    )
  ) INTO result;
  
  RETURN result;
END;
$$;