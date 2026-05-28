'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/hooks/use-tenant';

interface Supplier {
  id: string;
  tenant_id: string;
  nombre: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
}

export default function SupplierDetailPage({ params }: { params: { id: string } }) {
  const { tenant } = useTenant();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'orders'>('info');
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    phone: '',
    address: '',
    notes: ''
  });

  useEffect(() => {
    fetchSupplier();
  }, [params.id, tenant]);

  async function fetchSupplier() {
    if (!tenant?.id || !params.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', params.id)
        .eq('tenant_id', tenant.id)
        .single();

      if (error) {
        console.error('Error fetching supplier details:', error);
        setSupplier(null);
      } else {
        setSupplier(data);
        setFormData({
          nombre: data.nombre || '',
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          notes: data.notes || ''
        });
      }
    } catch (err) {
      console.error('Error in fetchSupplier:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleEditSupplier(e: React.FormEvent) {
    e.preventDefault();
    if (!supplier) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('suppliers')
        .update({
          nombre: formData.nombre.trim(),
          email: formData.email.trim() || null,
          phone: formData.phone.trim() || null,
          address: formData.address.trim() || null,
          notes: formData.notes.trim() || null
        })
        .eq('id', supplier.id);

      if (error) throw error;

      setShowEditModal(false);
      await fetchSupplier();
      alert('Proveedor actualizado exitosamente');
    } catch (err: any) {
      console.error('Error updating supplier:', err);
      alert('Error al actualizar: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-[1440px] mx-auto py-32 text-center text-zinc-500 font-black uppercase tracking-widest animate-pulse">
        Cargando ficha del proveedor...
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="max-w-[1440px] mx-auto py-32 text-center text-zinc-500 font-black uppercase tracking-widest">
        No se encontró el proveedor solicitado
        <button 
          onClick={() => window.location.href = '/suppliers'}
          className="mt-6 block mx-auto px-5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-xs font-bold text-white uppercase tracking-wider"
        >
          Volver a Proveedores
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto flex flex-col gap-8 pb-32">
      {/* Supplier Profile Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-8 relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -ml-32 -mt-32 pointer-events-none group-hover:bg-primary/10 transition-all duration-1000"></div>
        
        <div className="relative z-10 flex flex-col gap-4">
          <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center text-violet-400 shadow-2xl shrink-0">
              <span className="material-symbols-outlined text-4xl">factory</span>
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="font-headline-xl text-3xl font-black text-white tracking-tight">{supplier.nombre}</h1>
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-black text-[9px] uppercase tracking-widest flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                  Proveedor Activo
                </span>
              </div>
              <p className="text-zinc-500 font-black text-[10px] uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">badge</span>
                ID: {supplier.id}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 relative z-10 font-inter">
          <button 
            onClick={() => setShowEditModal(true)}
            className="px-5 py-3 rounded-xl border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 transition-all font-bold text-xs uppercase tracking-wider flex items-center gap-2 active:scale-95 shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">edit</span>
            Editar Proveedor
          </button>
          <button 
            onClick={() => window.location.href = '/suppliers'}
            className="px-5 py-3 rounded-xl bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all font-bold text-xs uppercase tracking-wider flex items-center gap-2 active:scale-95 shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Volver
          </button>
        </div>
      </div>

      {/* Metrics Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#1A1A1A] rounded-3xl p-8 border border-white/5 flex flex-col gap-2 relative overflow-hidden group hover:border-white/10 transition-all">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-violet-500/5 rounded-full blur-2xl group-hover:bg-violet-500/10 transition-all duration-700"></div>
          <p className="font-black text-[10px] text-zinc-500 uppercase tracking-[0.2em]">Email Comercial</p>
          <h3 className="font-data-tabular text-xl font-black text-white mt-2 relative z-10 break-all">{supplier.email || '—'}</h3>
          <p className="text-[10px] font-black text-zinc-700 uppercase tracking-widest mt-2">Canal de comunicación principal</p>
        </div>

        <div className="bg-[#1A1A1A] rounded-3xl p-8 border border-white/5 flex flex-col gap-2 relative overflow-hidden group hover:border-white/10 transition-all">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all duration-700"></div>
          <p className="font-black text-[10px] text-zinc-500 uppercase tracking-[0.2em]">Teléfono de Contacto</p>
          <h3 className="font-data-tabular text-xl font-black text-white mt-2 relative z-10">{supplier.phone || '—'}</h3>
          <p className="text-[10px] font-black text-zinc-700 uppercase tracking-widest mt-2">Atención telefónica directa</p>
        </div>
      </div>

      {/* Main Content Area: Tabs & Tables */}
      <div className="flex flex-col gap-6">
        {/* Tab Navigation */}
        <div className="flex items-center gap-10 border-b border-white/5 px-4 font-inter">
          <button 
            onClick={() => setActiveTab('info')}
            className={`py-4 font-black text-[10px] uppercase tracking-[0.2em] transition-all relative ${activeTab === 'info' ? 'text-primary' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Detalles e Información
            {activeTab === 'info' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-full shadow-[0_0_10px_rgba(124,58,237,0.5)]"></div>}
          </button>
          <button 
            onClick={() => setActiveTab('orders')}
            className={`py-4 font-black text-[10px] uppercase tracking-[0.2em] transition-all relative ${activeTab === 'orders' ? 'text-primary' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Órdenes Recientes
            {activeTab === 'orders' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-full shadow-[0_0_10px_rgba(124,58,237,0.5)]"></div>}
          </button>
        </div>

        {activeTab === 'info' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-6 bg-[#1A1A1A] rounded-3xl border border-white/5 p-8 space-y-6">
              <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                <span className="material-symbols-outlined text-zinc-500 text-lg">location_on</span>
                Dirección Comercial
              </h3>
              <p className="text-zinc-300 text-sm bg-zinc-900/50 p-4 rounded-xl border border-white/5 font-medium min-h-[80px]">
                {supplier.address || 'Sin dirección física registrada.'}
              </p>
            </div>

            <div className="lg:col-span-6 bg-[#1A1A1A] rounded-3xl border border-white/5 p-8 space-y-6">
              <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                <span className="material-symbols-outlined text-zinc-500 text-lg">notes</span>
                Notas y Acuerdos Comerciales
              </h3>
              <p className="text-zinc-300 text-sm bg-zinc-900/50 p-4 rounded-xl border border-white/5 font-medium min-h-[80px] whitespace-pre-wrap">
                {supplier.notes || 'No hay notas adicionales registradas para este proveedor.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-[#1A1A1A] rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
            <div className="p-8 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 bg-[#1E1E1E]/50">
              <h3 className="font-black text-sm text-white uppercase tracking-widest flex items-center gap-3">
                <span className="material-symbols-outlined text-zinc-500">history</span>
                Historial de Suministro
              </h3>
            </div>
            <div className="p-16 text-center text-zinc-600 font-black text-xs uppercase tracking-widest">
              Sin transacciones registradas con este proveedor.
            </div>
          </div>
        )}
      </div>

      {/* Modal: Editar Proveedor */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#1A1A1A] border border-white/10 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-[#1A1A1A] border-b border-white/10 p-6 flex items-center justify-between z-10">
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-wider">Editar Proveedor</h2>
                <p className="text-zinc-500 text-xs mt-1">Actualiza los datos del proveedor.</p>
              </div>
              <button 
                onClick={() => setShowEditModal(false)}
                className="p-2 hover:bg-white/5 rounded-xl transition-colors text-zinc-400 hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleEditSupplier} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-2">Nombre del Proveedor *</label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-2">Teléfono</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-2">Dirección Física</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-2">Notas / Comentarios</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows={3}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-5 py-3 bg-zinc-900 border border-white/10 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all font-bold text-xs uppercase tracking-wider"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-5 py-3 bg-primary-container text-white rounded-xl hover:bg-[#6D28D9] transition-all font-bold text-xs uppercase tracking-wider disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-violet-500/10"
                >
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
