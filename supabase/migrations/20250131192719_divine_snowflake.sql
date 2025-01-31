-- Create function to delete comment with all related data
CREATE OR REPLACE FUNCTION delete_comment(
  p_comment_id UUID,
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify comment exists and belongs to user
  IF NOT EXISTS (
    SELECT 1 
    FROM comments 
    WHERE id = p_comment_id 
    AND author_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Comment not found or unauthorized';
  END IF;

  -- Delete comment (this will cascade to comment_praises)
  DELETE FROM comments 
  WHERE id = p_comment_id 
  AND author_id = p_user_id;
END;
$$;

-- Create function to toggle comment praise
CREATE OR REPLACE FUNCTION toggle_comment_praise(
  p_comment_id UUID,
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
  -- Check if praise exists
  SELECT EXISTS (
    SELECT 1 
    FROM comment_praises 
    WHERE comment_id = p_comment_id 
    AND user_id = p_user_id
  ) INTO v_exists;

  IF v_exists THEN
    -- Remove praise
    DELETE FROM comment_praises 
    WHERE comment_id = p_comment_id 
    AND user_id = p_user_id;
    v_action := 'removed';
  ELSE
    -- Add praise
    INSERT INTO comment_praises (comment_id, user_id)
    VALUES (p_comment_id, p_user_id);
    v_action := 'added';
  END IF;

  -- Get updated count
  SELECT COUNT(*) 
  FROM comment_praises 
  WHERE comment_id = p_comment_id 
  INTO v_count;

  RETURN json_build_object(
    'action', v_action,
    'praise_count', v_count
  );
END;
$$;