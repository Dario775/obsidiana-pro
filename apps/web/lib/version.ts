export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  type: 'major' | 'minor' | 'patch';
  description: string;
  changes: {
    type: 'feat' | 'fix' | 'style' | 'perf' | 'security';
    text: string;
  }[];
}

export const CURRENT_VERSION = '1.2.0';

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.2.0',
    date: '2026-05-26',
    title: 'Módulo de Fidelización y Segmentación Inteligente',
    type: 'minor',
    description: 'Implementación del CRM avanzado con motor de segmentación dinámico y programa de puntos por compras de clientes en tiempo real conectado directamente a Supabase Cloud.',
    changes: [
      { type: 'feat', text: 'Segmentación de clientes automatizada y filtros dinámicos basados en la base de datos de Supabase.' },
      { type: 'feat', text: 'Programa de acumulación y canje de puntos con reglas de conversión configurables en tiempo real.' },
      { type: 'style', text: 'Modales premium y notificaciones adaptados a la estética Obsidian de alta fidelidad, eliminando alertas de navegador antiguas.' },
      { type: 'perf', text: 'Alineación de datos e indexación relacional en Supabase para listado de clientes de alto rendimiento.' }
    ]
  },
  {
    version: '1.1.5',
    date: '2026-05-26',
    title: 'Auditoría Integral y Blindaje de Seguridad del POS',
    type: 'patch',
    description: 'Actualización crítica de seguridad del módulo de ventas POS, protecciones de stock ante ventas concurrentes y optimización de base de datos.',
    changes: [
      { type: 'security', text: 'Políticas RLS en Supabase para blindar cierres de caja e historiales de transacciones POS.' },
      { type: 'perf', text: 'Eliminación de consultas recursivas e ineficientes en el listado de inventario del POS.' },
      { type: 'fix', text: 'Control de concurrencia pesimista en stock durante el checkout para evitar discrepancias de inventario en ventas simultáneas.' },
      { type: 'style', text: 'Reemplazo de alertas nativas de JavaScript con modales premium integrados con sugerencia inteligente de apertura de caja.' }
    ]
  },
  {
    version: '1.1.0',
    date: '2026-05-25',
    title: 'Corte Z de Caja y Conciliación Multi-Método',
    type: 'minor',
    description: 'Módulo de conciliación financiera avanzado con reportes automáticos de cierre de caja (Corte Z).',
    changes: [
      { type: 'feat', text: 'Conciliación automatizada de efectivo, transferencias y tarjetas en cierres diarios.' },
      { type: 'feat', text: 'Historial detallado de sesiones de caja con auditoría de cobros.' }
    ]
  },
  {
    version: '1.0.0',
    date: '2026-05-20',
    title: 'Lanzamiento Oficial Obsidiana',
    type: 'major',
    description: 'Primera versión estable de Obsidiana con todos los módulos de retail integrados.',
    changes: [
      { type: 'feat', text: 'Terminal POS táctil e intuitiva con soporte offline parcial.' },
      { type: 'feat', text: 'Gestión unificada de inventario con alertas de bajo stock.' },
      { type: 'feat', text: 'Sincronización automatizada con la tienda online y catálogo interactivo.' }
    ]
  }
];
