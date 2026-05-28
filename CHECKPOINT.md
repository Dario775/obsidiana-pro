# Obsidiana - Sistema Checkpoint

> Fecha: 2026-05-28
> Estado: ✅ Rebranding Completed to "Obsidiana" + Platform Terms & Privacy Policy published + Landing branding revamped with sleek glowing integrations grid + Email registration hardened with confirmPassword and anti-XSS/SQLi regex filtering + Official V4 Logo fully integrated with rounded corners across all components, favicon icons, and headers/footers + Footer social vector links (WhatsApp +543877534410 and Facebook) integrated successfully + Premium Visual Onboarding Wizard (5 steps) implemented and auto-triggers for new tenants.

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
| `tenants` | Comercios (multi-tenancy). `plan_id` ahora referencia UUID a `plans.id` |
| `plans` | Planes de suscripción con features JSONB. 3 planes: Free, Business, Pro (UUIDs fijos) |
| `products` | Catálogo de productos (campo `nombre`) |
| `product_variants` | Variantes (talle, color) con SKU y barcode |
| `inventory_levels` | Stock por ubicación |
| `orders` | Ventas (POS y online) |
| `order_items` | Items de cada venta |
| `payments` | Pagos registrados |
| `customers` | Base de clientes con crédito |
| `cash_sessions` | Turnos de caja |
| `tenant_members` | Relación usuario↔tenant con unique constraint `(user_id, tenant_id)` |
| `locations` | Sucursales del tenant (creada, con RLS) |

### RLS Policies Corregidas
- `plans`: pública lectura (`plans_read_public`)
- `tenant_members`: tenant-scoped SELECT, INSERT permitido
- `locations`: tenant-scoped SELECT, service_role ALL

### UUIDs de Planes
| Plan | UUID |
|---|---|
| Free | `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1` |
| Business | `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2` |
| Pro | `aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3` |

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
- Subdominios: `{slug}.obsidiana.com.ar` en producción → reescrito por middleware; `/tienda/{slug}` en localhost
- Helper: `lib/store-url.ts` genera URLs con subdominio o path según entorno
- Carrito deslizante boutique con micro-stepper de 3 pasos
- Checkout por WhatsApp
- Productos de Mercado Libre importados con `available_online: true` aparecen automáticamente
- Tipografías: Inter, Outfit
- Temas: claro/oscuro
- Páginas legales: Términos y Privacidad

---

## 9. Seguridad

- **Anti-XSS**: Validador `validateImageFile` bloquea SVG/HTML, doble extensión, límite 2MB
- **Middleware**: Autenticación Supabase SSR, redirección de rutas protegidas, multi-tenancy por subdominio, prevención de open redirect
- **Auth Flow**: Callback unificado `/auth/callback` maneja OAuth, recovery, signup. Crea tenant automático para Google users si falta
- **OAuth State**: `storeName` pasado como `state` param en Google OAuth para creación de tenant
- **Debounce**: `onAuthStateChange` con debounce para evitar multi-render en auth-provider
- **Plan ID**: Validación de existencia del plan antes de crear tenant. Fallback a Free plan UUID
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
- [x] Branding unificado: "Obsidiana" (sin "Pro") e integración del nuevo Logo V2 en Sidebar, Topbar, registro de usuarios y comprobantes de tickets impresos
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
- [x] Aplicación Web Progresiva (PWA): manifest.json, service worker básico (sw.js) y registro cliente para soportar descarga e instalación
- [x] Configuración de Viewport inalterable y Safe Areas (viewport-fit=cover) para evitar distorsiones de zoom y cortes de pantalla en móviles
- [x] Optimizaciones CSS de interacción nativa (overscroll-behavior-y, user-select: none, tap-highlight-color, transiciones activas)
- [x] Barra de navegación dinámica inferior que resalta rutas activas y menú deslizable (Bottom Sheet Drawer) para secciones secundarias
- [x] Banner flotante PWA de instalación premium con soporte para Android/Chrome y tutorial guiado interactivo para iOS Safari
- [x] **Auth Flow Hardening**: OAuth redirect, error handling, automatic tenant creation for Google users, debounced auth state
- [x] **Password Recovery**: Páginas `/forgot-password` y `/reset-password`, callback type=recovery/signup
- [x] **Subdomain Store URLs**: Implementación con middleware + helper `lib/store-url.ts`, fix localhost detection
- [x] **plan_id UUID Fix**: Migración de `text` a `uuid`, eliminación de planes duplicados con IDs de texto
- [x] **Database Schema**: Tabla `locations` creada, RLS policies para plans/tenant_members/locations, unique constraint tenant_members
- [x] **DB Audit**: 0 errores, 0 warnings. 3 planes, 2 tenants, 2 members, 2 locations, 5 auth users, todo consistente
- [x] **Mercado Libre Stock Decoupling**: Se desacopló completamente el stock de productos importados de Mercado Libre del inventario físico. Las métricas del catálogo web excluyen estos productos, la tabla administrativa muestra un badge premium de "Enlace ML" en stock e indica "No aplica" en la reserva, y las nuevas importaciones se registran con stock `0`.
- [x] **Rebranding Global de Marca**: Cambio exhaustivo de "Obsidiana-Pro" a "Obsidiana" en todos los componentes de interfaz, variables, títulos, y archivos legales, consolidando un software de diseño de alta fidelidad libre de clichés.
- [x] **Políticas de la Plataforma**: Términos de Servicio y Política de Privacidad de Obsidiana adaptados legalmente de forma clara e integrados en landing pages y tiendas de inquilinos, registrados en el middleware como rutas públicas autorizadas.
- [x] **Rediseño Estético de la Landing Page**: Reemplazo de la sección de marcas con una rejilla premium animada y retroiluminada de integraciones, removiendo badges parpadeantes genéricos como "SISTEMA ONLINE" o "CONECTADO".
- [x] **Blindaje del Registro por Email**: Implementado el campo de "Confirmar contraseña" (frontend y API de backend) y aplicados filtros regex de whitelist estrictos (`/^[a-zA-Z0-9ñÑáéíóúÁÉÍÓÚüÜ\s.,'\-&()]+$/`) para desinfectar y validar el correo y el nombre del negocio (`storeName`), bloqueando de raíz ataques XSS, HTML y SQL injection.
- [x] **Integración de Identidad Visual V4 (Logos y Favicon)**: Copiado el logotipo oficial de fondo blanco `Logo Obsidiana V4 fondo blanco.png` como logo principal del sistema, íconos de la PWA, favicon de pestaña del navegador, y configurado el título del navegador a exactamente "Obsidiana" con bordes redondeados (`rounded-md`, `rounded-lg`) en todas las cabeceras (headers), pies de página (footers), formularios y paneles SaaS.
- [x] **Enlaces Sociales Vectoriales en el Footer**: Botones interactivos vectoriales SVG oficiales de alta fidelidad integrados en el footer de la plataforma para WhatsApp (apuntando a +543877534410 con hover verde corporativo) y Facebook (con hover azul corporativo).
- [x] **Onboarding Visual Wizard (5 Pasos)**: Wizard premium de configuración inicial con modal full-screen, barra de progreso animada, ilustraciones SVG únicas por paso (Bienvenida → Tu Negocio → Tienda Online → Primer Producto → Listo!), transiciones slide, selector de tema claro/oscuro, y guardado atómico en Supabase usando el campo JSONB `settings.onboarding_completed`. Se activa automáticamente para nuevos tenants y nunca interrumpe a usuarios existentes.

## 12. Pendientes / Roadmap

1. **Integración real ARCA**: Conectar con servidores fiscales de ARCA (ex-AFIP) para emisión real de reportes Z
2. **Tracking de envíos**: Flujo de seguimiento en tiempo real para compras online
4. **Notificaciones push**: Alertas de stock crítico y nuevos pedidos
5. **Reportes avanzados**: Gráficos de rendimiento mensual y comparativos
6. **Convertir `plan_id` a `uuid` nativo en DB**: Migración DDL pendiente (datos ya son UUIDs válidos)
7. **Wildcard DNS `*.obsidiana.com.ar`**: Configurar en Vercel + proveedor DNS para subdominios
8. **Probar importación ML end-to-end**: Verificar que productos importados aparecen en tienda online

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
git commit -m "feat: add premium onboarding wizard with 5 steps, animations and Supabase saving"
git push
```

*Última actualización: 2026-05-27 22:44 — Obsidiana Team*