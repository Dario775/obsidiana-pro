# Obsidiana Pro - Sistema checkpoint

> Fecha: 2026-05-07
> Estado: Desarrollo activo - Módulo tienda online completo

---

## 1. Base de Datos

### Tablas principales

```sql
-- Tenants (multitenant)
tenants (
  id uuid PK,
  slug text UNIQUE,
  nombre text,
  online_store_enabled boolean,
  store_appearance jsonb,  -- {template, theme_color, font_family, dark_mode}
  store_name text,
  store_logo_url text,
  store_banners text[],    -- hasta 3 imágenes para carrusel
  store_tagline text,
  store_description text,
  store_domain text,
  store_active boolean,
  store_currency text,
  store_shipping_enabled boolean,
  store_shipping_cost numeric,
  store_shipping_free_threshold numeric,
  store_min_order_amount numeric,
  store_payment_methods jsonb,
  store_social_whatsapp text,
  store_social_instagram text,
  store_social_facebook text
)

-- Products
products (
  id uuid PK,
  tenant_id uuid FK,
  title text,
  slug text,
  description text,
  status text DEFAULT 'active',
  images jsonb,
  available_online boolean DEFAULT false,  -- publicado en tienda
  online_reserved integer DEFAULT 0     -- stock reservado para web
)

-- Product Variants
product_variants (
  id uuid PK,
  tenant_id uuid FK,
  product_id uuid FK,
  sku text,
  barcode text,
  price_ars numeric
)

-- Inventory
inventory_levels (
  tenant_id uuid,
  variant_id uuid,
  location_id uuid DEFAULT '00000000-0000-0000-0000-000000000001',
  on_hand int DEFAULT 0,
  committed int DEFAULT 0,
  available int GENERATED AS (on_hand - committed) STORED,
  PRIMARY KEY (tenant_id, variant_id, location_id)
)

-- Orders
orders (
  id uuid PK,
  tenant_id uuid FK,
  customer_name text,
  customer_phone text,
  customer_email text,
  customer_address text,
  customer_city text,
  customer_province text,
  customer_postal_code text,
  payment_method text,
  subtotal numeric,
  shipping_cost numeric,
  total numeric,
  status text DEFAULT 'pending'
)

-- Order Items
order_items (
  id uuid PK,
  order_id uuid FK,
  product_id uuid FK,
  quantity int,
  price numeric
)
```

### Tablas global (imágenes compartidas)

```sql
-- Catálogo global para共享 imágenes por barcode
global_catalog (
  barcode_ean13 text UNIQUE,
  normalized_name text,
  image_url text,
  thumbnail_url text,
  created_at timestamptz
)

-- Referencias de productos al catálogo global
product_global_refs (
  product_id uuid FK,
  global_catalog_id uuid FK
)
```

---

## 2. Módulos del Sistema

### 2.1 Admin - Inventario (`/inventory`)

**Funcionalidad:**
- Lista todos los productos con stock del tenant
- Muestra columnas: Producto/SKU, Variante, En Mano, Reservado POS, Reservado Web, Disponible, Estado, Online
- Permite agregar/editar productos
- Busca por nombre o código de barras
- Filtra por estado (todos/activos/inactivos) y online (sí/no)
- Muestra imagen en miniatura (Cloudinary thumb)
- **Stock dinámico:** Disponible = `available - online_reserved` (si publicado)
- **Preview modal** para productos (vista previa de imagen)

**Columnas importantes:**
```tsx
// Fila de tablainventory/page.tsx:963-978
const onlineReserved = product?.online_reserved || 0;
constavailable = item.available || 0;
const posAvailable = product?.available_online 
  ? Math.max(0, available - onlineReserved)
  : available;
```

### 2.2 Admin - Catálogo Web (`/online-catalog`)

**Funcionalidad:**
- Controla qué productos se venden en la tienda online
- Estadísticas: Publicados, Stock Total, Reservado Web, Disp. POS
- Toggle publicar/despublicar (`available_online`)
- Configurar stock reservado para web (`online_reserved`)
- Muestra stats reales de pedidos e ingresos
- **Edit button:** navega a `/inventory?product={id}`

**Lógica de stock reservado:**
```tsx
// online-catalog/page.tsx:160-192
async function toggleOnlineAvailability(item) {
  await supabase.from('products').update({ 
    available_online: newValue 
  }).eq('id', item.product.id);
}

async function updateOnlineReserved(item, value) {
  const newReserved = Math.max(0, Math.min(value, item.available));
  await supabase.from('products').update({ 
    online_reserved: newReserved 
  }).eq('id', item.product.id);
}
```

### 2.3 Admin - Settings Store (`/settings/store`)

**Tabs:**
1. **General:** Nombre, URL, tagline, descripción, logo upload, banners (hasta 3)
2. **Apariencia:** Template, color, fuente, dark mode, live preview
3. **Envío:** Habilitar, costo, envío gratis desde, pedido mínimo
4. **Social:** WhatsApp, Instagram, Facebook

**Apariencia JSON:**
```tsx
interface Appearance {
  template: 'classic' | 'minimal' | 'list';
  theme_color: 'violet' | 'blue' | 'emerald' | 'rose' | 'amber' | 'slate';
  font_family: 'sans' | 'serif' | 'mono';
  dark_mode: boolean;
}
```

### 2.4 Tienda Online (`/tienda/[slug]`)

**Funcionalidad:**
- Muestra productos publicados (`available_online: true`)
- **Stock dinámico:** 
  - Si `online_reserved > 0`: usa eso como stock
  - Si `online_reserved = 0`: usa todo el inventario
- Valida stock antes de agregar al carrito
- 3 templates: 'classic', 'minimal', 'list'
- Soporta dark mode, fuentes, colores de tema
- Carousel de banners (hasta 3 imágenes)
- Checkout con datos de cliente y métodos de pago
- wh floating button

**Cálculo de stock online:**
```tsx
// tienda/[slug]/page.tsx:220-245
const stockByProduct[productId] = reserved > 0 ? reserved : onHand;

const addToCart = (product) => {
  const onlineStock = productStock[product.id] || 0;
  const inCart = cart.find(item => item.id === product.id)?.quantity || 0;
  if (inCart >= onlineStock) {
    alert('Stock máximo alcanzado');
    return;
  }
};
```

### 2.5 POS Terminal (`/pos/terminal`)

**Funcionalidad:**
- Lista productos con stock disponible
- **Stock = on_hand - online_reserved** (no puede vender lo reservado web)
- Carrito con validaciones
- Checkout con pagos (efectivo, transferencia, MP)
- Cierra jornada

```tsx
// pos/terminal/page.tsx:62-100
const posAvailable = Math.max(0, onHand - reserved);
```

---

## 3. Cloudinary - Imágenes

### URLs y presets

```tsx
// Cloudinary folders
const CLOUDINARY_FOLDER = {
  LOGO: 'obsidiana/{tenant_id}/logo',
  BANNERS: 'obsidiana/{tenant_id}/banners',
  PRODUCTS: 'obsidiana/{tenant_id}/products',
  GLOBAL_LIBRARY: 'obsidiana/global_library/',  // compartido
};

// Funciones de URL (lib/cloudinary.ts)
buildImageUrl(publicId, options?)
getThumbnailUrl(publicId)
getPreviewUrl(publicId)
uploadImageToCloudinary(file, options?)
```

### Global Library

```tsx
// lib/global-catalog.ts
async function findGlobalImage(barcode?: string, name?: string) {
  // Busca por barcode_ean13 o normalized_name
}
```

---

## 4. Variables de Entorno

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=docwuytkh
NEXT_PUBLIC_CLOUDINARY_API_KEY=281286337557641
NEXT_PUBLIC_CLOUDINARY_API_SECRET=...
```

---

## 5. Docker

```bash
# Contenedor de base de datos
docker run --name supabase_db_Obsidiana-Pro \
  -e POSTGRES_PASSWORD=postgres \
  -p 54322:5432 \
  -d supabase/ Postgres:latest
```

---

## 6. Estado Actual - Pendiente

### Por hacer:
1. ~~Testear flow de compra completo~~
2. ~~Confirmar que Cloudinary preset está creado~~
3. Testing de multidistribuidor
4. Reportes de ventas online vs POS

### Bugs conocidos:
- Checkbox `boolean | ""` type error en inventory (minor)
- Tenant type sin `store_appearance` (minor, no afecta runtime)

---

## 7. Rutas Importantes

| Ruta | Módulo |
|------|--------|
| `/inventory` | Admin - Inventario |
| `/online-catalog` | Admin - Catálogo Web |
| `/settings/store` | Admin - Config tienda |
| `/tienda/[slug]` | Store público |
| `/pos/terminal` | POS terminal |

---

## 8. Tipos TypeScript

```tsx
// Product desde tienda
interface Product {
  id: string;
  title: string;
  nombre: string;
  sku: string;
  precio: number;
  images: string[];
  available_online: boolean;
  online_reserved: number;
}

// Appearance para template
interface Appearance {
  template: 'classic' | 'minimal' | 'list';
  theme_color: 'violet' | 'blue' | 'emerald' | 'rose' | 'amber' | 'slate';
  font_family: 'sans' | 'serif' | 'mono';
  dark_mode: boolean;
}
```

---

## 9. Commands Útiles

```bash
# TypeScript check
cd apps/web && npx tsc --noEmit --skipLibCheck

# Dev server
cd apps/web && npm run dev

# Docker
docker ps  | Select-String "54322"
```

---

*Checkpoint creado: 2026-05-07*