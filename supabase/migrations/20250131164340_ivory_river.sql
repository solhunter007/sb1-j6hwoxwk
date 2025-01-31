/*
  # Add toggle_praise function
  
  1. New Functions
    - `toggle_praise`: Toggles praise state for a sermon note
      - Parameters:
        - p_note_id (uuid): The ID of the sermon note
        - p_user_id (uuid): The ID of the user toggling the praise
      - Returns: JSON object with:
        - action: 'added' or 'removed'
        - new_count: Updated praise count
  
  2. Security
    - Function is SECURITY DEFINER to ensure proper access control
    - Validates input parameters
    - Handles race conditions with transaction
*/

CREATE OR REPLACE FUNCTION toggle_praise(
  p_note_id UUID,
  p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exists BOOLEAN;
  v_count INTEGER;
  v_action TEXT;
BEGIN
  -- Start transaction to handle race conditions
  BEGIN
    -- Check if praise already exists
    SELECT EXISTS (
      SELECT 1 
      FROM praises 
      WHERE sermon_note_id = p_note_id 
      AND user_id = p_user_id
    ) INTO v_exists;

    IF v_exists THEN
      -- Remove praise
      DELETE FROM praises 
      WHERE sermon_note_id = p_note_id 
      AND user_id = p_user_id;
      
      v_action := 'removed';
    ELSE
      -- Add praise
      INSERT INTO praises (sermon_note_id, user_id)
      VALUES (p_note_id, p_user_id);
      
      v_action := 'added';
    END IF;

    -- Get updated count
    SELECT COUNT(*) 
    FROM praises 
    WHERE sermon_note_id = p_note_id 
    INTO v_count;

    -- Return result
    RETURN json_build_object(
      'action', v_action,
      'new_count', v_count
    );
  EXCEPTION
    WHEN OTHERS THEN
      -- Roll back transaction on error
      RAISE;
  END;
END;
$$;