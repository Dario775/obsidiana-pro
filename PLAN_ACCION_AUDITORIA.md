# PLAN DE ACCIÓN — Auditoría Obsidiana Pro v1.2.0

> Medidas correctivas priorizadas para resolver los hallazgos de la auditoría del 28/05/2026.

---

## FASE 1 — INMEDIATO (Semana 1)

### 1.1 Agregar RLS policies faltantes en tablas principales

**Archivo:** `supabase/migrations/20260528000001_fix_rls_products_and_core.sql`

```sql
-- Habilitar RLS si no lo está
ALTER TABLE IF EXISTS public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.inventory_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.customers ENABLE ROW LEVEL SECURITY;

-- Products: usuarios autenticados ven/modifican SOLO sus propios tenant
DROP POLICY IF EXISTS "products_tenant_isolation" ON public.products;
CREATE POLICY "products_tenant_isolation" ON public.products
  FOR ALL
  TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

-- Product Variants: acceso vía JOIN con products
DROP POLICY IF EXISTS "product_variants_tenant_isolation" ON public.product_variants;
CREATE POLICY "product_variants_tenant_isolation" ON public.product_variants
  FOR ALL
  TO authenticated
  USING (
    product_id IN (
      SELECT id FROM public.products WHERE tenant_id = public.current_tenant_id()
    )
  )
  WITH CHECK (
    product_id IN (
      SELECT id FROM public.products WHERE tenant_id = public.current_tenant_id()
    )
  );

-- Inventory Levels: acceso directo por tenant_id
DROP POLICY IF EXISTS "inventory_levels_tenant_isolation" ON public.inventory_levels;
CREATE POLICY "inventory_levels_tenant_isolation" ON public.inventory_levels
  FOR ALL
  TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

-- Customers
DROP POLICY IF EXISTS "customers_tenant_isolation" ON public.customers;
CREATE POLICY "customers_tenant_isolation" ON public.customers
  FOR ALL
  TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());
```

### 1.2 Agregar RLS en Payments (crítico: datos financieros)

**Archivo:** `supabase/migrations/20260528000002_fix_rls_payments_and_remaining.sql`

```sql
ALTER TABLE IF EXISTS public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payments_tenant_isolation" ON public.payments;
CREATE POLICY "payments_tenant_isolation" ON public.payments
  FOR ALL
  TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

-- Ídem para las demás tablas sin RLS
ALTER TABLE IF EXISTS public.stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock_movements_tenant_isolation" ON public.stock_movements
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

ALTER TABLE IF EXISTS public.stock_reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock_reservations_tenant_isolation" ON public.stock_reservations
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

ALTER TABLE IF EXISTS public.subscription_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subscription_payments_tenant_isolation" ON public.subscription_payments
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

ALTER TABLE IF EXISTS public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "suppliers_tenant_isolation" ON public.suppliers
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());
```

### 1.3 Eliminar políticas anon peligrosas en `tenants`

**Archivo:** `supabase/migrations/20260528000003_fix_tenants_anon_policies.sql`

```sql
-- Eliminar políticas anon que permiten crear y leer tenants sin autenticación
DROP POLICY IF EXISTS "tenants_insert_anon" ON public.tenants;
DROP POLICY IF EXISTS "tenants_select_anon" ON public.tenants;

-- Reemplazar por políticas seguras
DROP POLICY IF EXISTS "tenants_read_for_signup" ON public.tenants;
CREATE POLICY "tenants_select_own" ON public.tenants
  FOR SELECT
  TO authenticated
  USING (id = public.current_tenant_id());
```

### 1.4 Agregar RLS en `platform_config`

```sql
ALTER TABLE IF EXISTS public.platform_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_config_admin_only" ON public.platform_config;
CREATE POLICY "platform_config_admin_only" ON public.platform_config
  FOR ALL
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());
```

---

## FASE 2 — CORTO PLAZO (Semana 2)

### 2.1 Sacar admins hardcodeados del código

**Archivos a modificar:** `use-tenant.ts`, `auth-provider.tsx`, `callback/route.ts`, `login/page.tsx`

**Estrategia:**
- Reemplazar hardcodeos por consulta a una tabla `platform_admins` en Supabase
- O usar `select is_platform_admin from tenants where id = current_tenant_id()`

```typescript
// En lugar de:
if (user.email === 'dary775@gmail.com' || user.email === 'admin@admin.com')

// Usar:
const { data: tenant } = await supabase
  .from('tenants')
  .select('is_platform_admin')
  .eq('id', tenantId)
  .single();
const isPlatformAdmin = tenant?.is_platform_admin === true;
```

### 2.2 Mover tokens MP y ML a Vault de Supabase

**Estrategia:**
- Migrar `store_mp_access_token`, `ml_access_token`, `ml_refresh_token` desde `tenants` a `vault.secrets`
- Leer desde Vault en las API routes que los necesiten

```sql
-- Crear función para obtener token desde Vault
CREATE OR REPLACE FUNCTION public.get_tenant_mp_token(p_tenant_id uuid)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_secret text;
BEGIN
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'mp_token_' || p_tenant_id::text;
  RETURN v_secret;
END;
$$;
```

### 2.3 Eliminar UUIDs hardcodeados

**Estrategia:**
- `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1` → variable de entorno `NEXT_PUBLIC_DEFAULT_PLAN_ID`
- `00000000-0000-0000-0000-000000000001` → crear location por defecto real al registrar tenant
- `51605ab9-958d-4e81-8360-8007fe842c85` → resolver desde `platform_admins` en DB
- `54573d5c-23c0-44f3-83e8-78fecdbcb049` → crear "Consumidor Final" real o pasar `null`

### 2.4 Agregar rate limiting en endpoints restantes

```typescript
// Crear helper compartido: lib/rate-limit.ts
const rateLimitStore = new Map<string, number[]>();

export function checkRateLimit(
  key: string,
  maxRequests: number = 30,
  windowMs: number = 60_000
): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const windowStart = now - windowMs;
  const attempts = (rateLimitStore.get(key) || []).filter(t => t > windowStart);
  
  if (attempts.length >= maxRequests) {
    return { allowed: false, retryAfter: Math.ceil((attempts[0] + windowMs - now) / 1000) };
  }
  
  attempts.push(now);
  rateLimitStore.set(key, attempts);
  return { allowed: true, retryAfter: 0 };
}
```

**Endpoints a proteger (por ahora en memoria, luego migrar a Upstash Redis):**
| Endpoint | Límite | Ventana |
|---|---|---|
| `POST /api/users` | 10 | 1 hora |
| `POST /api/checkout/mercadopago` | 30 | 1 minuto |
| `POST /api/ml/import` | 20 | 1 hora |
| `POST /api/ml/scrape` | 30 | 1 minuto |

### 2.5 Configurar headers de seguridad en `next.config.js`

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self'",
              "connect-src 'self' https://*.supabase.co https://api.cloudinary.com https://api.mercadopago.com",
              "frame-src 'none'",
              "base-uri 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

---

## FASE 3 — MEDIANO PLAZO (Semana 3-4)

### 3.1 Agregar tests para endpoints API

```typescript
// apps/web/app/api/__tests__/register.test.ts
import { describe, expect, it } from 'vitest';

describe('POST /api/register', () => {
  it('rejects missing store name', async () => {
    const res = await fetch('http://localhost:3000/api/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@test.com', password: '12345678' }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('nombre del negocio');
  });

  it('rejects short password', async () => {
    const res = await fetch('http://localhost:3000/api/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@test.com', password: '123', storeName: 'Mi Tienda' }),
    });
    expect(res.status).toBe(400);
  });

  it('rate limits after 5 attempts', async () => {
    const payload = {
      email: 'spam@test.com',
      password: '12345678',
      storeName: 'Spam Store',
    };
    for (let i = 0; i < 5; i++) {
      await fetch('http://localhost:3000/api/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    }
    const res = await fetch('http://localhost:3000/api/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    expect(res.status).toBe(429);
  });
});
```

**Estrategia de cobertura:** smoke test por endpoint + happy path + validación de errores conocidos.

### 3.2 Corregir test roto `schema-contract.test.ts`

```typescript
// Cambiar referencia de migración:
// ANTES:
const schema = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260502000000_initial_schema.sql'),
  'utf8'
);

// DESPUÉS:
const schema = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260511164147_remote_schema.sql'),
  'utf8'
);
```

### 3.3 Formatear todo el proyecto con Prettier

```bash
pnpm format
# o npx prettier --write "apps/web/**/*.{ts,tsx}" "packages/**/*.{ts,tsx}"
```

### 3.4 Configurar ESLint + Husky + lint-staged

```bash
pnpm add -D husky lint-staged
npx husky init
```

**.husky/pre-commit:**
```bash
npx lint-staged
```

**package.json:**
```json
"lint-staged": {
  "*.{ts,tsx,js,jsx}": ["eslint --fix", "prettier --write"],
  "*.{json,md,css}": ["prettier --write"]
}
```

### 3.5 Migrar rate limiter in-memory a Upstash Redis

```typescript
// lib/rate-limit-redis.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export const rateLimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '1 h'),
  analytics: true,
  prefix: 'ratelimit:register',
});
```

Esto asegura límites globales incluso con múltiples instancias serverless en Vercel.

---

## FASE 4 — LARGO PLAZO (Mes 2+)

### 4.1 Sistema de roles granular desde DB

- Crear tabla `roles` con permisos por feature
- Reemplazar lógica de permisos hardcodeada en `auth-provider.tsx`
- Sincronizar con `FeatureGate` component

### 4.2 Tests E2E con Playwright

- Flujo crítico: registro → login → POS checkout → cierre de caja
- Flujo tienda online: ver catálogo → agregar al carrito → checkout MP

### 4.3 CI/CD con GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm check-types
      - run: pnpm test
      - run: pnpm build
```

### 4.4 Auditoría automatizada recurrente

- Script que verifique RLS policies en todas las tablas
- Script que detecte secretos en el código (truffleHog/gitleaks)
- Integrar en CI

---

## RESUMEN DE ARCHIVOS A CREAR/MODIFICAR

| Archivo | Acción | Fase |
|---|---|---|
| `supabase/migrations/20260528000001_fix_rls_products_and_core.sql` | Nueva migración | 1 |
| `supabase/migrations/20260528000002_fix_rls_payments_and_remaining.sql` | Nueva migración | 1 |
| `supabase/migrations/20260528000003_fix_tenants_anon_policies.sql` | Nueva migración | 1 |
| `apps/web/next.config.js` | Modificar | 2 |
| `apps/web/lib/rate-limit.ts` | Nuevo helper | 2 |
| `apps/web/hooks/use-tenant.ts` | Modificar | 2 |
| `apps/web/components/auth-provider.tsx` | Modificar | 2 |
| `apps/web/app/auth/callback/route.ts` | Modificar | 2 |
| `apps/web/app/api/__tests__/register.test.ts` | Nuevo test | 3 |
| `supabase/migrations_backup/schema-contract.test.ts` | Modificar | 3 |
| `.husky/pre-commit` | Nuevo | 3 |
| `apps/web/lib/rate-limit-redis.ts` | Nuevo helper | 3.5 |
| `.github/workflows/ci.yml` | Nuevo | 4 |

---

## URGENCIA VS ESFUERZO

```
Alto impacto
    │
    │  1.1 RLS products      ● 1.2 RLS payments
    │  1.3 Anon tenants      ●
    │  2.1 Admins hardcode   ●
    │                        ●
    │  2.2 Tokens en Vault   ●
    │  2.3 UUIDs hardcode    ●
    │                        ●
    │  2.5 next.config.js    ●
    │  3.3 Prettier          ● 2.4 Rate limit
    │  3.1 Tests API          ● 3.4 Husky
    │                         ●
    │                         3.2 Fix test
    └───────────────────────────────> Bajo esfuerzo
```

**Comenzar por el cuadrante superior izquierdo (alto impacto, bajo esfuerzo)**
