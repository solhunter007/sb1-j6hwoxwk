/*
  # Add Get Praise Count Function
  
  1. New Functions
    - `get_praise_count`: Gets the total praise count for a sermon note
  
  2. Security
    - Function is security definer to ensure consistent access
*/

CREATE OR REPLACE FUNCTION get_praise_count(
  p_note_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Get total praise count
  SELECT COUNT(*) 
  FROM praises 
  WHERE sermon_note_id = p_note_id 
  INTO v_count;

  -- Return result
  RETURN json_build_object(
    'praise_count', v_count
  );
END;
$$;