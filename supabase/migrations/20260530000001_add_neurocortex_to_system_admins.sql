-- Migration: Add neurocortexpro@gmail.com and other development emails to system admins
-- Description: Updates public.is_platform_admin() function to authorize all development emails and updates auth.users user_metadata.

-- 1. Actualizar la función is_platform_admin para incluir todos los correos del desarrollador
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
  -- Obtener el email desde el JWT
  v_jwt_email := auth.jwt() ->> 'email';
  
  -- Verificar administradores del sistema por correo hardcodeado (seguridad absoluta)
  IF v_jwt_email = 'admin@admin.com' 
     OR v_jwt_email = 'admin@obsidiana.com' 
     OR v_jwt_email = 'dary775@gmail.com'
     OR v_jwt_email = 'neurocortexpro@gmail.com'
     OR v_jwt_email = 'civec26@gmail.com'
     OR v_jwt_email = 'obsidianapro2026@gmail.com'
  THEN
    RETURN TRUE;
  END IF;
  
  -- Verificar metadatos del usuario por el flag de admin
  IF coalesce((auth.jwt() -> 'user_metadata' ->> 'is_platform_admin')::boolean, false) = true THEN
    RETURN TRUE;
  END IF;

  -- Verificar si el tenant es administrador de la plataforma
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

-- 2. Sincronizar metadatos de usuario (is_platform_admin = true) para asegurar que el JWT contenga el flag
UPDATE auth.users
SET raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"is_platform_admin": true}'::jsonb
WHERE email IN (
  'dary775@gmail.com',
  'neurocortexpro@gmail.com',
  'civec26@gmail.com',
  'obsidianapro2026@gmail.com'
);
