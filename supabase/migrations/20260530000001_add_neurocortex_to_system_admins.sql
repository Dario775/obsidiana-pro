-- Migration: Restrict platform admin strictly to dary775@gmail.com
-- Description: Updates public.is_platform_admin() to strictly authorize only dary775@gmail.com and removes platform admin flag from all other users.

-- 1. Actualizar la función is_platform_admin para permitir ÚNICAMENTE a dary775@gmail.com
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_jwt_email text;
BEGIN
  -- Obtener el email desde el JWT
  v_jwt_email := auth.jwt() ->> 'email';
  
  -- Solo permitir acceso super admin si el email del JWT coincide exactamente
  IF v_jwt_email = 'dary775@gmail.com' THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- 2. Eliminar el flag is_platform_admin de los metadatos de todos los usuarios, excepto dary775@gmail.com
-- Esto asegura la integridad absoluta en la base de datos para siempre.
UPDATE auth.users
SET raw_user_meta_data = (raw_user_meta_data - 'is_platform_admin')
WHERE email <> 'dary775@gmail.com';

-- Asegurar que dary775@gmail.com tenga el flag activo en metadatos
UPDATE auth.users
SET raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"is_platform_admin": true}'::jsonb
WHERE email = 'dary775@gmail.com';
