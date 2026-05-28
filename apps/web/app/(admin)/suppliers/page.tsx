'use client';

import React, { useEffect, useState, useMemo } from 'react';
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

export default function SuppliersPage() {
  const { tenant } = useTenant();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
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
    fetchSuppliers();
  }, [tenant]);

  async function fetchSuppliers() {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching suppliers:', error);
      } else {
        setSuppliers(data || []);
      }
    } catch (err) {
      console.error('Error in fetchSuppliers:', err);
    } finally {
      setLoading(false);
    }
  }

  const resetForm = () => {
    setFormData({
      nombre: '',
      email: '',
      phone: '',
      address: '',
      notes: ''
    });
  };

  async function handleCreateSupplier(e: React.FormEvent) {
    e.preventDefault();
    if (!tenant?.id || !formData.nombre.trim()) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('suppliers')
        .insert({
          tenant_id: tenant.id,
          nombre: formData.nombre.trim(),
          email: formData.email.trim() || null,
          phone: formData.phone.trim() || null,
          address: formData.address.trim() || null,
          notes: formData.notes.trim() || null
        });

      if (error) throw error;

      setShowModal(false);
      resetForm();
      await fetchSuppliers();
      alert('Proveedor registrado exitosamente');
    } catch (err: any) {
      console.error('Error creating supplier:', err);
      alert('Error al guardar: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleEditSupplier(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSupplier) return;

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
        .eq('id', selectedSupplier.id);

      if (error) throw error;

      setShowEditModal(false);
      setSelectedSupplier(null);
      resetForm();
      await fetchSuppliers();
      alert('Proveedor actualizado exitosamente');
    } catch (err: any) {
      console.error('Error updating supplier:', err);
      alert('Error al actualizar: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSupplier(supplier: Supplier) {
    if (!confirm(`¿Estás seguro de que deseas eliminar al proveedor "${supplier.nombre}"?`)) return;

    try {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', supplier.id);

      if (error) throw error;

      await fetchSuppliers();
      alert('Proveedor eliminado exitosamente');
    } catch (err: any) {
      console.error('Error deleting supplier:', err);
      alert('Error al eliminar: ' + err.message);
    }
  }

  const openEditModal = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setFormData({
      nombre: supplier.nombre || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      notes: supplier.notes || ''
    });
    setShowEditModal(true);
  };

  const filteredSuppliers = useMemo(() => {
    if (!searchQuery.trim()) return suppliers;
    const query = searchQuery.toLowerCase();
    return suppliers.filter(s => 
      s.nombre.toLowerCase().includes(query) ||
      s.email?.toLowerCase().includes(query) ||
      s.phone?.toLowerCase().includes(query) ||
      s.address?.toLowerCase().includes(query)
    );
  }, [suppliers, searchQuery]);

  return (
    <div className="max-w-[1440px] mx-auto flex flex-col gap-8 pb-32">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-8">
        <div>
          <div className="flex items-center gap-2 text-zinc-400 font-label-md text-xs mb-2 uppercase tracking-widest">
            <span className="text-violet-400 font-black">Suministro</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span>Proveedores</span>
          </div>
          <h1 className="font-headline-xl text-3xl font-black text-white mb-2">Proveedores</h1>
          <p className="text-zinc-400 font-body-sm text-sm">Gestiona tu red de suministro, deudas activas y contactos comerciales.</p>
        </div>
        <button 
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center justify-center gap-3 px-6 py-3 bg-primary-container text-white rounded-xl hover:bg-[#6D28D9] transition-all font-black text-[10px] uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(124,58,237,0.3)] active:scale-95 group shrink-0"
        >
          <span className="material-symbols-outlined text-[18px] group-hover:rotate-90 transition-transform">add</span>
          Nuevo Proveedor
        </button>
      </div>

      {/* Summary Stats Bento */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#1A1A1A] rounded-3xl p-8 border border-white/5 flex flex-col justify-between relative overflow-hidden group hover:border-white/10 transition-all">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-violet-500/5 rounded-full blur-2xl group-hover:bg-violet-500/10 transition-all duration-700"></div>
          <div className="flex justify-between items-start relative z-10">
            <span className="font-black text-[10px] text-zinc-500 uppercase tracking-[0.2em]">Total Proveedores</span>
            <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center text-violet-400">
              <span className="material-symbols-outlined">group</span>
            </div>
          </div>
          <div className="mt-6 relative z-10">
            <span className="font-data-tabular text-4xl font-black text-white block">{suppliers.length}</span>
            <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mt-2 block">Proveedores Activos</span>
          </div>
        </div>

        <div className="bg-[#1A1A1A] rounded-3xl p-8 border border-white/5 flex flex-col justify-between relative overflow-hidden group hover:border-white/10 transition-all">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-all duration-700"></div>
          <div className="flex justify-between items-start relative z-10">
            <span className="font-black text-[10px] text-zinc-500 uppercase tracking-[0.2em]">Con Dirección</span>
            <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center text-amber-400">
              <span className="material-symbols-outlined">map</span>
            </div>
          </div>
          <div className="mt-6 relative z-10">
            <span className="font-data-tabular text-4xl font-black text-white block">
              {suppliers.filter(s => !!s.address).length}
            </span>
            <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mt-2 block">Locales Físicos</span>
          </div>
        </div>

        <div className="bg-[#1A1A1A] rounded-3xl p-8 border border-white/5 flex flex-col justify-between relative overflow-hidden group hover:border-white/10 transition-all">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all duration-700"></div>
          <div className="flex justify-between items-start relative z-10">
            <span className="font-black text-[10px] text-zinc-500 uppercase tracking-[0.2em]">Con Teléfono</span>
            <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center text-emerald-400">
              <span className="material-symbols-outlined">phone_android</span>
            </div>
          </div>
          <div className="mt-6 relative z-10">
            <span className="font-data-tabular text-4xl font-black text-white block">
              {suppliers.filter(s => !!s.phone).length}
            </span>
            <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mt-2 block">Contactos Directos</span>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative group flex-1 w-full">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-violet-500 transition-colors">search</span>
          <input 
            className="w-full bg-zinc-950 border border-white/10 rounded-xl py-3.5 pl-12 pr-6 text-sm text-white font-medium focus:ring-1 focus:ring-violet-500 outline-none transition-all placeholder:text-zinc-700" 
            placeholder="Buscar por nombre, email, teléfono..." 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="bg-[#1A1A1A] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-900/50 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 border-b border-white/5">
                <th className="py-5 px-8">Proveedor</th>
                <th className="py-5 px-8">Contacto</th>
                <th className="py-5 px-8">Dirección</th>
                <th className="py-5 px-8">Notas</th>
                <th className="py-5 px-8 w-20">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm font-data-tabular text-white">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-zinc-500 font-black uppercase tracking-widest animate-pulse">
                    Cargando proveedores...
                  </td>
                </tr>
              ) : filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-zinc-500 font-black uppercase tracking-widest">
                    {searchQuery ? 'No se encontraron proveedores' : 'No hay proveedores registrados'}
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((supplier) => (
                  <tr 
                    key={supplier.id} 
                    className="hover:bg-white/[0.02] transition-colors group cursor-pointer"
                    onClick={() => window.location.href = `/suppliers/${supplier.id}`}
                  >
                    <td className="py-5 px-8">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center font-black text-xs text-violet-400 group-hover:scale-105 transition-transform">
                          {supplier.nombre.charAt(0).toUpperCase() || 'P'}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-white group-hover:text-violet-400 transition-colors">{supplier.nombre}</p>
                          <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mt-0.5">ID: {supplier.id.slice(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-5 px-8">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-white">{supplier.email || '—'}</span>
                        <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mt-0.5">{supplier.phone || 'Sin teléfono'}</span>
                      </div>
                    </td>
                    <td className="py-5 px-8 text-zinc-400 font-medium text-xs max-w-xs truncate">
                      {supplier.address || '—'}
                    </td>
                    <td className="py-5 px-8 text-zinc-500 text-xs max-w-xs truncate">
                      {supplier.notes || '—'}
                    </td>
                    <td className="py-5 px-8 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                        <button 
                          onClick={() => window.location.href = `/suppliers/${supplier.id}`}
                          className="w-9 h-9 rounded-lg bg-zinc-800 text-zinc-500 hover:text-white hover:bg-zinc-700 flex items-center justify-center transition-all"
                          title="Ver ficha"
                        >
                          <span className="material-symbols-outlined text-lg">visibility</span>
                        </button>
                        <button 
                          onClick={() => openEditModal(supplier)}
                          className="w-9 h-9 rounded-lg bg-zinc-800 text-zinc-500 hover:text-violet-400 hover:bg-zinc-700 flex items-center justify-center transition-all"
                          title="Editar"
                        >
                          <span className="material-symbols-outlined text-lg">edit</span>
                        </button>
                        <button 
                          onClick={() => handleDeleteSupplier(supplier)}
                          className="w-9 h-9 rounded-lg bg-zinc-800 text-zinc-500 hover:text-red-400 hover:bg-zinc-700 flex items-center justify-center transition-all"
                          title="Eliminar"
                        >
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Nuevo Proveedor */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#1A1A1A] border border-white/10 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-[#1A1A1A] border-b border-white/10 p-6 flex items-center justify-between z-10">
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-wider">Nuevo Proveedor</h2>
                <p className="text-zinc-500 text-xs mt-1">Registra un nuevo contacto de suministro en la base de datos.</p>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-white/5 rounded-xl transition-colors text-zinc-400 hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateSupplier} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-2">Nombre del Proveedor *</label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  placeholder="Ej. TechSupply Corp"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  placeholder="Ej. ventas@techsupply.com"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-2">Teléfono</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  placeholder="Ej. +54 11 1234-5678"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-2">Dirección Física</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  placeholder="Ej. Av. Corrientes 1234, CABA"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-2">Notas / Comentarios</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows={3}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none"
                  placeholder="Información adicional del proveedor, plazos de entrega, etc..."
                />
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
                  {saving ? 'Guardando...' : 'Crear Proveedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Proveedor */}
      {showEditModal && selectedSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#1A1A1A] border border-white/10 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-[#1A1A1A] border-b border-white/10 p-6 flex items-center justify-between z-10">
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-wider">Editar Proveedor</h2>
                <p className="text-zinc-500 text-xs mt-1">Actualiza los datos del proveedor en Supabase.</p>
              </div>
              <button 
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedSupplier(null);
                }}
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
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-2">Teléfono</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-2">Dirección Física</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-2">Notas / Comentarios</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows={3}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedSupplier(null);
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
