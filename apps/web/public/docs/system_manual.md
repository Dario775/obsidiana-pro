# Manual Global de Funcionalidades - Obsidiana
> **Rol del Chatbot**: Sos un asistente virtual experto integrado dentro del panel administrativo de **Obsidiana**. Tu objetivo es asistir de manera clara, precisa y profesional a los administradores y personal de las tiendas en el uso diario de la plataforma. Debes adaptar tus respuestas al contexto de la tienda (`tenant`) y mantener siempre un tono servicial, técnico y resolutivo.

---

## Índice
1. [Punto de Venta (POS) y Terminal de Caja](#1-punto-de-venta-pos-y-terminal-de-caja)
2. [Sincronización con Mercado Libre](#2-sincronizacion-con-mercado-libre)
3. [Inventario, Kardex y Stock Crítico](#3-inventario-kardex-y-stock-critico)
4. [E-commerce Propio (Tienda Pública)](#4-e-commerce-propio-tienda-publica)
5. [Gestión de Clientes y Cuenta Corriente](#5-gestion-de-clientes-y-cuenta-corriente)
6. [Suscripciones, Facturación y Límites](#6-suscripciones-facturacion-y-limites)
7. [Centro de Asistencia y Contacto](#7-centro-de-asistencia-y-contacto)

---

## 1. Punto de Venta (POS) y Terminal de Caja

El Punto de Venta (POS) permite facturar de manera rápida e intuitiva a clientes en el local físico.

### Funcionalidades Clave:
* **Búsqueda e Incorporación de Productos**: Se pueden agregar productos escribiendo su nombre, código SKU o utilizando un lector de códigos de barras.
* **Control Inteligente de Variantes**: Al seleccionar un producto con variantes (por ejemplo: talles, colores, presentaciones), el sistema desplegará las opciones. Aquellas variantes **sin stock** aparecen desactivadas de forma evidente para evitar ventas accidentales.
* **Proceso de Cobro (Checkout)**: 
  * Se pueden seleccionar múltiples formas de pago: **Efectivo**, **Tarjeta de Débito/Crédito**, o cobro automatizado por **Mercado Pago** (mediante código QR dinámico).
  * Es posible asignar la venta a un cliente registrado para acumular historial o imputar el saldo en su cuenta corriente.
* **Arqueo y Cierre de Caja**:
  * Accesible en la ruta `/pos/closure` o desde la pestaña de Caja.
  * Permite registrar el saldo inicial, las ventas del turno clasificadas por método de pago, y realizar retiros o ingresos manuales de efectivo.
  * Al finalizar la jornada, se genera un reporte resumido del cierre listo para imprimir o enviar por PDF.

---

## 2. Sincronización con Mercado Libre

Obsidiana permite importar catálogos enteros y sincronizar precios y stock desde Mercado Libre sin requerir credenciales API complejas de afiliación gracias a su motor inteligente de scraping.

### Procedimiento de Importación:
1. Ir al módulo de **Catálogo Online > Sincronización**.
2. Copiar y pegar el enlace directo del producto de Mercado Libre en el campo de importación.
3. El sistema extraerá de forma automática:
   * Nombre del producto.
   * Descripción y fotografías en alta definición.
   * Variantes activas (talles, colores, etc.).
   * Precio de venta sugerido y niveles de stock.
4. Presionar "Importar" para consolidar el producto en la base de datos de la tienda local. 

---

## 3. Inventario, Kardex y Stock Crítico

La gestión de stock centralizada permite tener visibilidad en tiempo real de la mercadería disponible en múltiples sucursales.

### Control de Movimientos (Kardex):
* Cada variación en el inventario queda registrada con fecha, hora, tipo de movimiento (Venta POS, Ingreso Manual, Transferencia entre sucursales, Ajuste de Inventario) y el usuario responsable.
* Esto previene pérdidas y facilita auditorías de caja.

### Alertas de Stock Crítico:
* Configurable desde **Configuración > Alertas de Stock**.
* Permite definir un umbral mínimo por producto. Cuando las existencias caen por debajo de ese límite, el sistema emite una notificación visual prioritaria en el panel administrativo y bloquea la preventa si está configurado para no vender sin stock físico.

---

## 4. E-commerce Propio (Tienda Pública)

Toda tienda en Obsidiana recibe una plataforma e-commerce autoadministrable bajo la ruta `tienda/[slug]` que comparte base de datos en tiempo real con el inventario físico del local.

### Características:
* **Diseño Premium Adaptable**: Interfaz moderna de catálogo, con categorización, barra de búsqueda y filtros.
* **Carrito y Checkout a WhatsApp**: Los clientes agregan productos al carrito y el checkout les permite enviar el pedido directamente al WhatsApp del comercio detallando el listado, los precios e información de entrega.
* **Dominios Personalizados**: Desde **Configuración > Dominio**, el administrador puede vincular su propio dominio web (ej. `www.mitienda.com`) apuntando a la infraestructura de la plataforma.

---

## 5. Gestión de Clientes y Cuenta Corriente

Obsidiana cuenta con un CRM básico integrado para registrar información y comportamiento de compra.

### Cuenta Corriente (Saldo Pendiente):
* Ideal para ventas bajo modalidad "Fiar" o facturación diferida.
* Permite definir un **Límite de Crédito** para cada cliente.
* Si el cliente no registra ventas previas, el sistema inicializa su Cuenta Corriente con saldo en cero y muestra un estado libre de errores.
* Los pagos o entregas a cuenta se registran como cobros parciales que reducen la deuda acumulada del cliente en tiempo real.

---

## 6. Suscripciones, Facturación y Límites

El control del plan contratado se maneja de forma centralizada en la ruta `/settings/billing`.

### Planes Disponibles:
* **Plan Free**: Acceso básico a POS, límite estricto de productos cargados (hasta 50) y 1 sola sucursal física. Sin e-commerce propio.
* **Plan Pro**: Productos ilimitados, multisucursal, e-commerce activo, dominio personalizado y analíticas avanzadas de negocio.

### Métodos de Pago del Plan:
* **Automático (Mercado Pago)**: Cobro recurrente debitado mensualmente.
* **Transferencia Bancaria Directa**: Permite copiar el CBU/CVU de Obsidiana, realizar la transferencia y adjuntar el comprobante digital en el mismo formulario para que la administración lo apruebe.

---

## 7. Centro de Asistencia y Contacto

Para cualquier inconveniente técnico, dudas sobre el uso de la aplicación o sugerencias de desarrollo, los usuarios disponen del **Centro de Asistencia** integrado en el botón "Asistencia" de su panel superior:

* **Soporte Express vía WhatsApp**: Enlace directo para chatear con un operador con plantilla pre-cargada con los datos de su cuenta.
* **Canal por Correo Electrónico**: Envíos de incidencias a **`ayuda@obsidiana.com.ar`**. El sistema autogenera una cabecera técnica con el identificador del comercio (`tenant_id`), el correo del administrador, y la URL actual para que el equipo de soporte reproduzca y solucione el problema ágilmente.
