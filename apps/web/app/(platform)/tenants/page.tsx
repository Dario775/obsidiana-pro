'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function TenantsPage() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<any>(null);

  // Form states
  const [formData, setFormData] = useState({
    nombre: '',
    slug: '',
    cuit: '',
    plan_id: '',
    status: 'active',
    online_store_enabled: true
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const { data: tenantsData } = await supabase.from('tenants').select('*');
      if (tenantsData) setTenants(tenantsData);

      const { data: plansData } = await supabase.from('plans').select('*');
      if (plansData) setPlans(plansData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleOpenAddModal = () => {
    setFormData({
      nombre: '',
      slug: '',
      cuit: '',
      plan_id: plans[0]?.id || '',
      status: 'active',
      online_store_enabled: true
    });
    setShowAddModal(true);
  };

  const handleOpenEditModal = (t: any) => {
    setSelectedTenant(t);
    setFormData({
      nombre: t.nombre || '',
      slug: t.slug || '',
      cuit: t.cuit || '',
      plan_id: t.plan_id || plans[0]?.id || '',
      status: t.status || 'active',
      online_store_enabled: t.online_store_enabled || false
    });
    setShowEditModal(true);
  };

  const handleSaveTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre || !formData.slug) return;
    setSaving(true);
    try {
      if (showEditModal && selectedTenant) {
        // Update
        const { error } = await supabase.from('tenants')
          .update({
            nombre: formData.nombre,
            slug: formData.slug.toLowerCase().replace(/\s+/g, '-'),
            cuit: formData.cuit,
            plan_id: formData.plan_id || null,
            status: formData.status,
            online_store_enabled: formData.online_store_enabled
          })
          .eq('id', selectedTenant.id);

        if (!error) {
          setShowEditModal(false);
          fetchData();
        } else {
          alert('Error al actualizar el tenant: ' + error.message);
        }
      } else {
        // Insert
        const { error } = await supabase.from('tenants')
          .insert([{
            nombre: formData.nombre,
            slug: formData.slug.toLowerCase().replace(/\s+/g, '-'),
            cuit: formData.cuit,
            plan_id: formData.plan_id || null,
            status: formData.status,
            online_store_enabled: formData.online_store_enabled
          }]);

        if (!error) {
          setShowAddModal(false);
          fetchData();
        } else {
          alert('Error al crear el tenant: ' + error.message);
        }
      }
    } catch (error: any) {
      console.error(error);
      alert('Error inesperado al guardar: ' + (error?.message || 'desconocido'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTenant = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este Tenant? Esto borrará sus datos permanentemente.')) return;
    try {
      const { error } = await supabase.from('tenants').delete().eq('id', id);
      if (!error) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-zinc-500 font-bold uppercase tracking-widest text-xs gap-3">
        <span className="material-symbols-outlined text-4xl animate-spin text-primary">autorenew</span>
        Cargando tiendas...
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-white">Gestión de Tenants</h1>
          <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">
            Administra los comerciantes y configuraciones del SaaS
          </p>
        </div>
        <button 
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-xl transition-all shadow-lg text-xs font-black uppercase tracking-wider"
        >
          <span className="material-symbols-outlined text-sm font-black">add</span>
          Crear Tenant
        </button>
      </div>

      <div className="bg-zinc-900 border border-white/5 rounded-xl overflow-hidden shadow-2xl flex flex-col">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-widest text-white">Tenants Registrados</h3>
          <span className="text-[10px] text-violet-400 font-black uppercase tracking-widest">{tenants.length} Total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 bg-white/5">
                <th className="py-3 px-6 text-[10px] font-black uppercase tracking-widest text-zinc-500">Tienda / Tenant</th>
                <th className="py-3 px-6 text-[10px] font-black uppercase tracking-widest text-zinc-500">Identificador</th>
                <th className="py-3 px-6 text-[10px] font-black uppercase tracking-widest text-zinc-500">Plan Actual</th>
                <th className="py-3 px-6 text-[10px] font-black uppercase tracking-widest text-zinc-500">Estado</th>
                <th className="py-3 px-6 text-[10px] font-black uppercase tracking-widest text-zinc-500">Vencimiento</th>
                <th className="py-3 px-6 text-right text-[10px] font-black uppercase tracking-widest text-zinc-500">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {tenants.map((t, i) => {
                const plan = plans.find(p => p.id === t.plan_id);
                return (
                  <tr key={t.id || i} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center font-black text-[10px] text-zinc-500">
                          {t.nombre ? t.nombre.charAt(0).toUpperCase() : 'T'}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-white">{t.nombre}</span>
                          <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">{t.cuit || 'Sin CUIT'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest">{t.slug}</td>
                    <td className="py-4 px-6">
                       <span className="text-[10px] font-black text-violet-400 uppercase tracking-widest bg-violet-500/5 px-2 py-0.5 rounded border border-violet-500/10">
                          {plan ? (plan.name || plan.nombre) : 'Sin Plan'}
                       </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${t.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'}`}>
                        {t.status === 'active' ? 'Activo' : t.status === 'trial' ? 'Prueba' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                       <div className="flex flex-col">
                          <span className={`text-[10px] font-bold ${t.paid_until && new Date(t.paid_until) < new Date() ? 'text-red-400' : 'text-zinc-300'}`}>
                            {t.paid_until ? new Date(t.paid_until).toLocaleDateString('es-AR') : 'Sin fecha'}
                          </span>
                          <span className="text-[8px] text-zinc-500 font-black uppercase">Mensual</span>
                       </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditModal(t)}
                          className="p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteTenant(t.id)}
                          className="p-2 text-red-500/60 hover:text-red-400 hover:bg-red-500/5 rounded-xl transition-all"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Tenant Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <form onSubmit={handleSaveTenant} className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-md p-6 overflow-hidden shadow-2xl flex flex-col gap-6 relative">
            <button 
              type="button"
              onClick={() => { setShowAddModal(false); setShowEditModal(false); }}
              className="absolute right-4 top-4 p-2 text-zinc-500 hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>

            <div>
              <h3 className="text-lg font-black tracking-wider uppercase text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">store</span>
                {showEditModal ? 'Editar Tenant' : 'Crear Nuevo Tenant'}
              </h3>
              <p className="text-zinc-500 text-xs font-black uppercase tracking-widest mt-1">
                Completa los datos principales de la tienda
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-zinc-400 text-xs font-black uppercase tracking-widest mb-1">Nombre Comercial</label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej. Moda Urbana"
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                />
              </div>

              <div>
                <label className="block text-zinc-400 text-xs font-black uppercase tracking-widest mb-1">Slug / Subdominio</label>
                <input
                  type="text"
                  required
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="Ej. moda-urbana"
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                />
              </div>

              <div>
                <label className="block text-zinc-400 text-xs font-black uppercase tracking-widest mb-1">CUIT</label>
                <input
                  type="text"
                  value={formData.cuit}
                  onChange={(e) => setFormData({ ...formData, cuit: e.target.value })}
                  placeholder="Ej. 20-12345678-9"
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-zinc-400 text-xs font-black uppercase tracking-widest mb-1">Plan</label>
                  <select
                    value={formData.plan_id}
                    onChange={(e) => setFormData({ ...formData, plan_id: e.target.value })}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                  >
                    <option value="" className="bg-[#141414] text-white">Sin Plan</option>
                    {plans.map((p) => (
                      <option key={p.id} value={p.id} className="bg-[#141414] text-white">
                        {p.name || p.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex-1">
                  <label className="block text-zinc-400 text-xs font-black uppercase tracking-widest mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                  >
                    <option value="active">Activo</option>
                    <option value="trial">Prueba</option>
                    <option value="inactive">Inactivo</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between mt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.online_store_enabled}
                    onChange={(e) => setFormData({ ...formData, online_store_enabled: e.target.checked })}
                    className="accent-primary w-4 h-4 rounded"
                  />
                  <span className="text-zinc-300 text-xs font-black uppercase tracking-widest">Habilitar Tienda Online</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setShowAddModal(false); setShowEditModal(false); }}
                className="flex-1 px-5 py-3 bg-zinc-900 border border-white/10 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all font-bold text-xs font-black uppercase tracking-wider"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-5 py-3 bg-primary text-white rounded-xl hover:bg-primary-hover transition-all font-bold text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <span className="material-symbols-outlined text-sm animate-spin">autorenew</span>
                ) : (
                  <span className="material-symbols-outlined text-sm">check</span>
                )}
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
