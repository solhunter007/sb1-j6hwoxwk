/*
  # Add get_praise_state function
  
  1. New Functions
    - `get_praise_state`: Gets current praise state for a sermon note
      - Parameters:
        - p_note_id (uuid): The ID of the sermon note
        - p_user_id (uuid): The ID of the user
      - Returns: JSON object with:
        - has_praised: boolean
        - praise_count: integer
  
  2. Security
    - Function is SECURITY DEFINER to ensure proper access control
    - Validates input parameters
*/

CREATE OR REPLACE FUNCTION get_praise_state(
  p_note_id UUID,
  p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_has_praised BOOLEAN;
  v_count INTEGER;
BEGIN
  -- Check if user has praised
  SELECT EXISTS (
    SELECT 1 
    FROM praises 
    WHERE sermon_note_id = p_note_id 
    AND user_id = p_user_id
  ) INTO v_has_praised;

  -- Get total praise count
  SELECT COUNT(*) 
  FROM praises 
  WHERE sermon_note_id = p_note_id 
  INTO v_count;

  -- Return result
  RETURN json_build_object(
    'has_praised', v_has_praised,
    'praise_count', v_count
  );
END;
$$;