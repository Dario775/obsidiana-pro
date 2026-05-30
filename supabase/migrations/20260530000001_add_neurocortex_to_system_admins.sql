-- Migration: Restrict platform admin strictly to dary775@gmail.com
-- Description: Ultra-strict platform admin - only dary775@gmail.com is allowed forever.
-- Date: 2026-05-30

-- 1. Recrear la función is_platform_admin con validación estricta por email
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_jwt_email text;
BEGIN
  -- Extraer email del JWT actual
  v_jwt_email := auth.jwt() ->> 'email';

  -- ÚNICO SUPER ADMIN PERMITIDO EN TODO EL SISTEMA
  IF v_jwt_email = 'dary775@gmail.com' THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- 2. Limpiar el flag is_platform_admin de TODOS los usuarios excepto el tuyo
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data - 'is_platform_admin'
WHERE email IS NOT NULL 
  AND email <> 'dary775@gmail.com';

-- 3. Asegurar que dary775@gmail.com tenga el flag (crear si no existe)
UPDATE auth.users
SET raw_user_meta_data = 
    COALESCE(raw_user_meta_data, '{}'::jsonb) 
    || '{"is_platform_admin": true}'::jsonb
WHERE email = 'dary775@gmail.com';

-- 4. (Opcional pero recomendado) Forzar refresh de tokens existentes
-- Nota: Los usuarios deberán volver a loguearse para que el cambio en JWT sea efectivo
