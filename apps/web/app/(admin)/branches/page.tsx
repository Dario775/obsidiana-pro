'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/hooks/use-tenant';

interface Branch {
  id: string;
  tenant_id: string;
  name: string;
  address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  phone: string | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function BranchesPage() {
  const { tenant } = useTenant();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);

  // Form Data State
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    province: '',
    postal_code: '',
    phone: '',
    is_active: true
  });

  useEffect(() => {
    fetchBranches();
  }, [tenant]);

  async function fetchBranches() {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('is_default', { ascending: false })
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching branches:', error);
      } else {
        setBranches(data || []);
      }
    } catch (err) {
      console.error('Error in fetchBranches:', err);
    } finally {
      setLoading(false);
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      city: '',
      province: '',
      postal_code: '',
      phone: '',
      is_active: true
    });
  };

  async function handleCreateBranch(e: React.FormEvent) {
    e.preventDefault();
    if (!tenant?.id || !formData.name.trim()) return;

    setSaving(true);
    try {
      // If this is the first branch, make it default automatically
      const isFirstBranch = branches.length === 0;

      const { data, error } = await supabase
        .from('locations')
        .insert({
          tenant_id: tenant.id,
          name: formData.name.trim(),
          address: formData.address.trim() || null,
          city: formData.city.trim() || null,
          province: formData.province.trim() || null,
          postal_code: formData.postal_code.trim() || null,
          phone: formData.phone.trim() || null,
          is_default: isFirstBranch,
          is_active: formData.is_active
        })
        .select()
        .single();

      if (error) throw error;

      setShowModal(false);
      resetForm();
      await fetchBranches();
      alert('Sucursal creada exitosamente');
    } catch (err: any) {
      console.error('Error creating branch:', err);
      alert('Error al guardar: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleEditBranch(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedBranch) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('locations')
        .update({
          name: formData.name.trim(),
          address: formData.address.trim() || null,
          city: formData.city.trim() || null,
          province: formData.province.trim() || null,
          postal_code: formData.postal_code.trim() || null,
          phone: formData.phone.trim() || null,
          is_active: formData.is_active
        })
        .eq('id', selectedBranch.id);

      if (error) throw error;

      setShowEditModal(false);
      setSelectedBranch(null);
      resetForm();
      await fetchBranches();
      alert('Sucursal actualizada exitosamente');
    } catch (err: any) {
      console.error('Error editing branch:', err);
      alert('Error al actualizar: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteBranch(branch: Branch) {
    if (branch.is_default) {
      alert('No se puede eliminar la sucursal principal por defecto. Establece otra sucursal como principal primero.');
      return;
    }

    if (!confirm(`¿Estás seguro de que deseas eliminar la sucursal "${branch.name}"? Esta acción no se puede deshacer.`)) return;

    try {
      const { error } = await supabase
        .from('locations')
        .delete()
        .eq('id', branch.id);

      if (error) throw error;

      await fetchBranches();
      alert('Sucursal eliminada exitosamente');
    } catch (err: any) {
      console.error('Error deleting branch:', err);
      alert('Error al eliminar: ' + err.message);
    }
  }

  async function handleSetDefault(branch: Branch) {
    if (branch.is_default) return;
    if (!tenant?.id) return;

    const confirmSet = confirm(`¿Estás seguro de establecer "${branch.name}" como la sucursal principal de tu tienda?`);
    if (!confirmSet) return;

    try {
      // 1. Quitar default de la sucursal anterior
      const { error: errorClear } = await supabase
        .from('locations')
        .update({ is_default: false })
        .eq('tenant_id', tenant.id)
        .eq('is_default', true);

      if (errorClear) throw errorClear;

      // 2. Establecer default en la nueva sucursal
      const { error: errorSet } = await supabase
        .from('locations')
        .update({ is_default: true, is_active: true }) // Must be active if default
        .eq('id', branch.id);

      if (errorSet) throw errorSet;

      await fetchBranches();
      alert(`"${branch.name}" es ahora la sucursal principal`);
    } catch (err: any) {
      console.error('Error setting default branch:', err);
      alert('Error al cambiar sucursal principal: ' + err.message);
    }
  }

  function openEditModal(branch: Branch) {
    setSelectedBranch(branch);
    setFormData({
      name: branch.name || '',
      address: branch.address || '',
      city: branch.city || '',
      province: branch.province || '',
      postal_code: branch.postal_code || '',
      phone: branch.phone || '',
      is_active: branch.is_active
    });
    setShowEditModal(true);
  }

  return (
    <div className="max-w-[1440px] mx-auto flex flex-col gap-8 pb-32">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] -mr-48 -mt-48 pointer-events-none group-hover:bg-primary/10 transition-all duration-1000"></div>
        
        <div>
          <div className="flex items-center gap-2 text-zinc-400 font-label-md text-xs mb-2 uppercase tracking-widest">
            <span className="text-violet-400 font-black">Configuración</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span>Ubicaciones Físicas</span>
          </div>
          <h1 className="font-headline-xl text-3xl font-black text-white tracking-tight">Gestión de Sucursales</h1>
          <p className="text-zinc-500 font-body-sm text-sm mt-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">map</span>
            Administra las ubicaciones físicas y puntos de venta de tu negocio multi-sucursal.
          </p>
        </div>
        
        <button 
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center justify-center gap-3 px-6 py-3 bg-primary-container text-white rounded-xl hover:bg-[#6D28D9] transition-all font-black text-[10px] uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(124,58,237,0.3)] active:scale-95 group shrink-0"
        >
          <span className="material-symbols-outlined text-[18px] group-hover:rotate-90 transition-transform">add</span>
          Nueva Sucursal
        </button>
      </div>

      {/* Branches Grid */}
      {loading ? (
        <div className="py-20 text-center text-zinc-500 font-black uppercase tracking-widest animate-pulse">
          Cargando sucursales...
        </div>
      ) : branches.length === 0 ? (
        <div className="flex flex-col items-center justify-center bg-[#1A1A1A] rounded-3xl p-16 border border-white/10 border-dashed text-center">
          <span className="material-symbols-outlined text-5xl text-zinc-600 mb-4">storefront</span>
          <h3 className="text-lg font-black text-white uppercase tracking-wider mb-2">Sin Sucursales</h3>
          <p className="text-zinc-500 text-sm max-w-sm mb-6">No has configurado ninguna sucursal física. Crea tu primer local para administrar stock.</p>
          <button 
            onClick={() => setShowModal(true)}
            className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs uppercase tracking-wider transition-all"
          >
            Configurar Primera Sucursal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-8">
          {branches.map((branch) => (
            <div 
              key={branch.id} 
              className={`bg-[#1A1A1A] rounded-3xl border ${branch.is_default ? 'border-primary-container/30' : 'border-white/10'} p-8 flex flex-col justify-between gap-6 relative overflow-hidden group hover:border-white/20 transition-all ${!branch.is_active ? 'opacity-60' : ''}`}
            >
              {branch.is_default && <div className="absolute top-0 left-0 w-1.5 h-full bg-primary-container"></div>}
              
              <div className="flex justify-between items-start relative z-10">
                <div>
                  <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                    <h3 className="text-xl font-black text-white tracking-tight">{branch.name}</h3>
                    {branch.is_default && (
                      <span className="bg-violet-500/10 text-violet-400 border-violet-500/20 font-black text-[8px] uppercase tracking-widest border px-2 py-0.5 rounded-full">
                        Principal
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded-full ${!branch.is_active ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'} font-black text-[8px] uppercase tracking-widest border flex items-center gap-1`}>
                      <div className={`w-1 h-1 rounded-full ${!branch.is_active ? 'bg-red-400' : 'bg-emerald-400 animate-pulse'}`}></div>
                      {branch.is_active ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 mt-2">
                    <span className="material-symbols-outlined text-[14px]">location_on</span>
                    {branch.address ? `${branch.address}${branch.city ? `, ${branch.city}` : ''}` : 'Sin dirección cargada'}
                  </p>
                </div>
                
                {/* Delete / Set Default buttons */}
                {!branch.is_default && (
                  <button 
                    onClick={() => handleDeleteBranch(branch)}
                    className="text-zinc-600 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-500/10"
                    title="Eliminar sucursal"
                  >
                    <span className="material-symbols-outlined text-[20px]">delete</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 relative z-10 font-inter">
                <div className="bg-zinc-900/50 p-4 rounded-2xl border border-white/5">
                  <span className="block text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">Localidad</span>
                  <span className="block text-white font-bold text-xs truncate">
                    {branch.province || '—'}
                  </span>
                  <span className="block text-[9px] font-black text-zinc-500 uppercase mt-0.5">
                    {branch.postal_code ? `CP ${branch.postal_code}` : ''}
                  </span>
                </div>
                <div className="bg-zinc-900/50 p-4 rounded-2xl border border-white/5">
                  <span className="block text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">Contacto</span>
                  <span className="block text-white font-bold text-xs truncate">
                    {branch.phone || '—'}
                  </span>
                </div>
              </div>

              <div className="border-t border-white/5 pt-6 relative z-10 mt-auto">
                 <div className="flex gap-3">
                    <button 
                      onClick={() => openEditModal(branch)}
                      className="flex-1 bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all font-black text-[9px] uppercase tracking-widest py-3 rounded-xl"
                    >
                      Editar Datos
                    </button>
                    {!branch.is_default && branch.is_active && (
                      <button 
                        onClick={() => handleSetDefault(branch)}
                        className="flex-1 bg-zinc-900 border border-white/10 text-zinc-400 hover:text-violet-400 hover:bg-violet-500/10 transition-all font-black text-[9px] uppercase tracking-widest py-3 rounded-xl flex items-center justify-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[14px]">star</span>
                        Hacer Principal
                      </button>
                    )}
                 </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Nueva Sucursal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#1A1A1A] border border-white/10 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-[#1A1A1A] border-b border-white/10 p-6 flex items-center justify-between z-10">
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-wider">Nueva Sucursal</h2>
                <p className="text-zinc-500 text-xs mt-1">Registra un nuevo local o punto de distribución físico.</p>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-white/5 rounded-xl transition-colors text-zinc-400 hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateBranch} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-2">Nombre de la Sucursal *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  placeholder="Ej. Sucursal Norte"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-2">Dirección de Calle</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  placeholder="Ej. Av. Cabildo 2500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-2">Ciudad / Barrio</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
                    placeholder="Ej. Belgrano"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-2">Provincia / Región</label>
                  <input
                    type="text"
                    value={formData.province}
                    onChange={(e) => setFormData({...formData, province: e.target.value})}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
                    placeholder="Ej. CABA"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-2">Código Postal</label>
                  <input
                    type="text"
                    value={formData.postal_code}
                    onChange={(e) => setFormData({...formData, postal_code: e.target.value})}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
                    placeholder="Ej. 1428"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-2">Teléfono de Contacto</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
                    placeholder="Ej. +54 11 1234-5678"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-zinc-900/50 rounded-xl border border-white/5">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                  className="w-5 h-5 rounded border-white/10 bg-zinc-900 text-primary focus:ring-primary"
                />
                <label htmlFor="is_active" className="text-xs font-bold text-zinc-300 cursor-pointer uppercase tracking-wider">
                  Sucursal Activa para stock e inventario
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-5 py-3 bg-zinc-900 border border-white/10 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all font-bold text-xs uppercase tracking-wider"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-5 py-3 bg-primary-container text-white rounded-xl hover:bg-[#6D28D9] transition-all font-bold text-xs uppercase tracking-wider disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-violet-500/10"
                >
                  {saving ? 'Guardando...' : 'Crear Sucursal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Sucursal */}
      {showEditModal && selectedBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#1A1A1A] border border-white/10 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-[#1A1A1A] border-b border-white/10 p-6 flex items-center justify-between z-10">
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-wider">Editar Sucursal</h2>
                <p className="text-zinc-500 text-xs mt-1">Actualiza los datos de la sucursal física.</p>
              </div>
              <button 
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedBranch(null);
                }}
                className="p-2 hover:bg-white/5 rounded-xl transition-colors text-zinc-400 hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleEditBranch} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-2">Nombre de la Sucursal *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-2">Dirección de Calle</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-2">Ciudad / Barrio</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-2">Provincia / Región</label>
                  <input
                    type="text"
                    value={formData.province}
                    onChange={(e) => setFormData({...formData, province: e.target.value})}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-2">Código Postal</label>
                  <input
                    type="text"
                    value={formData.postal_code}
                    onChange={(e) => setFormData({...formData, postal_code: e.target.value})}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-2">Teléfono de Contacto</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-zinc-900/50 rounded-xl border border-white/5">
                <input
                  type="checkbox"
                  id="edit_is_active"
                  disabled={selectedBranch.is_default} // Default branch must remain active
                  checked={formData.is_active}
                  onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                  className="w-5 h-5 rounded border-white/10 bg-zinc-900 text-primary focus:ring-primary disabled:opacity-50"
                />
                <label htmlFor="edit_is_active" className="text-xs font-bold text-zinc-300 cursor-pointer uppercase tracking-wider">
                  Sucursal Activa para stock e inventario
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedBranch(null);
                  }}
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
