# Instrucciones para Supabase

## 1. Ejecutar migración de plan_id (OBLIGATORIO)

Abrí Supabase → SQL Editor y ejecutá el contenido de:
`supabase/migrations/20260520000000_fix_plan_id_to_uuid.sql`

Esto convierte `tenants.plan_id` de `text` a `uuid` y actualiza los valores `'free'` al UUID correcto.

**Ejecutar UNA query a la vez** si hay datos existentes.

## 2. Verificar que los plans existen

```sql
SELECT id, name, nombre, monthly_price FROM plans;
```

Deberías ver 3 filas con IDs:
- `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1` (Free)
- `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2` (Business)
- `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3` (Pro)

Si no existen, ejecutá la QUERY 9 de `supabase/fixes/auth_flow_fixes.sql`.

## 3. Verificar que locations existe

```sql
SELECT COUNT(*) FROM locations;
```

Si la tabla no existe, ejecutá la QUERY 5 de `supabase/fixes/auth_flow_fixes.sql`.

## 4. Variables de entorno en Vercel

Asegurate de tener estas variables configuradas en Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (necesaria para admin operations)
- `NEXT_PUBLIC_APP_URL` (ej: `https://obsidiana.com.ar`)
- `OBSIDIANA_ROOT_DOMAIN` (ej: `obsidiana.com.ar`)

## 5. OAuth Google en Supabase

Authentication → Providers → Google:
- Enabled: ON
- Client ID y Secret configurados
- Redirect URLs incluyen: `https://[tu-proyecto].supabase.co/auth/v1/callback`

## 6. Wildcard DNS para subdominios (producción)

Configurar en tu proveedor DNS:
- Tipo: `A` o `CNAME`
- Host: `*`
- Value: IP/CNAME de Vercel

En Vercel → Settings → Domains: agregar `*.obsidiana.com.ar`
