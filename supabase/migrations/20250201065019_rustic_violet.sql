/*
  # Add Church Location Fields

  1. Changes
    - Add city, state, and zip_code columns to churches table
    - Update existing queries to use new location fields

  2. Security
    - Maintain existing RLS policies
*/

-- Add location fields to churches table
ALTER TABLE churches
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS state text,
ADD COLUMN IF NOT EXISTS zip_code text;

-- Update church membership query function
CREATE OR REPLACE FUNCTION get_church_membership(
  p_user_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT 
    jsonb_build_object(
      'church_id', c.id,
      'church_name', c.name,
      'location', CONCAT(c.city, ', ', c.state),
      'status', cm.status
    ) INTO v_result
  FROM church_memberships cm
  JOIN churches c ON c.id = cm.church_id
  WHERE cm.user_id = p_user_id
  AND cm.status = 'active'
  LIMIT 1;

  RETURN v_result;
END;
$$;