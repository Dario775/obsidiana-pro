'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTenant } from '../../../hooks/use-tenant';
import { useAuth } from '../../../components/auth-provider';
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
  const { role } = useAuth();
  const [businessName, setBusinessName] = useState('');
  const [cuit, setCuit] = useState('');
  const [ivaCondition, setIvaCondition] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

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
      color: 'cyan',
    },
    ...(role === 'owner' ? [
      {
        title: 'Planes y Suscripción',
        description: 'Gestioná tu plan, tiempo restante y historial de pagos',
        icon: 'workspace_premium',
        href: '/settings/billing',
        color: 'emerald',
      },
      {
        title: 'Usuarios y Permisos',
        description: 'Administración de acceso y roles',
        icon: 'group',
        href: '/settings/permissions',
        color: 'amber',
      }
    ] : []),
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
      color: 'cyan',
    },
    {
      title: 'Atributos de Producto',
      description: 'Tallas, colores y variantes para la tienda online',
      icon: 'layers',
      href: '/settings/attributes',
      color: 'pink',
    },
    {
      title: 'Tickets y Comprobantes',
      description: 'Personalizá el formato de tus tickets térmicos e impresoras',
      icon: 'receipt_long',
      href: '/settings/tickets',
      color: 'cyan',
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

  async function handleDeleteAccount() {
    if (deleteConfirmText !== 'ELIMINAR MI CUENTA') return;
    setDeleting(true);
    setDeleteError('');

    try {
      const res = await fetch('/api/account', { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok) {
        setDeleteError(data.error || 'Error al eliminar la cuenta');
        return;
      }

      // Clear local storage and redirect
      if (typeof window !== 'undefined') {
        window.localStorage.clear();
        window.location.href = '/login?message=' + encodeURIComponent('Tu cuenta fue eliminada exitosamente. ¡Gracias por usar Obsidiana!');
      }
    } catch (err: any) {
      setDeleteError(err.message || 'Error de conexión');
    } finally {
      setDeleting(false);
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
          <span className="material-symbols-outlined text-secondary text-2xl">business</span>
          <h2 className="text-sm font-black text-white uppercase tracking-widest">Datos del Negocio</h2>
        </div>
        
        <form onSubmit={saveBusinessSettings} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">Nombre / Razón Social</label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-secondary/50"
              placeholder="Nombre de tu negocio"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">CUIT</label>
            <input
              type="text"
              value={cuit}
              onChange={(e) => setCuit(e.target.value)}
              className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-secondary/50"
              placeholder="XX-XXXXXXXX-X"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">Condición IVA</label>
            <select
              value={ivaCondition}
              onChange={(e) => setIvaCondition(e.target.value)}
              className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-secondary/50"
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
              className="w-full px-4 py-3 bg-secondary text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 hover:brightness-110"
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
          {role === 'owner' && (
            <button 
              onClick={() => {
                setShowDeleteModal(true);
                setDeleteConfirmText('');
                setDeleteError('');
              }}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[16px]">delete_forever</span>
              Eliminar Cuenta
            </button>
          )}
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in">
          <div className="bg-[#141414] border border-red-500/20 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl shadow-red-950/30">
            {/* Header */}
            <div className="p-6 border-b border-red-500/10 bg-red-950/20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-red-400 text-2xl">delete_forever</span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-red-400 tracking-tight">Eliminar Cuenta</h3>
                  <p className="text-[10px] text-red-400/60 font-bold uppercase tracking-widest">Acción irreversible</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <div className="space-y-3">
                <p className="text-sm text-zinc-300 leading-relaxed">
                  Estás a punto de eliminar permanentemente <span className="text-white font-bold">{tenant?.nombre || 'tu negocio'}</span> y todos sus datos.
                </p>
                <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-4 space-y-2">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Se eliminará:</p>
                  <ul className="space-y-1.5">
                    {[
                      'Todos los productos e inventario',
                      'Todos los pedidos y ventas',
                      'Todos los clientes y segmentos',
                      'Sesiones de caja y pagos',
                      'Proveedores y movimientos de stock',
                      'Configuración de tienda online',
                      'Usuarios asociados al negocio',
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-2 text-xs text-zinc-400">
                        <span className="material-symbols-outlined text-red-400/60 text-[14px]">remove_circle</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3 flex gap-2">
                  <span className="material-symbols-outlined text-amber-400 text-[16px] mt-0.5 shrink-0">info</span>
                  <p className="text-[11px] text-amber-300/80 leading-relaxed">
                    Te recomendamos <strong>exportar tus datos</strong> antes de continuar. Cerrá este modal y usá el botón &quot;Exportar Datos&quot;.
                  </p>
                </div>
              </div>

              {/* Confirmation input */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                  Escribí <span className="text-red-400">ELIMINAR MI CUENTA</span> para confirmar
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => { setDeleteConfirmText(e.target.value); setDeleteError(''); }}
                  placeholder="ELIMINAR MI CUENTA"
                  className="w-full bg-zinc-950 border border-red-500/20 focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 rounded-xl px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-zinc-700 font-mono"
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>

              {deleteError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
                  {deleteError}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 px-5 py-3 bg-zinc-900 border border-white/10 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all font-bold text-xs uppercase tracking-wider disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'ELIMINAR MI CUENTA' || deleting}
                className="flex-1 px-5 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <span className="material-symbols-outlined text-sm animate-spin">autorenew</span>
                    Eliminando...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">delete_forever</span>
                    Eliminar Todo
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}