# Obsidiana - Sistema Checkpoint

> Fecha: 2026-05-19
> Estado: Sistema de Caja Operativo + ARCA Premium Gating + Chatbot Práctico + Branding Unificado ✅

---

## 1. Arquitectura General del Proyecto

### Stack Tecnológico
- **Framework**: Next.js (App Router) con Turbopack
- **Monorepo**: Turborepo con pnpm (`apps/web`, `packages/shared`, `packages/ui`)
- **Base de Datos**: Supabase (`fjgwenrebdwssquebfay.supabase.co`)
- **Hosting**: Vercel (`obsidiana-pro.vercel.app`)
- **Imágenes**: Cloudinary
- **Estilos**: TailwindCSS con design tokens personalizados

### Estructura de Rutas (App Router)
Los grupos de rutas entre paréntesis `(admin)`, `(store)`, `(pos)`, `(platform)` NO forman parte de la URL final.

| Ruta del Archivo | URL Real |
|---|---|
| `app/(admin)/dashboard/page.tsx` | `/dashboard` |
| `app/(admin)/pos/page.tsx` | `/pos` |
| `app/(admin)/pos/closure/page.tsx` | `/pos/closure` |
| `app/(admin)/pos/history/page.tsx` | `/pos/history` |
| `app/(admin)/pos/sales/page.tsx` | `/pos/sales` |
| `app/(admin)/inventory/page.tsx` | `/inventory` |
| `app/(admin)/customers/page.tsx` | `/customers` |
| `app/(admin)/orders/page.tsx` | `/orders` |
| `app/(admin)/online-catalog/page.tsx` | `/online-catalog` |
| `app/(admin)/settings/page.tsx` | `/settings` |
| `app/(admin)/settings/billing/page.tsx` | `/settings/billing` |
| `app/(admin)/settings/store/page.tsx` | `/settings/store` |
| `app/(admin)/settings/ml-products/` | `/settings/ml-products` |
| `app/(store)/tienda/[slug]/page.tsx` | `/tienda/{slug}` |

> ⚠️ **IMPORTANTE**: Todos los `<Link href>` internos deben usar la URL real SIN el grupo de ruta. Ej: `/pos/history` y NO `/admin/pos/history`.

---

## 2. Branding y Nomenclatura

| Elemento | Valor Correcto |
|---|---|
| **Nombre del SaaS** | **Obsidiana** (NO "Obsidiana Pro") |
| **Branding POS** | OBSIDIANA POS |
| **Sidebar Header** | Obsidiana Admin |
| **Dominio** | obsidiana.com.ar |
| **Sistema de afiliados ML** | ❌ Eliminado — se usa importación por link directo |

---

## 3. Sistema de Caja (POS Cash Management)

### Tabla `cash_sessions` (Supabase)
Migración: `supabase/migrations/20260519130000_create_cash_sessions.sql`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | uuid | PK |
| `tenant_id` | uuid | FK → tenants.id |
| `user_id` | uuid | Usuario que operó |
| `name` | text | Nombre de la caja (ej: "Caja Principal") |
| `status` | text | `open` / `closed` |
| `opened_at` | timestamptz | Apertura |
| `closed_at` | timestamptz | Cierre |
| `initial_amount` | numeric | Monto inicial de efectivo |
| `expected_amount` | numeric | Efectivo esperado por el sistema |
| `actual_amount` | numeric | Efectivo contado real |
| `difference` | numeric | Diferencia de arqueo |
| `total_sales` | numeric | Total facturado en el turno |
| `operations_count` | integer | Cantidad de ventas |
| `sales_breakdown` | jsonb | Desglose por método: efectivo, tarjeta, mercadopago, transferencia |
| `arca_status` | text | `none` / `pending` / `approved` / `failed` |
| `arca_report_id` | text | ID del reporte fiscal Z (null si local) |
| `notes` | text | Observaciones del cierre |

### Flujo Operativo
1. **Apertura** (`/pos`): Al ingresar a Terminal POS sin sesión activa, se solicita nombre de caja y monto inicial.
2. **Operación**: Ventas normales se registran vinculadas a la sesión activa.
3. **Cierre** (`/pos/closure`): El usuario ingresa el efectivo real contado. Se calcula la diferencia, se genera el ticket y se cierra la sesión.
4. **Historial** (`/pos/history`): Tabla de todos los turnos con detalle, diferencia de arqueo y estado fiscal.

### ARCA (Integración Fiscal) — Gating por Plan
Las funciones fiscales de ARCA están **bloqueadas por defecto** y solo se habilitan para planes premium:

| Plan | Comportamiento |
|---|---|
| **Free / Básico** | Cierre local: `arca_status='none'`, sin reporte Z fiscal. Tarjeta informativa invitando a mejorar plan. |
| **Premium (con `arca_integration`)** | Cierre con reporte Z automático: `arca_status='approved'`, ID de reporte fiscal generado. |

**Archivos involucrados:**
- `app/(admin)/pos/closure/page.tsx` → Usa `hasFeature('arca_integration')` para condicionar la lógica de cierre y la UI
- `app/(admin)/pos/history/page.tsx` → Muestra etiqueta "Local" para sesiones sin ARCA, oculta Z-Report en detalle modal

---

## 4. Hook `useTenant` y Feature Gating

**Archivo**: `hooks/use-tenant.ts`

```typescript
const { tenant, plan, loading, error, hasFeature, getPlanName, isOnlineStoreEnabled } = useTenant();
```

- `hasFeature(name)`: Verifica features del plan actual (boolean columns o JSONB `features`)
- Features soportadas: `online_store`, `pos`, `arca_integration`
- `isOnlineStoreEnabled`: Atajo para verificar tienda online activa

**Componente `<FeatureGate>`** (`components/feature-gate.tsx`):
Wrapper declarativo para bloquear secciones con pantalla de upgrade.

---

## 5. Chatbot Asistente

**Archivo**: `components/chatbot-assistant.tsx`

Chatbot flotante integrado en el layout admin con respuestas predefinidas por keywords.

### Reglas de Contenido
- **Lenguaje práctico y simple**: Sin jerga técnica, sin rutas URL, sin términos de programación
- Las instrucciones hacen referencia a **opciones reales del menú lateral** (ej: "Dirigite a Terminal POS en el menú lateral")
- Incluye funciones: nueva conversación, borrar historial
- Keywords: plan, mercado libre, caja/apertura/cierre, stock/inventario, cliente/fiar/crédito, whatsapp/tienda online, ayuda/soporte

### Ejemplo de Respuesta (Caja)
> Para abrir o cerrar tu caja, seguí estos pasos sencillos:
> 1. **Apertura de Caja**: Dirigite a Terminal POS en el menú lateral...
> 2. **Operar Ventas**: Una vez abierta, podés registrar tus ventas normalmente...
> 3. **Cierre de Caja**: Al finalizar tu turno, hacé click en Cierre de Caja (Z)...

---

## 6. Base de Datos & Transaccionalidad POS

### Tablas Principales
| Tabla | Descripción |
|---|---|
| `tenants` | Comercios (multi-tenancy). Incluye config de tienda online, plan, ML tokens |
| `plans` | Planes de suscripción con features JSONB |
| `products` | Catálogo de productos (campo `nombre` — NO `title`) |
| `product_variants` | Variantes (talle, color) con SKU y barcode |
| `inventory_levels` | Stock por ubicación |
| `orders` | Ventas (POS y online) |
| `order_items` | Items de cada venta |
| `payments` | Pagos registrados |
| `customers` | Base de clientes con crédito |
| `cash_sessions` | Turnos de caja |
| `tenant_members` | Relación usuario↔tenant |

### Función PL/pgSQL `complete_pos_checkout`
Función atómica que: registra orden, calcula IVA, agrega items con snapshots, descuenta stock, registra pago.

### Seguridad
- RLS habilitado con bypass policy para development (`authenticated` + `anon`)
- Multi-tenancy delegado al frontend con filtros `.eq('tenant_id', tenant.id)`

---

## 7. Sidebar y Navegación Principal

**Archivo**: `components/admin-sidebar.tsx`

### Secciones del Menú
1. **Gestión Retail**
   - Panel General (`/dashboard`)
   - Terminal POS (`/pos`)
   - Cierre de Caja Z (`/pos/closure`)
   - Historial de Caja (`/pos/history`)
   - Inventario (`/inventory`)
   - Clientes (`/customers`)

2. **Tienda Online** (condicional a plan)
   - Pedidos Web (`/orders`)
   - Catálogo Web (`/online-catalog`)
   - Personalización (`/settings/store`)

3. **Footer**
   - Ajustes Globales (`/settings`)
   - Cerrar Sesión

### Super Admin
- Email: `admin@admin.com`
- Redirige a `/overview` (panel global de tenants)
- Interceptado por `AuthGuard` si intenta acceder a rutas de comerciante

---

## 8. Tienda Online (Storefront)

- Ruta dinámica: `app/(store)/tienda/[slug]/page.tsx`
- Subdominios: `{slug}.obsidiana.com.ar` → reescrito por middleware a `/tienda/{slug}`
- Carrito deslizante boutique con micro-stepper de 3 pasos
- Checkout por WhatsApp
- Tipografías: Inter, Outfit
- Temas: claro/oscuro
- Páginas legales: Términos y Privacidad

---

## 9. Seguridad

- **Anti-XSS**: Validador `validateImageFile` bloquea SVG/HTML, doble extensión, límite 2MB
- **Middleware**: Autenticación Supabase SSR, redirección de rutas protegidas, multi-tenancy por subdominio
- **CORS**: Rutas API protegidas

---

## 10. Estado de Compilación

```
✅ TypeScript (tsc --noEmit): 0 errores
✅ Next.js route types: generados exitosamente
✅ Turbo: 3/3 tareas exitosas (web, @repo/shared, @repo/ui)
```

---

## 11. Módulos Completados

- [x] POS transaccional atómico con función Supabase
- [x] Sistema de apertura/cierre de caja (cash_sessions)
- [x] Integración fiscal ARCA bloqueada por plan premium
- [x] Historial de turnos con auditoría y etiquetas de estado
- [x] Chatbot asistente con respuestas prácticas y no-técnicas
- [x] Branding unificado: "Obsidiana" (sin "Pro")
- [x] ML Afiliados eliminado — importación por link directo
- [x] Feature gating por plan (FeatureGate + hasFeature)
- [x] Tienda online con carrito boutique y checkout WhatsApp
- [x] Dashboard con KPIs en tiempo real
- [x] Historial de ventas POS con filtros y exportación CSV
- [x] Gestión de clientes con cuentas corrientes
- [x] Inventario con alertas de stock crítico
- [x] Validación de seguridad en uploads de imágenes
- [x] Buscador híbrido de imágenes (DB + Cloudinary)
- [x] Páginas legales (Términos, Privacidad)
- [x] Auto-asignación de Plan Free para nuevos tenants
- [x] Aislamiento de Super Admin
- [x] Rutas internas corregidas (sin prefijo /admin/)
- [x] Sistema de Tickets y Comprobantes: formato térmico (58mm/80mm), datos de contacto, logo y datos fiscales personalizables
- [x] Panel de Gestión de Impresoras: soporte para WebUSB directo, impresoras de Red (TCP/IP) e impresión nativa de sistema
- [x] Impresión Inteligente de Cierre de Caja: redimensionamiento automático entre rollo térmico y hoja A4 según config de reportes

## 12. Pendientes / Roadmap

1. **Integración real ARCA**: Conectar con servidores fiscales de ARCA (ex-AFIP) para emisión real de reportes Z
2. **Tracking de envíos**: Flujo de seguimiento en tiempo real para compras online
3. **Onboarding visual**: Wizard de personalización de banner al registrar un nuevo tenant
4. **Notificaciones push**: Alertas de stock crítico y nuevos pedidos
5. **Reportes avanzados**: Gráficos de rendimiento mensual y comparativos

---

## 13. Comandos de Producción

```bash
# Servidor local de desarrollo
pnpm dev

# Verificar tipos
pnpm check-types

# Compilar proyecto completo (Turbo)
pnpm build

# Push a producción
git add .
git commit -m "feat: ticket customization and advanced printer management integration"
git push
```

*Última actualización: 2026-05-19 17:53 — Obsidiana Team*