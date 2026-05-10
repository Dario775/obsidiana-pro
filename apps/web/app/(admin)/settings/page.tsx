'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTenant } from '../../../hooks/use-tenant';
import { supabase } from '../../../lib/supabase';

interface SettingsCard {
  title: string;
  description: string;
  icon: string;
  href: string;
  color: string;
}

export default function SettingsPage() {
  const { tenant, loading: tenantLoading } = useTenant();
  const [businessName, setBusinessName] = useState('');
  const [cuit, setCuit] = useState('');
  const [ivaCondition, setIvaCondition] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (tenant) {
      setBusinessName(tenant.nombre || '');
      setCuit(tenant.cuit || '');
      setIvaCondition(tenant.condicion_iva || '');
    }
  }, [tenant]);

  const settingsCards: SettingsCard[] = [
    {
      title: 'Datos del Negocio',
      description: 'Razón social, CUIT, condición IVA y datos fiscales',
      icon: 'business',
      href: '/settings/business',
      color: 'violet',
    },
    {
      title: 'Planes y Suscripción',
      description: 'Gestioná tu plan, tiempo restante y historial de pagos',
      icon: 'workspace_premium',
      href: '/settings/billing',
      color: 'emerald',
    },
    {
      title: 'Sucursales',
      description: 'Gestión de puntos de venta y ubicaciones',
      icon: 'store',
      href: '/settings/branches',
      color: 'blue',
    },
    {
      title: 'Usuarios y Permisos',
      description: 'Administración de acceso y roles',
      icon: 'group',
      href: '/settings/permissions',
      color: 'amber',
    },
    {
      title: 'Alertas de Stock',
      description: 'Configurar niveles mínimos de inventario',
      icon: 'inventory_2',
      href: '/settings/stock-alerts',
      color: 'red',
    },
    {
      title: 'Tienda Online',
      description: 'Personalización y configuración del e-commerce',
      icon: 'language',
      href: '/settings/store',
      color: 'violet',
    },
    {
      title: 'Productos ML',
      description: 'Importar productos de Mercado Libre',
      icon: 'shopping_cart',
      href: '/settings/ml-products',
      color: 'amber',
    },
    {
      title: 'Atributos de Producto',
      description: 'Tallas, colores y variantes para la tienda online',
      icon: 'layers',
      href: '/settings/attributes',
      color: 'pink',
    },
  ];

  async function saveBusinessSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase
        .from('tenants')
        .update({
          nombre: businessName,
          cuit: cuit,
          condicion_iva: ivaCondition,
        })
        .eq('id', tenant?.id);

      if (error) throw error;
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving:', error);
      alert('Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-white">Ajustes Globales</h1>
          <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">
            Configurá los aspectos globales de tu cuenta
          </p>
        </div>
      </div>

      {/* Quick Settings - Business Info */}
      <div className="bg-zinc-900 border border-white/5 rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-violet-400 text-2xl">business</span>
          <h2 className="text-sm font-black text-white uppercase tracking-widest">Datos del Negocio</h2>
        </div>
        
        <form onSubmit={saveBusinessSettings} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">Nombre / Razón Social</label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              placeholder="Nombre de tu negocio"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">CUIT</label>
            <input
              type="text"
              value={cuit}
              onChange={(e) => setCuit(e.target.value)}
              className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              placeholder="XX-XXXXXXXX-X"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">Condición IVA</label>
            <select
              value={ivaCondition}
              onChange={(e) => setIvaCondition(e.target.value)}
              className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            >
              <option value="">Seleccionar...</option>
              <option value="responsable_inscripto">Responsable Inscripto</option>
              <option value="monotributista">Monotributista</option>
              <option value="consumidor_final">Consumidor Final</option>
              <option value="exento">Exento</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={saving}
              className="w-full px-4 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <span className="material-symbols-outlined animate-spin">sync</span>
                  Guardando...
                </>
              ) : saved ? (
                <>
                  <span className="material-symbols-outlined">check</span>
                  Guardado!
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">save</span>
                  Guardar
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {settingsCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="bg-zinc-900 border border-white/5 hover:border-white/10 rounded-xl p-6 space-y-4 transition-all hover:scale-[1.02] group"
          >
            <div className={`w-12 h-12 rounded-xl bg-${card.color}-500/20 flex items-center justify-center`}>
              <span className={`material-symbols-outlined text-${card.color}-400 text-2xl`}>{card.icon}</span>
            </div>
            <div>
              <h3 className="text-white font-black text-lg">{card.title}</h3>
              <p className="text-zinc-500 text-sm mt-1">{card.description}</p>
            </div>
            <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium group-hover:text-white transition-colors">
              <span>Configurar</span>
              <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Danger Zone */}
      <div className="bg-red-950/20 border border-red-500/20 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="material-symbols-outlined text-red-400 text-2xl">warning</span>
          <h2 className="text-sm font-black text-red-400 uppercase tracking-widest">Zona de Peligro</h2>
        </div>
        <p className="text-zinc-400 text-sm mb-4">
          Estas acciones son irreversibles. Procedé con cautela.
        </p>
        <div className="flex gap-3">
          <button 
            onClick={async () => {
              if (!tenant?.id) return;
              try {
                // Export all business data as JSON
                const [products, orders, customers, inventory] = await Promise.all([
                  supabase.from('products').select('*').eq('tenant_id', tenant.id),
                  supabase.from('orders').select('*, order_items(*)').eq('tenant_id', tenant.id),
                  supabase.from('customers').select('*').eq('tenant_id', tenant.id),
                  supabase.from('inventory_levels').select('*, product_variants(sku, barcode)').eq('tenant_id', tenant.id),
                ]);

                const exportData = {
                  exported_at: new Date().toISOString(),
                  tenant: { id: tenant.id, nombre: tenant.nombre, slug: tenant.slug },
                  products: products.data || [],
                  orders: orders.data || [],
                  customers: customers.data || [],
                  inventory: inventory.data || [],
                };

                const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `obsidiana-export-${tenant.slug}-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
              } catch (err) {
                console.error('Export error:', err);
                alert('Error al exportar datos');
              }
            }}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            Exportar Datos
          </button>
          <button 
            onClick={() => {
              const confirmed = window.confirm(
                '⚠️ ¿Estás seguro que querés eliminar tu cuenta?\n\n' +
                'Esta acción eliminará:\n' +
                '• Todos los productos e inventario\n' +
                '• Todos los pedidos y clientes\n' +
                '• La tienda online\n' +
                '• Tu cuenta de usuario\n\n' +
                'Esta acción es IRREVERSIBLE.\n\n' +
                'Te recomendamos exportar tus datos primero.'
              );
              if (confirmed) {
                const doubleConfirm = window.prompt('Escribí "ELIMINAR" para confirmar:');
                if (doubleConfirm === 'ELIMINAR') {
                  alert('Contactá a soporte@obsidiana.com para completar la eliminación de tu cuenta. Esta acción requiere verificación manual por seguridad.');
                }
              }
            }}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[16px]">delete_forever</span>
            Eliminar Cuenta
          </button>
        </div>
      </div>
    </div>
  );
}