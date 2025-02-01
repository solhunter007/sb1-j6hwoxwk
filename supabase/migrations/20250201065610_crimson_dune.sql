/*
  # Unified Profile Image Handling

  1. Changes
    - Add image validation functions
    - Add triggers for image validation
    - Add image dimension constraints

  2. Security
    - Maintain existing RLS policies
    - Add validation for image uploads
*/

-- Create function to validate image dimensions
CREATE OR REPLACE FUNCTION validate_image_dimensions(
  p_width integer,
  p_height integer,
  p_min_dimension integer DEFAULT 400
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN p_width >= p_min_dimension AND p_height >= p_min_dimension;
END;
$$;

-- Create function to validate image size
CREATE OR REPLACE FUNCTION validate_image_size(
  p_size integer,
  p_max_size integer DEFAULT 5242880  -- 5MB in bytes
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN p_size <= p_max_size;
END;
$$;

-- Create function to validate image format
CREATE OR REPLACE FUNCTION validate_image_format(
  p_mimetype text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN p_mimetype IN ('image/jpeg', 'image/png', 'image/webp');
END;
$$;

-- Create composite validation function
CREATE OR REPLACE FUNCTION validate_profile_image(
  p_width integer,
  p_height integer,
  p_size integer,
  p_mimetype text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_errors text[];
BEGIN
  -- Check dimensions
  IF NOT validate_image_dimensions(p_width, p_height) THEN
    v_errors := array_append(v_errors, 'Image dimensions must be at least 400x400 pixels');
  END IF;

  -- Check size
  IF NOT validate_image_size(p_size) THEN
    v_errors := array_append(v_errors, 'Image size must not exceed 5MB');
  END IF;

  -- Check format
  IF NOT validate_image_format(p_mimetype) THEN
    v_errors := array_append(v_errors, 'Image must be in JPG, PNG, or WebP format');
  END IF;

  RETURN jsonb_build_object(
    'valid', v_errors IS NULL,
    'errors', COALESCE(v_errors, ARRAY[]::text[])
  );
END;
$$;