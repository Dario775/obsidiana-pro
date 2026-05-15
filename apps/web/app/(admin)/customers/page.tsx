'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/hooks/use-tenant';

interface Customer {
  id: string;
  email: string;
  nombre: string | null;
  phone: string | null;
  dni_cuit: string | null;
  first_name: string | null;
  last_name: string | null;
  accepts_marketing: boolean;
  credit_limit: number;
  created_at: string;
}

export default function CustomersPage() {
  const { tenant } = useTenant();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    dni_cuit: '',
    accepts_marketing: false,
    credit_limit: 0
  });

  useEffect(() => {
    fetchCustomers();
  }, [tenant]);

  useEffect(() => {
    if (!searchQuery) {
      setFilteredCustomers(customers);
      return;
    }
    const search = searchQuery.toLowerCase();
    const filtered = customers.filter(c => {
      const fullName = `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase();
      return (
        fullName.includes(search) ||
        c.email?.toLowerCase().includes(search) ||
        c.phone?.toLowerCase().includes(search) ||
        c.dni_cuit?.toLowerCase().includes(search)
      );
    });
    setFilteredCustomers(filtered);
  }, [searchQuery, customers]);

  async function fetchCustomers() {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching customers:', error);
      } else {
        setCustomers(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveCustomer(e: React.FormEvent) {
    e.preventDefault();
    if (!tenant?.id) return;
    setSaving(true);

    try {
      const payload: any = {
        tenant_id: tenant.id,
        email: formData.email,
        phone: formData.phone,
        dni_cuit: formData.dni_cuit,
        accepts_marketing: formData.accepts_marketing,
        credit_limit: formData.credit_limit || 0
      };

      // Intentamos guardar en nombre o first_name/last_name según el esquema
      payload.nombre = `${formData.first_name} ${formData.last_name}`.trim();
      payload.first_name = formData.first_name;
      payload.last_name = formData.last_name;

      const { error } = await supabase
        .from('customers')
        .insert(payload);

      if (error) throw error;

      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        dni_cuit: '',
        accepts_marketing: false,
        credit_limit: 0
      });
      setShowModal(false);
      await fetchCustomers();
      alert('Cliente creado exitosamente');
    } catch (error: any) {
      console.error('Error al guardar cliente:', error);
      alert('Error al guardar: ' + error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleEditCustomer(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCustomer) return;

    setSaving(true);
    try {
      const payload: any = {
        email: formData.email,
        phone: formData.phone,
        dni_cuit: formData.dni_cuit,
        accepts_marketing: formData.accepts_marketing,
        credit_limit: formData.credit_limit || 0
      };

      payload.nombre = `${formData.first_name} ${formData.last_name}`.trim();
      payload.first_name = formData.first_name;
      payload.last_name = formData.last_name;

      const { error } = await supabase
        .from('customers')
        .update(payload)
        .eq('id', selectedCustomer?.id);

      if (error) throw error;

      setShowEditModal(false);
      setSelectedCustomer(null);
      await fetchCustomers();
      alert('Cliente actualizado exitosamente');
    } catch (error: any) {
      console.error('Error al editar cliente:', error);
      alert('Error al actualizar: ' + error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCustomer(customer: Customer) {
    if (!confirm(`¿Estás seguro de eliminar a ${customer.first_name} ${customer.last_name}?`)) return;

    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customer.id);

      if (error) throw error;

      await fetchCustomers();
      alert('Cliente eliminado exitosamente');
    } catch (error: any) {
      console.error('Error al eliminar:', error);
      alert('Error al eliminar: ' + error.message);
    }
  }

  function openEditModal(customer: Customer) {
    setSelectedCustomer(customer);
    setFormData({
      first_name: customer.first_name || '',
      last_name: customer.last_name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      dni_cuit: customer.dni_cuit || '',
      accepts_marketing: customer.accepts_marketing || false,
      credit_limit: customer.credit_limit || 0
    });
    setShowEditModal(true);
  }

  function getInitials(customer: Customer): string {
    const first = customer.first_name?.[0] || customer.nombre?.[0] || '';
    const last = customer.last_name?.[0] || '';
    return (first + last).toUpperCase() || customer.email?.[0]?.toUpperCase() || '?';
  }

  function getFullName(customer: Customer): string {
    const name = customer.nombre || `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
    return name || 'Sin nombre';
  }

  function exportToCSV() {
    const headers = ['Nombre', 'Apellido', 'Email', 'Teléfono', 'DNI/CUIT', 'Marketing', 'Fecha Registro'];
    const rows = customers.map(c => [
      c.first_name || '',
      c.last_name || '',
      c.email,
      c.phone || '',
      c.dni_cuit || '',
      c.accepts_marketing ? 'Sí' : 'No',
      new Date(c.created_at).toLocaleDateString('es-AR')
    ]);

    const csv = [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'clientes.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  }

  // Stats
  const totalCustomers = customers.length;
  const newThisMonth = customers.filter(c => {
    const date = new Date(c.created_at);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;
  const acceptsMarketing = customers.filter(c => c.accepts_marketing).length;

  return (
    <div className="max-w-[1440px] mx-auto flex flex-col gap-8 pb-32">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-zinc-400 font-label-md text-xs mb-2 uppercase tracking-widest">
            <span className="text-primary-container font-black">CRM</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span>Gestión de Clientes</span>
          </div>
          <h1 className="font-headline-xl text-3xl font-black text-white mb-1">Cartera de Clientes</h1>
          <p className="text-zinc-400 font-body-sm text-sm max-w-2xl">Administración centralizada de perfiles, historiales de compra y segmentación.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button 
            onClick={() => setShowModal(true)}
            className="px-4 py-2 rounded-lg bg-primary-container hover:bg-[#6D28D9] text-white transition-all font-label-md text-xs uppercase font-bold tracking-wider flex items-center gap-2 shadow-[0_0_15px_rgba(124,58,237,0.3)] active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            Nuevo Cliente
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#1A1A1A] border border-white/10 rounded-xl p-6 flex flex-col justify-between group hover:border-primary/20 transition-all">
          <div className="flex items-center gap-2 text-zinc-500 mb-4 uppercase tracking-[0.2em] font-black text-[10px]">
            <span className="material-symbols-outlined text-lg">group</span>
            Total Clientes
          </div>
          <div>
            <div className="font-data-tabular text-3xl font-black text-white">{totalCustomers}</div>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-1.5 py-0.5 rounded font-black">+{newThisMonth}</span>
              <span className="text-[10px] text-zinc-500 font-medium tracking-tighter">este mes</span>
            </div>
          </div>
        </div>

        <div className="bg-[#1A1A1A] border border-white/10 rounded-xl p-6 flex flex-col justify-between group hover:border-violet-400/20 transition-all">
          <div className="flex items-center gap-2 text-zinc-500 mb-4 uppercase tracking-[0.2em] font-black text-[10px]">
            <span className="material-symbols-outlined text-lg">mail</span>
            Aceptan Marketing
          </div>
          <div>
            <div className="font-data-tabular text-3xl font-black text-white">{acceptsMarketing}</div>
            <div className="text-[10px] text-zinc-500 font-black uppercase tracking-wider mt-2">{totalCustomers > 0 ? Math.round((acceptsMarketing / totalCustomers) * 100) : 0}% del total</div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#1A1A1A] to-[#2A1A3A] border border-primary/30 rounded-xl p-6 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <span className="material-symbols-outlined text-7xl text-primary">account_balance</span>
          </div>
          <div className="flex items-center gap-2 text-primary mb-4 uppercase tracking-[0.2em] font-black text-[10px] relative z-10">
            <span className="material-symbols-outlined text-lg">trending_up</span>
            Nuevos (30 días)
          </div>
          <div className="relative z-10">
            <div className="font-data-tabular text-3xl font-black text-white">
              {customers.filter(c => {
                const date = new Date(c.created_at);
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                return date >= thirtyDaysAgo;
              }).length}
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-1.5 py-0.5 rounded font-black">Activos</span>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-[#1A1A1A] border border-white/10 rounded-xl p-4 flex flex-col lg:flex-row gap-4 items-center justify-between shadow-xl">
        <div className="flex-1 w-full lg:w-auto flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-2 px-4 py-1 bg-zinc-900 rounded-xl border border-white/5 focus-within:border-primary/40 transition-all flex-1">
            <span className="material-symbols-outlined text-zinc-500 text-lg">search</span>
            <input 
              className="bg-transparent border-none outline-none text-sm text-white w-full placeholder:text-zinc-600 focus:ring-0 p-3"
              placeholder="Buscar por Nombre, Email, Teléfono o DNI..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="text-zinc-500 hover:text-white"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <button 
            onClick={exportToCSV}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-zinc-900 border border-white/10 hover:bg-white/5 text-zinc-400 hover:text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">download</span> Exportar
          </button>
        </div>
      </div>

      {/* Customer Table */}
      <div className="bg-[#1A1A1A] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-[#1E1E1E]/50">
                <th className="py-4 px-6 font-label-md text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-black">Cliente / Contacto</th>
                <th className="py-4 px-6 font-label-md text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-black">Teléfono / DNI</th>
                <th className="py-4 px-6 font-label-md text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-black text-center">Marketing</th>
                <th className="py-4 px-6 font-label-md text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-black">Registro</th>
                <th className="py-4 px-6 font-label-md text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-black text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-data-tabular text-sm text-white">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-zinc-500 font-black uppercase tracking-widest animate-pulse">
                    Cargando clientes...
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-zinc-500 font-black uppercase tracking-widest">
                    {searchQuery ? 'No se encontraron clientes' : 'No hay clientes registrados'}
                  </td>
                </tr>
              ) : filteredCustomers.map((customer) => (
                <tr 
                  key={customer.id} 
                  className="hover:bg-white/[0.02] transition-colors group cursor-pointer"
                  onClick={() => window.location.href = `/customers/${customer.id}`}
                >
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-xs border border-primary/20 group-hover:scale-110 transition-transform">
                        {getInitials(customer)}
                      </div>
                      <div>
                        <div className="text-white font-bold flex items-center gap-2 group-hover:text-primary transition-colors">
                          {getFullName(customer)}
                        </div>
                        <div className="text-zinc-500 text-[10px] uppercase font-black tracking-widest mt-0.5">{customer.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="text-zinc-400 font-medium">{customer.phone || '—'}</div>
                    <div className="text-zinc-600 text-[10px] font-black tracking-widest mt-0.5">{customer.dni_cuit || '—'}</div>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black tracking-widest border ${
                      customer.accepts_marketing 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                        : 'bg-zinc-800 text-zinc-500 border-white/5'
                    }`}>
                      <span className="material-symbols-outlined text-[12px]">{customer.accepts_marketing ? 'check_circle' : 'block'}</span>
                      {customer.accepts_marketing ? 'Sí' : 'No'}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="text-zinc-400 text-xs">{new Date(customer.created_at).toLocaleDateString('es-AR')}</div>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(customer);
                        }}
                        className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-all active:scale-75"
                        title="Editar"
                      >
                        <span className="material-symbols-outlined text-[20px]">edit</span>
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCustomer(customer);
                        }}
                        className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-all active:scale-75"
                        title="Eliminar"
                      >
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nuevo Cliente */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-[#1A1A1A] border-b border-white/10 p-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white">Nuevo Cliente</h2>
                <p className="text-zinc-500 text-sm mt-1">Completa los datos del cliente</p>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-white/5 rounded-xl transition-colors"
              >
                <span className="material-symbols-outlined text-zinc-400">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Nombre</label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="Juan"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Apellido</label>
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="Pérez"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="juan@ejemplo.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Teléfono</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="+54 11 1234-5678"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">DNI / CUIT</label>
                  <input
                    type="text"
                    value={formData.dni_cuit}
                    onChange={(e) => setFormData({...formData, dni_cuit: e.target.value})}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="20-12345678-9"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Límite de Crédito (ARS)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.credit_limit}
                  onChange={(e) => setFormData({...formData, credit_limit: parseFloat(e.target.value) || 0})}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="0"
                />
                <p className="text-[10px] text-zinc-500 mt-1">0 = Sin límite de crédito</p>
              </div>

              <div className="flex items-center gap-3 p-4 bg-zinc-900/50 rounded-xl border border-white/5">
                <input
                  type="checkbox"
                  id="marketing"
                  checked={formData.accepts_marketing}
                  onChange={(e) => setFormData({...formData, accepts_marketing: e.target.checked})}
                  className="w-5 h-5 rounded border-white/10 bg-zinc-900 text-primary focus:ring-primary"
                />
                <label htmlFor="marketing" className="text-sm text-zinc-300 cursor-pointer">
                  Acepta recibir comunicaciones de marketing
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-5 py-3 bg-zinc-900 border border-white/10 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all font-bold text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-5 py-3 bg-primary-container text-white rounded-xl hover:bg-[#6D28D9] transition-all font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <span className="material-symbols-outlined animate-spin">refresh</span>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined">save</span>
                      Guardar Cliente
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Cliente */}
      {showEditModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-[#1A1A1A] border-b border-white/10 p-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white">Editar Cliente</h2>
                <p className="text-zinc-500 text-sm mt-1">{getFullName(selectedCustomer)}</p>
              </div>
              <button 
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedCustomer(null);
                }}
                className="p-2 hover:bg-white/5 rounded-xl transition-colors"
              >
                <span className="material-symbols-outlined text-zinc-400">close</span>
              </button>
            </div>

            <form onSubmit={handleEditCustomer} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Nombre</label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Apellido</label>
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Teléfono</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">DNI / CUIT</label>
                  <input
                    type="text"
                    value={formData.dni_cuit}
                    onChange={(e) => setFormData({...formData, dni_cuit: e.target.value})}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Límite de Crédito (ARS)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.credit_limit}
                  onChange={(e) => setFormData({...formData, credit_limit: parseFloat(e.target.value) || 0})}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="0"
                />
                <p className="text-[10px] text-zinc-500 mt-1">0 = Sin límite de crédito</p>
              </div>

              <div className="flex items-center gap-3 p-4 bg-zinc-900/50 rounded-xl border border-white/5">
                <input
                  type="checkbox"
                  id="edit-marketing"
                  checked={formData.accepts_marketing}
                  onChange={(e) => setFormData({...formData, accepts_marketing: e.target.checked})}
                  className="w-5 h-5 rounded border-white/10 bg-zinc-900 text-primary focus:ring-primary"
                />
                <label htmlFor="edit-marketing" className="text-sm text-zinc-300 cursor-pointer">
                  Acepta recibir comunicaciones de marketing
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedCustomer(null);
                  }}
                  className="flex-1 px-5 py-3 bg-zinc-900 border border-white/10 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all font-bold text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-5 py-3 bg-primary-container text-white rounded-xl hover:bg-[#6D28D9] transition-all font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <span className="material-symbols-outlined animate-spin">refresh</span>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined">save</span>
                      Guardar Cambios
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
