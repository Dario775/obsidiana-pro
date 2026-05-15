# Obsidiana Pro - Sistema checkpoint

> Fecha: 2026-05-14
> Estado: Infraestructura SaaS Robusta - Activación de Planes Corregida ✅

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
  plan_started_at timestamp
)
```

### Seguridad y Consistencia
- **Sincronización de Tipos**: Se corrigieron los archivos de esquema (`schema.sql`, `supabase_schema_complete.sql`) para asegurar que `plan_id` sea `text` en todas las tablas, permitiendo el matching con los nuevos IDs de planes.
- **Activación Robusta**: Se refactorizó la lógica de aprobación en el Super Admin para asegurar que el Tenant se actualice *antes* de marcar el pago como completado, con manejo de errores explícito.

---

## 2. Módulos del Sistema (Novedades)

### 2.1 Super Admin Dashboard (`/(platform)`) - ACTUALIZADO ✅
- **Aprobación Dinámica**: La verificación de pagos ahora activa automáticamente el plan, actualiza la fecha de vencimiento (`paid_until`) y la fecha de inicio del plan (`plan_started_at`).
- **Manejo de Errores**: Se añadieron alertas informativas si la actualización del tenant falla durante la aprobación.
- **Fallbacks de Seguridad**: Si un pago no especifica un `plan_id`, el sistema intenta mantener el plan actual del tenant como fallback durante la renovación.

### 2.2 Panel de Facturación del Merchant (`/settings/billing`) - ACTUALIZADO ✅
- **Notificación de Pago**: Los merchants pueden informar transferencias adjuntando comprobantes, los cuales se guardan correctamente con el `plan_id` solicitado.

---

## 3. Lógica de Negocio y Cumplimiento

### 3.1 Activación Automática ✅
- **Onboarding**: Toda tienda nueva registrada queda automáticamente asignada al plan **`free`** por defecto (configurado a nivel de base de datos).
- **Flujo de Pago**: Merchant paga -> Super Admin aprueba -> Tenant recibe nuevo `plan_id` y `paid_until` + 1 mes -> Acceso inmediato a nuevas funcionalidades y límites.

---

## 4. Estado de Desarrollo

### ✅ Completado recientemente:
- [x] **Fix de Activación de Planes**: Corregida la lógica en `handleVerifyPayment` que impedía el cambio de plan tras la aprobación.
- [x] **Sincronización de Esquema de Pagos**: Añadidas columnas faltantes (`plan_id`, `proof_url`) a los archivos de esquema maestro.
- [x] **Consistencia de Tipos (UUID vs TEXT)**: Unificados los campos de `plan_id` en toda la base de datos.

### 🚀 Próximos Pasos (Prioridad):
1. **Google Auth**: Implementar autenticación via Google con Supabase.
2. **Impersonation**: Botón "Entrar como Tenant" para soporte técnico directo.
3. **Audit Logs**: Registro de cambios críticos en configuraciones de planes.

---

## 5. Comandos Útiles
```bash
# Iniciar servidor de desarrollo
npm run dev

# Sincronizar esquema local
# supabase db reset
```

*Última actualización: 2026-05-14 - Obsidiana Pro Team*