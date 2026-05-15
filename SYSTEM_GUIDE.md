# 🌌 Guía Técnica de Obsidiana Pro

Este documento sirve como la fuente de verdad para el desarrollo. Define cómo trabaja el sistema y mantiene el contexto de las decisiones arquitectónicas.

## 🏗️ 1. Arquitectura de Datos (El Tridente)
El sistema de productos se divide en tres niveles para permitir flexibilidad (ej. un mismo producto con talles/colores diferentes):

1.  **Products**: Información general (Título, Descripción, Marca, Imágenes generales).
2.  **Product Variants**: La unidad de venta (SKU, Precio, Código de Barras/EAN, Peso).
3.  **Inventory Levels**: La existencia física. Controla `on_hand` (físico), `committed` (reservado) y `available` (lo que se puede vender).

## 🏢 2. Multi-Tenancy (Aislamiento)
Cada registro en la base de datos (excepto el Catálogo Global) tiene una columna `tenant_id`. 
*   **REGLA DE ORO**: Ninguna consulta debe ejecutarse sin filtrar por `.eq('tenant_id', tenant.id)`.
*   Esto garantiza que la Tienda A nunca vea las ventas o el stock de la Tienda B.

## 🌍 3. Catálogo Global e Imágenes
Para ahorrar espacio y tiempo, usamos una base de datos compartida:
*   **Identificador**: Código EAN-13 (Barcode).
*   **Flujo**: Si creas un producto con un código de barras que ya existe en el sistema, el sistema te sugerirá usar la imagen y descripción "Global". 
*   **Cloudinary**: Las imágenes se suben a `obsidiana/global_library` si son compartidas, o a `obsidiana/{tenant_id}/products` si son privadas.

## 🛒 4. Integración con Mercado Libre
El importador híbrido trabaja así:
1.  **Scrape**: Una API interna extrae título, precio y fotos de la URL de ML.
2.  **Live View (Proxy)**: Usamos `/api/proxy` para incrustar la página real de ML en un iframe. Esto permite al usuario ver el precio en vivo y corregirlo manualmente si el scraper detectó un precio mayorista o con descuento.

## 🛠️ Registro de Cambios Recientes (Session Fixes)

### 1. Estabilización de Base de Datos
*   **Clientes**: Corregido desajuste de columnas. Se usa `nombre` en lugar de `first_name/last_name`. Se usa `document_number` en lugar de `dni_cuit`.
*   **Productos**: Corregido desajuste en `product_variants`. Se eliminó la consulta a la columna `barcode` (inexistente en DB) y se usa `nombre` en lugar de `title`.
*   **Inventario**: La columna `available` se calcula ahora en tiempo real `(on_hand - committed)` para evitar errores de consulta si la columna generada no está presente.

### 2. Correcciones de Código
*   **POS**: Eliminados caracteres especiales en los `alert` que causaban errores de compilación (encoding).
*   **Terminal**: Alineado con el nuevo esquema de productos y variantes.

### 3. Solución de Memoria (Heap Out of Memory)
*   Si el sistema falla al arrancar, ejecutar:
    ```bash
    # Limpiar caché
    rm -rf apps/web/.next
    # Arrancar con más memoria
    $env:NODE_OPTIONS="--max-old-space-size=4096"; pnpm dev
    ```

---
**Próximos Pasos**:
1. Verificar si el usuario desea re-introducir la columna `barcode` en `product_variants` mediante una migración.
2. Validar el flujo de checkout con el nuevo mapeo de nombres de clientes.

---
*Este manual debe actualizarse al finalizar cada sesión de desarrollo.*

## 📌 Próximos Pasos (Pendientes para mañana)
1.  **Verificación de Errores Reales**: Revisar la consola del POS tras los nuevos logs para identificar la causa exacta del fallo de variantes (posiblemente políticas RLS).
2.  **Prueba de Fuego del Buscador**: Validar con el usuario si las 5 sugerencias del catálogo global son suficientes o si necesitamos integrar búsqueda directa en Mercado Libre como fallback.
3.  **Auditoría de Cloudinary**: Si el usuario reporta fallos en subida, verificar el "Unsigned Preset" en su panel de Cloudinary.
