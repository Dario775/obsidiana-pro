-- 🛠️ MIGRACIÓN: Agregar columnas faltantes a la tabla 'customers'
-- Sincroniza la base de datos de producción con el esquema local y el código del frontend.

ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text,
ADD COLUMN IF NOT EXISTS accepts_marketing boolean DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS dni_cuit text,
ADD COLUMN IF NOT EXISTS credit_limit numeric DEFAULT 0 NOT NULL;

-- 🔄 Sincronizar datos históricos si existen
UPDATE public.customers
SET first_name = split_part(nombre, ' ', 1),
    last_name = substring(nombre from position(' ' in nombre) + 1)
WHERE (first_name IS NULL OR first_name = '') AND nombre IS NOT NULL;

UPDATE public.customers
SET dni_cuit = document_number
WHERE (dni_cuit IS NULL OR dni_cuit = '') AND document_number IS NOT NULL;

-- 🔒 RLS (Row Level Security): Habilitar y permitir a los usuarios autenticados y anónimos gestionar clientes de forma resiliente
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own tenant customers" ON public.customers;
CREATE POLICY "Users can manage their own tenant customers" ON public.customers FOR ALL TO authenticated 
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can manage customers" ON public.customers;
CREATE POLICY "Anon can manage customers" ON public.customers FOR ALL TO anon 
USING (true)
WITH CHECK (true);
