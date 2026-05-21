'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function TenantsPage() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Detail panel
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
      const [tenantsRes, plansRes] = await Promise.all([
        supabase.from('tenants').select('*'),
        supabase.from('plans').select('*'),
      ]);

      const tenantsData = tenantsRes.data || [];
      const plansData = plansRes.data || [];

      setTenants(tenantsData);
      setPlans(plansData);

      // Fetch product counts per tenant
      if (tenantsData.length > 0) {
        const counts: Record<string, number> = {};
        const members: Record<string, number> = {};

        const productPromises = tenantsData.map(async (t: any) => {
          const { count } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', t.id);
          counts[t.id] = count || 0;
        });

        const memberPromises = tenantsData.map(async (t: any) => {
          const { count } = await supabase
            .from('tenant_members')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', t.id);
          members[t.id] = count || 0;
        });

        await Promise.all([...productPromises, ...memberPromises]);
        setProductCounts(counts);
        setMemberCounts(members);
      }
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

  const formatDate = (d: string | null | undefined) => {
    if (!d) return null;
    return new Date(d).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
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
                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 w-6"></th>
                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">Tienda</th>
                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">Contacto</th>
                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">Plan</th>
                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">Recursos</th>
                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">Estado</th>
                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">Tienda Online</th>
                <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">Registro</th>
                <th className="py-3 px-4 text-right text-[10px] font-black uppercase tracking-widest text-zinc-500">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {tenants.map((t, i) => {
                const plan = plans.find(p => p.id === t.plan_id);
                const isExpanded = expandedId === t.id;
                const products = productCounts[t.id] || 0;
                const members = memberCounts[t.id] || 0;
                const maxProducts = plan?.max_products || 50;

                return (
                  <React.Fragment key={t.id || i}>
                    {/* Main Row */}
                    <tr className={`hover:bg-white/[0.02] transition-colors group ${isExpanded ? 'bg-white/[0.03]' : ''}`}>
                      {/* Expand toggle */}
                      <td className="py-4 px-4">
                        <button
                          onClick={() => toggleExpand(t.id)}
                          className="p-1 text-zinc-600 hover:text-white transition-colors"
                          title="Ver detalles"
                        >
                          <span className={`material-symbols-outlined text-[16px] transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                            chevron_right
                          </span>
                        </button>
                      </td>

                      {/* Tienda */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          {t.logo_url ? (
                            <img
                              src={t.logo_url}
                              alt={t.nombre}
                              className="w-9 h-9 rounded-lg object-cover border border-white/10"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-600/30 to-fuchsia-600/30 border border-white/10 flex items-center justify-center font-black text-[11px] text-violet-300">
                              {t.nombre ? t.nombre.charAt(0).toUpperCase() : 'T'}
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-white">{t.nombre}</span>
                            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">{t.slug}</span>
                          </div>
                        </div>
                      </td>

                      {/* Contacto */}
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-0.5 max-w-[180px]">
                          {t.email ? (
                            <span className="text-[10px] text-zinc-300 truncate flex items-center gap-1">
                              <span className="material-symbols-outlined text-[12px] text-zinc-600">mail</span>
                              {t.email}
                            </span>
                          ) : null}
                          {t.phone ? (
                            <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[12px] text-zinc-600">phone</span>
                              {t.phone}
                            </span>
                          ) : null}
                          {!t.email && !t.phone && (
                            <span className="text-[9px] text-zinc-600 italic">Sin contacto</span>
                          )}
                        </div>
                      </td>

                      {/* Plan */}
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-black text-violet-400 uppercase tracking-widest bg-violet-500/5 px-2 py-0.5 rounded border border-violet-500/10 inline-block w-fit">
                            {plan ? (plan.name || plan.nombre) : 'Sin Plan'}
                          </span>
                          <div className="flex flex-col">
                            <span className={`text-[9px] font-bold ${t.paid_until && new Date(t.paid_until) < new Date() ? 'text-red-400' : 'text-zinc-400'}`}>
                              {t.paid_until ? `Vence: ${formatDate(t.paid_until)}` : 'Sin vencimiento'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Recursos */}
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[12px] text-zinc-600">inventory_2</span>
                            <span className="text-[10px] font-bold text-zinc-300">{products}</span>
                            <span className="text-[9px] text-zinc-600">/ {maxProducts}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[12px] text-zinc-600">group</span>
                            <span className="text-[10px] font-bold text-zinc-300">{members}</span>
                            <span className="text-[9px] text-zinc-600">miembros</span>
                          </div>
                        </div>
                      </td>

                      {/* Estado */}
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${
                          t.status === 'active' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : t.status === 'trial'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                        }`}>
                          {t.status === 'active' ? 'Activo' : t.status === 'trial' ? 'Prueba' : 'Inactivo'}
                        </span>
                      </td>

                      {/* Tienda Online */}
                      <td className="py-4 px-4">
                        {t.online_store_enabled || t.store_active ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            Activa
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-zinc-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-600"></span>
                            Inactiva
                          </span>
                        )}
                      </td>

                      {/* Registro */}
                      <td className="py-4 px-4">
                        <span className="text-[10px] font-bold text-zinc-400">
                          {formatDate(t.created_at) || '-'}
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => toggleExpand(t.id)}
                            className="p-2 text-zinc-500 hover:text-blue-400 hover:bg-blue-500/5 rounded-xl transition-all"
                            title="Ver perfil completo"
                          >
                            <span className="material-symbols-outlined text-[16px]">visibility</span>
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(t)}
                            className="p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteTenant(t.id)}
                            className="p-2 text-red-500/60 hover:text-red-400 hover:bg-red-500/5 rounded-xl transition-all"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Detail Row */}
                    {isExpanded && (
                      <tr className="bg-white/[0.015]">
                        <td colSpan={9} className="px-6 py-5">
                          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">

                            {/* Datos de Contacto */}
                            <div className="bg-zinc-950/60 border border-white/5 rounded-xl p-4">
                              <h4 className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[14px] text-violet-400">contact_mail</span>
                                Datos de Contacto
                              </h4>
                              <div className="space-y-2">
                                <InfoRow icon="mail" label="Email" value={t.email} />
                                <InfoRow icon="phone" label="Teléfono" value={t.phone} />
                                <InfoRow icon="location_on" label="Dirección" value={t.address} />
                                <InfoRow icon="badge" label="CUIT" value={t.cuit} />
                              </div>
                            </div>

                            {/* Tienda Online */}
                            <div className="bg-zinc-950/60 border border-white/5 rounded-xl p-4">
                              <h4 className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[14px] text-emerald-400">storefront</span>
                                Tienda Online
                              </h4>
                              <div className="space-y-2">
                                <InfoRow icon="store" label="Nombre" value={t.store_name} />
                                <InfoRow icon="language" label="Dominio" value={t.store_domain} />
                                <InfoRow icon="palette" label="Tema" value={t.store_theme} />
                                <InfoRow icon="view_quilt" label="Template" value={t.store_template} />
                                <InfoRow icon="attach_money" label="Moneda" value={t.store_currency} />
                                <InfoRow icon="local_shipping" label="Envío" value={t.store_shipping_enabled ? `Habilitado ($${t.store_shipping_cost || 0})` : 'Deshabilitado'} />
                                {t.store_tagline && (
                                  <InfoRow icon="format_quote" label="Tagline" value={t.store_tagline} />
                                )}
                              </div>
                            </div>

                            {/* Redes Sociales & ML */}
                            <div className="bg-zinc-950/60 border border-white/5 rounded-xl p-4">
                              <h4 className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[14px] text-blue-400">share</span>
                                Redes & Integraciones
                              </h4>
                              <div className="space-y-2">
                                <InfoRow icon="photo_camera" label="Instagram" value={t.store_social_instagram} />
                                <InfoRow icon="thumb_up" label="Facebook" value={t.store_social_facebook} />
                                <InfoRow icon="chat" label="WhatsApp" value={t.store_social_whatsapp} />
                                <div className="border-t border-white/5 pt-2 mt-2">
                                  <InfoRow icon="shopping_bag" label="ML Afiliado" value={t.ml_affiliate_id} />
                                  <InfoRow icon="key" label="ML User ID" value={t.ml_user_id} />
                                  <InfoRow icon="token" label="ML Token" value={t.ml_access_token ? '••••••' + t.ml_access_token.slice(-6) : null} />
                                </div>
                              </div>
                            </div>

                            {/* Suscripción & Métricas */}
                            <div className="bg-zinc-950/60 border border-white/5 rounded-xl p-4">
                              <h4 className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[14px] text-amber-400">insights</span>
                                Suscripción & Métricas
                              </h4>
                              <div className="space-y-2">
                                <InfoRow icon="credit_card" label="Plan" value={plan ? (plan.name || plan.nombre) : 'Sin Plan'} />
                                <InfoRow icon="event" label="Inicio Plan" value={formatDate(t.plan_started_at)} />
                                <InfoRow icon="event_busy" label="Vencimiento" value={formatDate(t.paid_until)} />
                                <InfoRow icon="verified" label="Estado Suscripción" value={t.subscription_status || 'N/A'} />
                                <div className="border-t border-white/5 pt-2 mt-2">
                                  <InfoRow icon="inventory_2" label="Productos" value={`${products} / ${maxProducts}`} />
                                  <InfoRow icon="group" label="Miembros" value={String(members)} />
                                  <InfoRow icon="calendar_today" label="Registrado" value={formatDate(t.created_at)} />
                                </div>
                                {t.is_demo && (
                                  <span className="inline-block mt-1 text-[8px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
                                    Demo
                                  </span>
                                )}
                                {t.is_platform_admin && (
                                  <span className="inline-block mt-1 text-[8px] font-black uppercase tracking-widest bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full">
                                    Platform Admin
                                  </span>
                                )}
                              </div>
                            </div>

                          </div>

                          {/* Description row */}
                          {t.store_description && (
                            <div className="mt-4 bg-zinc-950/40 border border-white/5 rounded-xl p-4">
                              <h4 className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[14px] text-zinc-400">description</span>
                                Descripción de la Tienda
                              </h4>
                              <p className="text-xs text-zinc-400 leading-relaxed">{t.store_description}</p>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
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

/** Reusable info row for the expanded detail panel */
function InfoRow({ icon, label, value }: { icon: string; label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-start gap-2">
      <span className="material-symbols-outlined text-[13px] text-zinc-600 mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <span className="text-[8px] font-black text-zinc-600 uppercase tracking-[0.15em] block">{label}</span>
        <span className={`text-[11px] font-bold block truncate ${value ? 'text-zinc-300' : 'text-zinc-700 italic'}`}>
          {value || 'No configurado'}
        </span>
      </div>
    </div>
  );
}
