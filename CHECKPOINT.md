# Obsidiana Pro - Sistema checkpoint

> Fecha: 2026-05-16
> Estado: Build Estabilizado + Estandarización 'nombre' iniciada + Auditoría de Esquema ✅

---

## 1. Base de Datos (Evolución SaaS)

### Tablas clave para el modelo de negocio
```sql
-- Planes de Suscripción (Sincronizado al 100%)
plans (
  id text PK, -- IDs legibles: 'free', 'inicio', 'pro', 'enterprise'
  name text,
  description text,
  monthly_price numeric,
  yearly_price numeric,
  max_products int,
  max_branches int,
  online_store boolean,
  pos boolean,
  features jsonb
)

-- Pagos de Suscripción (Platform Level)
subscription_payments (
  id uuid PK,
  tenant_id uuid,
  plan_id text, -- Sincronizado como TEXT
  amount numeric,
  payment_method text,
  status text, -- 'completed', 'pending_confirmation', 'rejected'
  paid_at timestamp,
  proof_url text -- URL del comprobante en Storage
)

-- Tenants
tenants (
  id uuid PK,
  plan_id text, -- Sincronizado como TEXT para matching con plans.id
  subscription_status text, -- 'active', 'expired', 'pending_confirmation'
  paid_until timestamp,
  plan_started_at timestamp,
  is_platform_admin boolean -- Flag para Super Admins
)

-- Tenant Members (Asociación usuario-negocio)
tenant_members (
  tenant_id uuid,
  user_id uuid,
  role text -- 'owner', 'admin', 'staff'
)
```

### Seguridad y Consistencia
- **Sincronización de Tipos**: `plan_id` es `text` en todas las tablas.
- **RLS Policies**: Configuradas para multi-tenant con acceso de platform admin.
- **Activación Robusta**: El Super Admin actualiza el Tenant antes de marcar el pago como completado.
- **Estandarización de Nombres**: Migración en curso de `title` -> `nombre` en la tabla `products` para mayor consistencia idiomática.

---

## 1.1 Auditoría de Consistencia (Relevamiento 2026-05-16)

Tras una revisión profunda del esquema vs código, se identificaron los siguientes puntos:

| Entidad | Campo DB (Legacy) | Campo DB (Estandarizado) | Estado en Código |
| :--- | :--- | :--- | :--- |
| **Products** | `title` | `nombre` | Se prioriza `nombre` con fallback a `title`. |
| **Products** | `descripcion` | `description` | Se usa mayoritariamente `description`. |
| **Products** | `precio` | `product_variants.price_ars` | `precio` está en desuso; el POS e Inventario usan variantes. |
| **Inventory** | N/A | `online_reserved` | Columna en `products` (NO en `inventory_levels`). |

**Bugs Corregidos durante el relevamiento:**
- **Store Inventory Query:** Se eliminó el intento de consultar `online_reserved` desde `inventory_levels` (causaba error 500 en tienda online).
- **POS RPC:** Se actualizó `complete_pos_checkout` para priorizar `nombre` en el snapshot de la venta.
- **Vercel Build:** Se resolvió error de tipos en `extractMlItemId` (página de catálogo online) que bloqueaba el despliegue.

---

## 2. Autenticación y Seguridad

### 2.1 Google OAuth ✅ (Implementado 2026-05-15)
- **Flujo Implícito**: Se usa el flujo de navegador (implicit flow) por compatibilidad con Next.js 16 + Vercel.
- **Detección Automática**: La página `/login` detecta el `#access_token` al volver de Google y crea la sesión.
- **Auto-Registro**: Si un usuario de Google no tiene tienda, se le crea una automáticamente via `/api/register` (usa Service Role Key para bypassar RLS).
- **Ruteo Inteligente**: Después del login, el sistema consulta `tenant_members` y redirige:
  - Super Admin (`is_platform_admin`) → `/overview`
  - Merchant con tienda → `/dashboard`
  - Nuevo usuario → auto-creación de tienda → `/dashboard`

### 2.2 Configuración Google Cloud
- **Console**: [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
- **Client ID**: `302670362898-fj7pp6if4eqrn1bgp2nsjiodtk6grq64.apps.googleusercontent.com`
- **Orígenes autorizados**: `https://fjgwenrebdwssquebfay.supabase.co`, `http://localhost:3000`
- **Redirect URIs**: `https://fjgwenrebdwssquebfay.supabase.co/auth/v1/callback`, `http://localhost:3000/auth/callback`

### 2.3 Configuración Supabase Auth
- **Site URL**: `https://www.obsidiana.com.ar`
- **Redirect URLs**: `https://www.obsidiana.com.ar/auth/callback`, `http://localhost:3000/auth/callback`
- **Google Provider**: Habilitado con Client ID + Secret configurados.

### 2.4 Middleware Unificado (`apps/web/middleware.ts`) ✅
- **Subdominios**: Detecta `tienda1.obsidiana.com.ar` → reescribe a `/tienda/tienda1` internamente.
- **Protección de Rutas**: Rutas admin requieren sesión activa.
- **Redirección Inteligente**: Usuarios logueados que acceden a `/login` son redirigidos a `/dashboard`.

---

## 3. Módulos del Sistema

### 3.1 Super Admin Dashboard (`/(platform)`) ✅
- **Aprobación de Pagos**: Ver comprobantes de transferencia y activar planes con un clic.
- **Actualización Dinámica**: `plan_id`, `paid_until`, `plan_started_at` se actualizan al aprobar.
- **Sección de Pagos Pendientes**: Visible en el Overview.

### 3.2 Panel de Facturación del Merchant (`/settings/billing`) ✅
- **Notificación de Pago**: Merchants informan transferencias con comprobante adjunto.
- **Storage**: Bucket `platform_assets` para guardar comprobantes.

### 3.3 Tiendas Online (Subdominios) ✅
- **Ruteo**: `tienda.obsidiana.com.ar` → renderiza la tienda del tenant con ese slug.
- **DNS Pendiente**: Necesita registro CNAME Wildcard (`*`) apuntando a `obsidiana-pro.vercel.app`.

### 3.4 API de Registro (`/api/register`) ✅
- Soporta registro clásico (email + password) y Google OAuth (solo `googleUserId`).
- Crea tenant, location por defecto y asociación `tenant_members` usando Service Role Key.
- Genera slugs únicos automáticamente.

---

## 4. Arquitectura de Archivos Clave

```
apps/web/
├── app/
│   ├── auth/
│   │   ├── callback/route.ts      # Server-side auth callback (PKCE fallback)
│   │   └── ml-callback/page.tsx   # Callback de Mercado Libre (separado)
│   ├── login/page.tsx             # Login con Google + Email (detecta #access_token)
│   ├── register/page.tsx          # Registro con Google + Email
│   ├── api/register/route.ts      # API server-side para crear tenants (bypassea RLS)
│   ├── (admin)/                   # Panel de tienda (requiere auth)
│   ├── (platform)/                # Panel super admin (requiere auth + is_platform_admin)
│   └── (store)/tienda/[slug]/     # Tienda online pública
├── middleware.ts                   # Subdominios + protección de rutas
└── lib/
    ├── supabase.ts                # Cliente browser (flujo implícito)
    └── supabase-server.ts         # Cliente server con Service Role Key
```

---

## 5. Estado de Desarrollo

### ✅ Completado:
- [x] Google OAuth funcional (Google Cloud + Supabase configurados)
- [x] Auto-creación de tienda para usuarios nuevos de Google
- [x] Middleware unificado (subdominios + seguridad)
- [x] Aprobación de pagos desde Super Admin
- [x] Sincronización de esquema de pagos
- [x] Consistencia de tipos (UUID vs TEXT en plan_id)
- [x] Callback de Mercado Libre movido a `/auth/ml-callback`
- [x] Resolución de errores de tipos en `online-catalog` (Vercel Build Stability)
- [x] Corrección de query de inventario en Tienda Online
- [x] Estandarización de `nombre` en POS, Tienda y RPC de Checkout

### 🔧 Pendiente de Verificación:
- [ ] Confirmar que Google OAuth redirige correctamente al Dashboard en producción
- [ ] Probar flujo completo: Google Login → Auto-crear tienda → Dashboard
- [ ] DNS: Configurar CNAME Wildcard para subdominios de tiendas

### 🚀 Próximos Pasos:
1. **Impersonation**: Botón "Entrar como Tenant" para soporte técnico.
2. **Audit Logs**: Registro de cambios críticos.
3. **Notificaciones**: Email al merchant cuando su plan se active.
4. **Onboarding Wizard**: Guía post-registro para nuevos usuarios de Google.

---

## 6. Comandos Útiles
```bash
# Iniciar servidor de desarrollo
npm run dev

# Subir cambios a producción
git add .; git commit -m "descripción"; git push origin main

# Variables de entorno requeridas
NEXT_PUBLIC_SUPABASE_URL=https://fjgwenrebdwssquebfay.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

*Última actualización: 2026-05-16 13:45 - Obsidiana Pro Team*