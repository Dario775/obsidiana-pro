# Auditoría de Proyecto: Obsidiana-Pro (Versión Retail Directo)

Este documento resume el estado actual del proyecto tras la migración del sistema de integración de Mercado Libre (vía API) hacia un modelo de **Afiliados Manuales (vía Scrape)**.

## 1. Cambios en la Arquitectura de Datos
Se ha eliminado la deuda técnica relacionada con APIs de terceros y tokens de acceso complejos.

- **Tablas Eliminadas**: `ml_products`, `ml_clicks_log`.
- **Columnas Eliminadas**: Todas las referencias a tokens y configuraciones de ML en la tabla `tenants`.
- **Nueva Estructura**: Se añadió la columna `external_url` (text) a la tabla `products` para soportar cualquier plataforma de afiliados.

## 2. Funcionalidades Backend
El backend ahora es más ligero y mantenible.

- **API de Scrape (`/api/ml/scrape`)**: 
  - Utiliza `User-Agent` de navegador para simular visitas.
  - Extrae metadatos (OG Tags) para automatizar la creación de productos: Título, Precio, Descripción e Imágenes.
  - Funciona con Mercado Libre y es extensible a otros marketplaces.
- **Eliminación de APIs Obsoletas**: Se borraron las rutas de autenticación (`/auth`), configuración (`/config`) y búsqueda de ML (`/search`).

## 3. Experiencia del Administrador (Panel)
- **Importación Inteligente**: En el Catálogo Web, se añadió la herramienta "Importar desde Link". Permite previsualizar los datos antes de crear el producto localmente.
- **Limpieza de UI**: Se eliminaron todos los menús de configuración de Mercado Libre que generaban ruido visual.

## 4. Experiencia del Cliente (Tienda)
- **Botón Dinámico**: El sistema detecta automáticamente si un producto es de stock local o externo.
  - **Stock Local**: Botón "Agregar al carrito" normal.
  - **Stock Externo**: Botón "Comprar ahora" con redirección directa al link de afiliado.
- **Diseño Premium**: El botón externo utiliza los colores característicos de ML para generar confianza en el comprador.

## 5. Estabilidad y Acceso Local
Se han corregido problemas críticos de inicio de sesión detectados durante el desarrollo local:
- **Fallback de Tenant**: El sistema de login ahora es robusto ante "resets" de base de datos. Si el usuario no tiene metadatos en su sesión, el sistema consulta directamente la base de datos para recuperar su negocio.
- **Guardias de Seguridad**: Los componentes `PlatformGuard` y `useTenant` ahora validan correctamente los permisos de Super Admin consultando la base de datos local en tiempo real.

## 6. Pasos para GitHub y Despliegue
1. **Migrations**: Las migraciones `20260511170105` y `20260511171604` deben ejecutarse en producción para reflejar el nuevo esquema.
2. **Secrets**: No se requieren nuevos secretos (API Keys) de Mercado Libre, lo que simplifica enormemente el archivo `.env`.
3. **Limpieza de Git**: El `.gitignore` está configurado para evitar subir archivos temporales de SQL o scripts locales.

---
**Estado del Proyecto**: 🟢 Estable y listo para producción.
**Dependencias Externas**: ⚪ Ninguna (Independiente de Mercado Libre API).
