-- Add external_url to products for simple affiliate support
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS external_url TEXT;

COMMENT ON COLUMN public.products.external_url IS 'Link para compras externas (afiliados). Si existe, el botón de compra redirige aquí.';
