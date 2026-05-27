-- Migration to add dary775@gmail.com to the hardcoded system administrators list

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin boolean;
  v_jwt_email text;
  v_tenant_id uuid;
BEGIN
  -- Get the email from the JWT
  v_jwt_email := auth.jwt() ->> 'email';
  
  -- Check for hardcoded system administrators
  IF v_jwt_email = 'admin@admin.com' OR v_jwt_email = 'admin@obsidiana.com' OR v_jwt_email = 'dary775@gmail.com' THEN
    RETURN TRUE;
  END IF;
  
  -- Check user metadata for platform admin flag
  IF coalesce((auth.jwt() -> 'user_metadata' ->> 'is_platform_admin')::boolean, false) = true THEN
    RETURN TRUE;
  END IF;

  -- Check if the tenant itself is a platform admin tenant
  v_tenant_id := public.current_tenant_id();
  IF v_tenant_id IS NOT NULL THEN
    SELECT coalesce(is_platform_admin, false) INTO v_is_admin
    FROM tenants
    WHERE id = v_tenant_id;
    RETURN coalesce(v_is_admin, false);
  END IF;

  RETURN FALSE;
END;
$$;
