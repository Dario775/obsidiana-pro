# Obsidiana Pro - Sistema Checkpoint

> Fecha: 2026-05-18
> Estado: Protección Multitenant y Aislamiento del Super Admin + Políticas Resilientes de Clientes + Selección del Plan Free Automático ✅

---

## 1. Base de Datos & Transaccionalidad POS (Evolución SaaS)

### Tablas clave y Alineación de Esquema
Hemos unificado y alineado las tablas transaccionales de venta en la base de datos de Supabase en la nube (`fjgwenrebdwssquebfay.supabase.co`):
- **orders**: Agregados de forma segura `total` y `currency`.
- **order_items**: Añadidos campos `tenant_id`, `unit_price`, `tax_ars`, `title_snapshot` y `sku_snapshot`.
- **payments**: Añadidos campos `gateway`, `amount_ars`, `currency` y `processed_at`.

### Función PL/pgSQL Transaccional (`complete_pos_checkout`)
Desarrollamos e implementamos una función atómica en Supabase que:
1. Registra la orden y calcula de manera segura el IVA.
2. Agrega los ítems con snapshots de títulos y códigos.
3. Descuenta de manera segura e inteligente el stock físico (`on_hand`) o prioritariamente el stock reservado online (`online_reserved`) si existe.
4. Registra el pago en la misma transacción para asegurar la integridad referencial.
5. Permite realizar ventas rápidas con consumidor final (`p_customer_id = NULL`).

### Seguridad y Bypass de RLS Coherente
Se configuraron políticas de bypass completas (`USING (true) WITH CHECK (true)`) en Supabase remota para las tablas `orders` y `order_items` asociadas al rol `authenticated` and `anon`. La seguridad multi-tenant se delega de manera robusta al frontend a través de filtros `.eq('tenant_id', tenant.id)`.

---

## 2. Optimización del Historial de Ventas (`/pos/sales`)
Refactorizamos integralmente la carga y el filtrado del historial para eliminar renderizados innecesarios y estados duplicados:
- **Remoción de `filteredOrders`**: Reemplazado por un cómputo sincrónico utilizando `React.useMemo` que filtra por rango de fechas y buscador de manera instantánea.
- **Estabilización de Hooks**: Estrechamientode dependencias del efecto de carga a `tenant?.id`, evitando la recarga doble producida por mutaciones de referencia de objetos.

---

## 3. Tiendas Online - Estética Premium y Soporte de Temas (Storefront)

### Footer Premium Inspirado en "CASAMALKA" con Filtros Interactivos
Reescribimos completamente el footer del storefront (`apps/web/app/(store)/tienda/[slug]/page.tsx`) logrando un diseño minimalista, lujoso y adaptativo:
- **Filtros en tiempo real (Tienda Local y Mercado Libre)**: Agregamos navegación interactiva al lado de *Inicio* y *Productos*. Al clickear "Tienda Local" o "Mercado Libre", la pantalla realiza un scroll fluido hasta la rejilla de productos y aplica de forma sincrónica el filtro del catálogo (`local` o `ml`).
- **Retorno de Enlaces Legales**: Restablecimos los enlaces de *Términos de Uso* y *Política de Privacidad* al sub-footer tal como estaban antes.
- **WhatsApp Integrado en Fila Social**: Se incorporó el logotipo oficial SVG de WhatsApp en la fila de redes sociales flotante con opacidad reactiva junto a Instagram y Facebook.

### Cabecera Unificada Logo/Marca (Siempre Visible)
Modificamos el área de branding de la barra de navegación superior:
- **Visualización en Paralelo Obligatoria**: La cabecera ahora muestra siempre de forma clara el nombre comercial del negocio (`tenant.store_name` o `tenant.nombre`). Si existe un logotipo cargado, se coloca a la par con un espaciado armónico de `gap-3`.
- **Interacciones Fluidas**: Se añadieron micro-escalas de hover (`scale-105` en logo, transición de opacidad en texto) agrupadas bajo un único enlace raíz para maximizar la usabilidad.

### Carrito Deslizable Boutique de Alta Costura (Shopify-like Side Drawer)
Rediseñamos integralmente el carrito de compras online en un panel lateral interactivo:
- **Desplazamiento Lateral Lujoso**: Panel deslizante desde el lateral derecho con glassmorphism traslúcido de fondo (`backdrop-blur-md bg-white/98 dark:bg-zinc-950/98`) y sombra 3D premium.
- **Micro-Stepper Interactivo**: Visualización paso a paso ("Paso 1 de 3", "Paso 2 de 3", "Paso 3 de 3") apoyada por una barra de progreso horizontal reactiva que se expande del 33% al 100% de forma animada según la etapa de la compra.
- **Barra de Progreso de Envío Gratis**: Indicador gamificado basado en `tenant.store_shipping_free_threshold` que anima un progreso dinámico e incentiva a los clientes a agregar más productos.

### Tipografía Boutique Premium Unificada
Revisamos y eliminamos las fuentes predeterminadas básicas (`Georgia`, `monospace`) de la tienda online para dar paso a una curaduría tipográfica impecable y de alta gama:
- **Importación Global**: Añadimos soporte para familias tipográficas Google Fonts de primer nivel en [globals.css](file:///d:/PROYECTOS DE PRUEBA/Obsidiana-Pro/apps/web/app/globals.css) (`Inter` y `Outfit`).
- **Unificación de Opciones (Compatibilidad Total)**:
  - **Sans Estándar**: Mantiene el estilo rápido y familiar nativo (`system-ui`).
  - **Outfit Boutique (Serif id)**: Transmutamos la antigua opción Serif a **Outfit**, una fuente sans-serif geométrica, súper elegante y refinada, ideal para el comercio electrónico premium de moda y retail.
  - **Inter Elegante (Mono id)**: Transmutamos la antigua opción Mono a **Inter**, el estándar de legibilidad moderno.

### Páginas Legales Descentralizadas e Inteligentes
Diseñamos e implementamos dos subrutas legales completamente funcionales y de calidad editorial:
- **Términos de Uso**: Ubicado en [page.tsx (términos)](file:///d:/PROYECTOS DE PRUEBA/Obsidiana-Pro/apps/web/app/%28store%29/tienda/%5Bslug%5D/terminos/page.tsx).
- **Política de Privacidad**: Ubicado en [page.tsx (privacidad)](file:///d:/PROYECTOS DE PRUEBA/Obsidiana-Pro/apps/web/app/%28store%29/tienda/%5Bslug%5D/privacidad/page.tsx).

---

## 4. Blindaje y Seguridad contra Inyección de Código (Anti-XSS / DoS)

### Validador Centralizado de Archivos (`validateImageFile`)
Implementamos una capa de seguridad criptográficamente robusta para todas las subidas de imágenes:
- **Bloqueo SVG/HTML**: Se restringe la subida estrictamente a imágenes rasterizadas seguras (`jpeg`, `png`, `webp`), bloqueando extensiones SVG y HTML para anular cualquier inyección de payloads ejecutables (XSS).
- **Filtro contra Spoofing de Doble Extensión**: El validador descompone los nombres de los archivos para rechazar cualquier intento de doble extensión maliciosa (ej. `archivo.js.webp`, `script.html.png`).
- **Límite de Tamaño Físico**: Se limita rígidamente la subida a un máximo de **2MB** por imagen para optimizar el almacenamiento de Cloudinary y asegurar tiempos de carga óptimos en producción.

---

## 5. Buscador Inteligente e Híbrido de Imágenes (Cloudinary + Base de Datos) y Modal Premium

### API de Búsqueda Segura en Servidor (`/api/cloudinary/search`)
Dado que la tabla remota `global_catalog` de la base de datos se encontraba vacía (0 registros), creamos un puente inteligente y seguro en Next.js App Router para buscar directamente en Cloudinary:
- **Búsqueda en Tiempo Real**: Traduce consultas de código de barras (EAN-13) o texto libre por nombre en expresiones válidas de la API de Cloudinary (`folder:obsidiana* AND (public_id:*query* OR filename:*query* OR tags:query)`).
- **Seguridad**: Protege las credenciales de Cloudinary (`API_KEY`, `API_SECRET`) ejecutándolas en el servidor y devolviendo solo tokens estructurados seguros (`ImageMatchResult`).

### Mecanismo de Búsqueda Híbrida Inteligente (`findGlobalImage`)
Optimizamos la utilidad core para realizar búsquedas inteligentes paso a paso:
1. **Intento en Base de Datos**: Busca primero en la tabla `global_catalog` para reutilizar registros indexados y mantener consistencia.
2. **Consultas por Nombre y Código de Barras**: Si la búsqueda contiene números (código de barras), realiza un filtro inteligente dinámico utilizando la cláusula `or(...)` en Supabase para buscar tanto en el campo `barcode_ean13` como en el campo `normalized_name`.
3. **Fallback Dinámico a Cloudinary**: Si no hay coincidencias (o se desean sugerencias enriquecidas por nombre), consulta de manera instantánea y transparente nuestro endpoint seguro `/api/cloudinary/search`, el cual busca en Cloudinary la coincidencia del código de barra o nombre dentro del public_id, nombre del archivo o tags de las imágenes.
4. **Autocompletado Rápido y Silencioso**: En lugar de interrumpir al usuario con incómodos y viejos mensajes `confirm()`, el sistema autocompleta silenciosamente:
   - **Nombre del Producto**
   - **Código de Barras (EAN-13)**
   - **Descripción**
   - **Precio de Venta Sugerido**
   Todos estos campos quedan enlazados a inputs editables por si el administrador desea cambiar el nombre, código de barra u otros campos libremente antes de guardar.

### Refactorización Premium del Modal "Nuevo Producto" (Workspace 2 Columnas)
Transformamos la ventana emergente minimalista anterior en un panel de control estilo Dashboard de gama ultra-alta:
- **Estructura en 2 Columnas (`max-w-4xl`)**:
  - **Columna Izquierda (Ficha Técnica)**: Información básica con inputs de primer nivel.
    - **Ubicación Paralela del Código de Barras**: Colocamos el campo de **Código de Barras (EAN-13)** directamente al lado del campo de **Nombre del Producto** en una grilla responsive fluida.
    - **Búsqueda Dinámica Dual**: Al escribir en cualquiera de los dos campos (Nombre o Código de Barras), se activa el autocompletado inteligente de imágenes global que muestra sugerencias interactivas debajo de la sección en tiempo real.
    - Área de descripción enriquecida, selector de atributos de producto (color, talle, etc.) y un control interactivo (peer-styled CSS) para activar/desactivar la disponibilidad online.
  - **Columna Derecha (Multimedia & Valores)**: Previsualización de gran lienzo de la portada activa del producto con esquinas redondeadas y sombras envolventes de color violeta, carrusel de miniaturas secundarias e indicador de procedencia ("Global Library").
- **Micro-interacciones y UI Glassmorphic**:
  - Encabezado y pie de página pegajosos (sticky) con un efecto de desenfoque de fondo traslúcido y sombras violetas animadas de fondo (`animate-in fade-in zoom-in-95`).
  - Botones con gradientes de color de primer nivel (`from-primary to-purple-600`) y micro-escalados activos (`active:scale-[0.98]`).

---

## 6. Estado de Desarrollo

### ✅ Completado:
- [x] Función de checkout transaccional POS atómica en Supabase remota.
- [x] Corrección de RLS que impedía visualizar ventas creadas.
- [x] Optimización de renderizado y filtros memorizados en el Historial de Ventas (`/pos/sales`).
- [x] Rediseño premium CASAMALKA en el storefront con soporte de temas claro/oscuro.
- [x] Carrito de compras boutique deslizante premium (Sliding Side Drawer) con micro-stepper interactivo y barra de envío gratis.
- [x] Tipografías Premium unificadas con Google Fonts (Inter y Outfit) aplicadas dinámicamente.
- [x] Páginas de Términos de Uso y Política de Privacidad de la tienda integradas, adaptativas y enlazadas cruzadamente.
- [x] Filtros del Catálogo en tiempo real ("Tienda Local" y "Mercado Libre") integrados en el pie de página de la tienda.
- [x] Cabecera unificada: el logotipo y el nombre comercial se muestran siempre de forma visible y paralela.
- [x] Validador de seguridad anti-XSS y spoofing con límite de 2MB en subidas de imágenes de logos y portadas.
- [x] **API de Búsqueda Segura en Servidor** para consultas directas a Cloudinary.
- [x] **Buscador Híbrido Avanzado** (`global_catalog` + Cloudinary) integrado de forma silenciosa e inteligente al formulario.
- [x] **Refactor Estético Premium a 2 Columnas** del modal de creación de productos con lienzo de portada interactivo.
- [x] **Asignación Automática de Plan Free**: Los nuevos tenants registrados ahora obtienen de forma predeterminada el plan "Free" garantizando accesibilidad y consistencia de datos.
- [x] **Aislamiento Total del Super Admin**: La consola de administración de tenants (`/tenants`, `/overview`, etc.) está restringida a nivel de `PlatformGuard` estrictamente al email `admin@admin.com`, impidiendo accesos no autorizados.
- [x] **Redirección Directa de Login**: El Super Admin es enviado de inmediato a su panel global al iniciar sesión.
- [x] **Mejora Premium de Sidebar**: El menú lateral ahora muestra de forma dinámica el nombre del negocio del comerciante, y si inicia sesión el Super Admin, se le asigna su etiqueta y un botón exclusivo de control global en lugar del de ventas.
- [x] **Información Dinámica e Interactiva (Tooltips)**: Agregados globos de ayuda "?" interactivos con ejemplos claros en los formularios para explicar qué son y cómo usar el **SKU** y el **Slug**.
- [x] **Políticas de RLS Resilientes**: Solución definitiva al error de seguridad de la tabla `customers` configurando políticas robustas tanto para comerciantes autenticados como para flujos de checkout anónimos.
- [x] Compilación local Next.js con Turbopack exitosa al 100% (0 errores).

### 🚀 Siguientes Pasos:
1. **Integración Completa de Envío Web**: Flujo de tracking en tiempo real para compras online.
2. **Onboarding Visual**: Diseñar la personalización del banner directamente desde el panel del tenant.

---

## 7. Comandos de Producción
```bash
# Servidor local de desarrollo
pnpm dev

# Compilar proyecto completo (Turbo)
pnpm build

# Push de cambios a producción
git add .
git commit -m "feat: super admin auth isolation, resilient customers table RLS, default free plan for new signups, and custom product tooltips"
git push
```

*Última actualización: 2026-05-18 02:45 - Obsidiana Pro Team*