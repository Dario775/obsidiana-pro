# Obsidiana Pro

Obsidiana Pro es un SaaS multitenant para tiendas con panel administrativo, POS, inventario, clientes, suscripciones y una vista de plataforma para super admin.

## Stack

- Turborepo
- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Supabase Auth + Postgres + RLS
- pnpm 9

## Estructura

- `apps/web`: aplicacion Next.js principal.
- `packages/shared`: cliente Supabase y helpers compartidos.
- `packages/supabase`: utilidades Supabase.
- `packages/ui`: componentes UI compartidos.
- `supabase/migrations`: schema inicial de base de datos.
- `supabase/seed.sql`: datos demo iniciales.
- `supabase/seed/02_plans.sql`: planes de desarrollo.

## Variables De Entorno

Crea `apps/web/.env.local` o `.env.local` en la raiz con:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
```

`NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` son obligatorias para que el cliente Supabase cargue.

## Desarrollo

En Windows/PowerShell, si `pnpm` falla por execution policy, usa `pnpm.cmd`.

```sh
pnpm.cmd install
pnpm.cmd dev
```

La app web corre por defecto en:

```txt
http://localhost:3000
```

## Checks

```sh
pnpm.cmd check-types
pnpm.cmd lint
pnpm.cmd test
pnpm.cmd build
```

## Supabase Local

Aplica la migracion inicial y seeds con la CLI de Supabase:

```sh
supabase start
supabase db reset
```

La migracion crea las tablas que usa la app actualmente:

- `tenants`
- `plans`
- `customers`
- `products`
- `product_variants`
- `inventory_levels`
- `orders`
- `order_items`
- `payments`
- `stock_movements`
- `stock_reservations`

El seed crea el tenant demo `Casa Central`, un producto, inventario inicial y el cliente `Consumidor Final`.

## POS Transaccional

El checkout del POS usa la RPC `complete_pos_checkout` definida en `supabase/migrations/20260502000000_initial_schema.sql`.

La RPC ejecuta en una sola transaccion:

- valida tenant, cliente, carrito, descuento y metodo de pago;
- bloquea el checkout por tenant con `pg_advisory_xact_lock`;
- bloquea filas de inventario con `for update`;
- crea `orders`, `order_items` y `payments`;
- descuenta stock solo si toda la venta puede completarse.

Esto evita ventas parciales cuando falla un insert, un pago o una actualizacion de inventario.

## Accesos Demo

La pantalla de login incluye accesos rapidos para desarrollo:

- `owner@tienda.com` / `Owner123!`
- `admin@obsidiana.com` / `Admin123!`

Estos usuarios deben existir en Supabase Auth para que los botones funcionen. El super admin `admin@obsidiana.com` tiene acceso amplio por RLS de desarrollo.

## Notas De Seguridad

Las policies actuales estan orientadas a desarrollo local:

- El tenant se puede crear desde el flujo de registro.
- El tenant activo se toma de `tenant_id` en el JWT, `app_metadata` o `user_metadata`.
- `admin@obsidiana.com` opera como super admin de plataforma.

Antes de produccion conviene mover la creacion de tenants a una ruta server-side con service role, eliminar accesos rapidos del login y reemplazar el super admin hardcodeado por roles en `app_metadata`.

## Despliegue

### Supabase Hosted

1. Crea un proyecto en Supabase.
2. Aplica migraciones:

```sh
supabase link --project-ref <project-ref>
supabase db push
```

3. Carga datos iniciales si corresponde:

```sh
supabase db execute --file supabase/seed.sql
supabase db execute --file supabase/seed/02_plans.sql
```

4. Configura Auth:

- Site URL: dominio final de la app.
- Redirect URLs: dominio final, preview URLs si usas Vercel, y localhost para desarrollo.
- Usuarios demo solo en entornos no productivos.

### Variables Por Ambiente

Desarrollo local:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Preview/produccion:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

`SUPABASE_SERVICE_ROLE_KEY` no debe usarse en componentes cliente. Reservala para rutas server-side, jobs o scripts admin.

### Vercel

1. Importa el repo.
2. Framework preset: Next.js.
3. Root/build command desde la raiz del monorepo:

```sh
pnpm install --frozen-lockfile
pnpm build
```

4. Configura las variables de entorno por ambiente.
5. Antes de promover a produccion, ejecuta:

```sh
pnpm check-types
pnpm lint
pnpm test
pnpm build
```

### Politicas Para Produccion

Antes de exponer el producto:

- reemplazar `admin@obsidiana.com` por roles en `app_metadata`;
- mover alta de tenants a una ruta server-side con service role;
- activar middleware SSR de autenticacion y autorizacion;
- eliminar botones de acceso rapido del login;
- revisar policies RLS con usuarios reales por rol;
- limitar RPCs con validaciones de rol y auditoria;
- rotar claves si alguna clave se uso en desarrollo compartido.

### Checklist De Release

- Migraciones aplicadas en Supabase hosted.
- Seeds de demo omitidos o adaptados para el ambiente.
- Variables configuradas en Vercel/Supabase.
- `pnpm check-types`, `pnpm lint`, `pnpm test` y `pnpm build` pasan.
- Login, registro, POS, inventario, clientes y pagos probados manualmente.
- RLS validado con usuario owner, usuario cashier y super admin.
- Backups de Supabase habilitados.
- Dominios y Redirect URLs revisados.
