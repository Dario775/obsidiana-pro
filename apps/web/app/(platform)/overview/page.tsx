'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function PlatformDashboard() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Tenant Creation modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    slug: '',
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
      // 1. Fetch tenants
      const { data: tenantsData } = await supabase.from('tenants').select('*');
      setTenants(tenantsData || []);

      // 2. Fetch all orders across platform
      const { data: ordersData } = await supabase.from('orders').select('*');
      setOrders(ordersData || []);

      // 3. Fetch products across platform
      const { data: productsData } = await supabase.from('products').select('*');
      setProducts(productsData || []);

      // 4. Fetch customers across platform
      const { data: customersData } = await supabase.from('customers').select('*');
      setCustomers(customersData || []);

    } catch (err) {
      console.error(err);
      setTenants([]);
      setOrders([]);
      setProducts([]);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre || !formData.slug) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.from('tenants').insert([{
        nombre: formData.nombre,
        slug: formData.slug.toLowerCase().replace(/\s+/g, '-'),
        status: formData.status,
        online_store_enabled: formData.online_store_enabled
      }]).select();

      if (!error && data) {
        setFormData({ nombre: '', slug: '', status: 'active', online_store_enabled: true });
        setShowAddModal(false);
        fetchData();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const totalSales = orders.reduce((acc, order) => acc + (order.total_ars || 0), 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-zinc-500 font-bold uppercase tracking-widest text-xs gap-3">
        <span className="material-symbols-outlined text-4xl animate-spin text-primary">autorenew</span>
        Cargando Panel de Super Admin...
      </div>
    );
  }

  return (
    <>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-white">Platform Overview</h1>
          <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">Real-time status of the Obsidiana SaaS ecosystem.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-xl transition-all shadow-lg text-xs font-black uppercase tracking-wider"
        >
          <span className="material-symbols-outlined text-sm font-black">add</span>
          Nuevo Tenant
        </button>
      </div>

      {/* Global Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Ingresos Totales (SaaS)', value: `$${totalSales?.toLocaleString() || 0}`, trend: 'Activo', icon: 'payments', color: 'emerald' },
          { label: 'Tenants Registrados', value: tenants.length.toString(), trend: 'Directo', icon: 'store', color: 'violet' },
          { label: 'Total Clientes', value: customers.length.toString(), trend: 'Consolidado', icon: 'group', color: 'blue' },
          { label: 'Total Productos', value: products.length.toString(), trend: 'Catálogo', icon: 'inventory_2', color: 'amber' },
        ].map((metric, i) => (
          <div key={i} className="bg-zinc-900 border border-white/5 rounded-xl p-6 shadow-xl relative overflow-hidden group hover:border-white/20 transition-all">
            <div className={`absolute -right-4 -top-4 w-20 h-20 bg-${metric.color}-500/10 rounded-full blur-2xl`}></div>
            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-4">{metric.label}</p>
            <div className="flex items-baseline justify-between">
              <h3 className="text-3xl font-black text-white tracking-tighter">{metric.value}</h3>
              <span className={`text-[10px] font-black text-${metric.color}-400 uppercase tracking-widest`}>{metric.trend}</span>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className={`material-symbols-outlined text-[18px] text-${metric.color}-400`}>{metric.icon}</span>
              <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                <div className={`h-full bg-${metric.color}-500 w-full`}></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tenant Activity & Infrastructure */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-zinc-900 border border-white/5 rounded-xl overflow-hidden shadow-2xl flex flex-col">
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-widest text-white">Tenants en la Plataforma</h3>
            <span className="text-[10px] text-violet-400 font-black uppercase tracking-widest">Activos</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 bg-white/5">
                  <th className="py-3 px-6 text-[10px] font-black uppercase tracking-widest text-zinc-500">Tenant</th>
                  <th className="py-3 px-6 text-[10px] font-black uppercase tracking-widest text-zinc-500">Slug</th>
                  <th className="py-3 px-6 text-[10px] font-black uppercase tracking-widest text-zinc-500">Status</th>
                  <th className="py-3 px-6 text-[10px] font-black uppercase tracking-widest text-zinc-500">Tienda Online</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {tenants.map((t, i) => (
                  <tr key={t.id || i} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-zinc-800 border border-white/10 flex items-center justify-center font-black text-[10px]">
                          {t.nombre ? t.nombre.charAt(0).toUpperCase() : 'T'}
                        </div>
                        <span className="text-xs font-bold text-white">{t.nombre}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t.slug}</td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${t.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'}`}>
                        {t.status || 'active'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${t.online_store_enabled ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20' : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'}`}>
                        {t.online_store_enabled ? 'Habilitada' : 'Deshabilitada'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-zinc-900 border border-white/5 rounded-xl p-6 shadow-2xl flex flex-col gap-6">
          <h3 className="text-xs font-black uppercase tracking-widest text-white">Estado de la Infraestructura</h3>
          <div className="space-y-6">
            {[
              { label: 'Database (Supabase)', status: 'Operacional', uptime: '99.99%', color: 'emerald' },
              { label: 'Edge Network (Vercel)', status: 'Operacional', uptime: '100%', color: 'emerald' },
              { label: 'ARCA Bridge', status: 'Activo', uptime: '100%', color: 'emerald' },
              { label: 'MercadoPago Webhooks', status: 'Operacional', uptime: '99.8%', color: 'emerald' },
            ].map((s, i) => (
              <div key={i} className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-zinc-400">{s.label}</span>
                  <span className={`text-[9px] font-black uppercase tracking-widest text-${s.color}-400`}>{s.status}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full bg-${s.color}-500 w-full`}></div>
                  </div>
                  <span className="text-[9px] font-black text-zinc-500">{s.uptime}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAddModal && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <form onSubmit={handleCreateTenant} className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-md p-6 overflow-hidden shadow-2xl flex flex-col gap-6 relative">
            <button 
              type="button"
              onClick={() => setShowAddModal(false)}
              className="absolute right-4 top-4 p-2 text-zinc-500 hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>

            <div>
              <h3 className="text-lg font-black tracking-wider uppercase text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">add_business</span>
                Crear Nuevo Tenant
              </h3>
              <p className="text-zinc-500 text-xs font-black uppercase tracking-widest mt-1">
                Registra un nuevo merchant en la plataforma
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
                <label className="block text-zinc-400 text-xs font-black uppercase tracking-widest mb-1">Subdominio / Slug</label>
                <input
                  type="text"
                  required
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="Ej. moda-urbana"
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                />
              </div>

              <div className="flex gap-4">
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

                <div className="flex-1 flex flex-col justify-center">
                  <label className="flex items-center gap-2 cursor-pointer mt-5">
                    <input
                      type="checkbox"
                      checked={formData.online_store_enabled}
                      onChange={(e) => setFormData({ ...formData, online_store_enabled: e.target.checked })}
                      className="accent-primary w-4 h-4 rounded"
                    />
                    <span className="text-zinc-300 text-xs font-black uppercase tracking-widest">Tienda Online</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
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
                {saving ? 'Guardando...' : 'Crear Merchant'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
