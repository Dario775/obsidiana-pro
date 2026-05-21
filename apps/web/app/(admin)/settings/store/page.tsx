'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/hooks/use-tenant';
import { FeatureGate } from '@/components/feature-gate';
import { uploadImageToCloudinary } from '@/lib/cloudinary';

const THEME_COLORS = [
  { id: 'violet', name: 'Violeta', color: '#8b5cf6', text: '#fff' },
  { id: 'blue', name: 'Azul', color: '#3b82f6', text: '#fff' },
  { id: 'emerald', name: 'Verde', color: '#10b981', text: '#fff' },
  { id: 'rose', name: 'Rosa', color: '#f43f5e', text: '#fff' },
  { id: 'amber', name: 'Ámbar', color: '#f59e0b', text: '#000' },
  { id: 'cyan', name: 'Cian', color: '#06b6d4', text: '#fff' },
  { id: 'slate', name: 'Gris', color: '#64748b', text: '#fff' },
];

const TEMPLATES = [
  { id: 'classic', name: 'Clásica', icon: 'grid_view', desc: 'Cards de producto' },
  { id: 'minimal', name: 'Minimalista', icon: 'minimalist', desc: 'Diseño limpio' },
  { id: 'list', name: 'Lista', icon: 'format_list_bulleted', desc: 'Precio rápido' },
];

const FONTS = [
  { id: 'sans', name: 'Sans Estándar', sample: 'Limpia, rápida y familiar (system-ui)' },
  { id: 'serif', name: 'Outfit Boutique', sample: 'Geométrica, lujosa y premium (Outfit)' },
  { id: 'mono', name: 'Inter Elegante', sample: 'Limpia, moderna y corporativa (Inter)' },
];

type Appearance = {
  template: 'classic' | 'minimal' | 'list';
  theme_color: 'violet' | 'blue' | 'emerald' | 'rose' | 'amber' | 'slate';
  font_family: 'sans' | 'serif' | 'mono';
  dark_mode: boolean;
};

type Tab = 'general' | 'apariencia' | 'envio' | 'social' | 'pagos';

export default function StoreSettingsPage() {
  const { tenant } = useTenant();
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState({
    store_name: '',
    store_description: '',
    store_domain: '',
    store_active: false,
    store_theme: 'violet',
    store_template: 'classic',
    store_logo_url: '',
    store_banner_url: '',
    store_banners: [] as string[],
    store_tagline: '',
    store_currency: 'ARS',
    store_min_order_amount: 0,
    store_shipping_enabled: true,
    store_shipping_free_threshold: 0,
    store_shipping_cost: 0,
    store_social_instagram: '',
    store_social_facebook: '',
    store_social_whatsapp: '',
    store_mp_access_token: '',
    store_mp_public_key: '',
    ml_affiliate_id: '',
    ml_affiliate_word: '',
  });
  
  const [uploading, setUploading] = useState(false);
  const [appearance, setAppearance] = useState<Appearance>({
    template: 'classic',
    theme_color: 'violet',
    font_family: 'sans',
    dark_mode: false,
  });
  const [shippingZones, setShippingZones] = useState<Array<{ id: string; name: string; postal_codes: string[]; cost: number }>>([]);
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneCost, setNewZoneCost] = useState(0);
  const [newZoneCodes, setNewZoneCodes] = useState('');
  const [isAddingZone, setIsAddingZone] = useState(false);

  const handleAddZone = () => {
    if (!newZoneName) return;
    const codes = newZoneCodes.split(',').map(c => c.trim()).filter(Boolean);
    const newZone = {
      id: Math.random().toString(36).substring(2, 9),
      name: newZoneName,
      cost: newZoneCost,
      postal_codes: codes
    };
    setShippingZones(prev => [...prev, newZone]);
    setNewZoneName('');
    setNewZoneCost(0);
    setNewZoneCodes('');
    setIsAddingZone(false);
  };

  const handleDeleteZone = (id: string) => {
    setShippingZones(prev => prev.filter(z => z.id !== id));
  };

  const logoFileRef = useRef<HTMLInputElement>(null);

  const [transferEnabled, setTransferEnabled] = useState(true);
  const [transferBank, setTransferBank] = useState('');
  const [transferHolder, setTransferHolder] = useState('');
  const [transferAccount, setTransferAccount] = useState('');
  const [transferCbu, setTransferCbu] = useState('');
  const [transferAlias, setTransferAlias] = useState('');

  useEffect(() => {
    if (tenant) {
      const t = tenant as any;
      setForm({
        store_name: t.store_name || tenant.nombre || '',
        store_description: t.store_description || '',
        store_domain: t.store_domain || '',
        store_active: t.store_active || false,
        store_theme: t.store_theme || 'violet',
        store_template: t.store_template || 'classic',
        store_logo_url: t.store_logo_url || '',
        store_banner_url: t.store_banner_url || '',
        store_banners: t.store_banners || [],
        store_tagline: t.store_tagline || '',
        store_currency: t.store_currency || 'ARS',
        store_min_order_amount: t.store_min_order_amount || 0,
        store_shipping_enabled: t.store_shipping_enabled ?? true,
        store_shipping_free_threshold: t.store_shipping_free_threshold || 0,
        store_shipping_cost: t.store_shipping_cost || 0,
        store_social_instagram: t.store_social_instagram || '',
        store_social_facebook: t.store_social_facebook || '',
        store_social_whatsapp: t.store_social_whatsapp || '',
        store_mp_access_token: t.store_mp_access_token || '',
        store_mp_public_key: t.store_mp_public_key || '',
        ml_affiliate_id: t.ml_affiliate_id || '',
        ml_affiliate_word: t.ml_affiliate_word || '',
      });
      
      if (t.settings?.store_shipping_zones) {
        setShippingZones(t.settings.store_shipping_zones);
      } else {
        setShippingZones([]);
      }
      
      if (t.store_payment_methods && Array.isArray(t.store_payment_methods)) {
        const transfer = t.store_payment_methods.find((m: any) => m.id === 'transfer');
        if (transfer) {
          setTransferEnabled(transfer.enabled ?? true);
          if (transfer.config) {
            setTransferBank(transfer.config.bank || '');
            setTransferHolder(transfer.config.holder || '');
            setTransferAccount(transfer.config.account || '');
            setTransferCbu(transfer.config.cbu || '');
            setTransferAlias(transfer.config.alias || '');
          }
        }
      }

      if (t.store_appearance) {
        setAppearance(prev => ({
          ...prev,
          ...t.store_appearance
        }));
      }
    }
  }, [tenant]);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const result = await uploadImageToCloudinary(file, { folder: `obsidiana/${tenant?.id}/logo` });
    if (result?.secure_url) {
      setForm(f => ({ ...f, store_logo_url: result.secure_url }));
    }
    setUploading(false);
  }

  const bannerFileRef = useRef<HTMLInputElement>(null);

  async function handleBannerUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || form.store_banners.length >= 3) return;
    setUploading(true);
    const result = await uploadImageToCloudinary(file, { folder: `obsidiana/${tenant?.id}/banners` });
    if (result?.secure_url) {
      setForm(f => ({ ...f, store_banners: [...f.store_banners, result.secure_url] }));
    }
    setUploading(false);
  }

  async function handleSave() {
    const tenantId = tenant?.id;
    if (!tenantId) return;
    
    setSaving(true);
    try {
      const mergedSettings = {
        ...(tenant?.settings || {}),
        store_shipping_zones: shippingZones
      };

      const existingMethods = tenant?.store_payment_methods || [
        { id: 'cash', name: 'Efectivo', enabled: false, icon: 'payments' },
        { id: 'transfer', name: 'Transferencia', enabled: true, icon: 'account_balance' },
        { id: 'mp', name: 'MercadoPago', enabled: true, icon: 'payment' }
      ];

      const updatedMethods = existingMethods.map((m: any) => {
        if (m.id === 'transfer') {
          return {
            ...m,
            enabled: transferEnabled,
            config: {
              bank: transferBank,
              holder: transferHolder,
              account: transferAccount,
              cbu: transferCbu,
              alias: transferAlias
            }
          };
        }
        if (m.id === 'mp') {
          return {
            ...m,
            enabled: !!(form.store_mp_public_key || form.store_mp_access_token)
          };
        }
        return m;
      });

      const { data, error } = await supabase.from('tenants').update({
        store_name: form.store_name,
        store_description: form.store_description,
        store_domain: form.store_domain,
        store_active: form.store_active,
        store_theme: appearance.theme_color,
        store_template: appearance.template,
        store_logo_url: form.store_logo_url || null,
        store_banner_url: form.store_banner_url || null,
        store_banners: form.store_banners.length > 0 ? form.store_banners : null,
        store_tagline: form.store_tagline || null,
        store_currency: form.store_currency,
        store_min_order_amount: form.store_min_order_amount,
        store_shipping_enabled: form.store_shipping_enabled,
        store_shipping_free_threshold: form.store_shipping_free_threshold > 0 ? form.store_shipping_free_threshold : null,
        store_shipping_cost: form.store_shipping_cost,
        store_social_instagram: form.store_social_instagram || null,
        store_social_facebook: form.store_social_facebook || null,
        store_social_whatsapp: form.store_social_whatsapp || null,
        store_mp_access_token: form.store_mp_access_token || null,
        store_mp_public_key: form.store_mp_public_key || null,
        ml_affiliate_id: form.ml_affiliate_id || null,
        ml_affiliate_word: form.ml_affiliate_word || null,
        store_appearance: appearance,
        settings: mergedSettings,
        store_payment_methods: updatedMethods,
      })
      .eq('id', tenantId)
      .select();

      if (error) throw error;
      
      if (!data || data.length === 0) {
        alert('No se pudo actualizar el negocio. Puede que no tengas permisos.');
      } else {
        alert('Configuración guardada exitosamente');
      }
    } catch (error: any) {
      console.error('Error saving:', error);
      alert('Error al guardar: ' + (error.message || 'Error desconocido'));
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive() {
    const tenantId = tenant?.id;
    if (!tenantId) return;

    const nextState = !form.store_active;
    
    // Update local state first
    setForm(f => ({ ...f, store_active: nextState }));
    
    try {
      const { error } = await supabase
        .from('tenants')
        .update({ store_active: nextState })
        .eq('id', tenantId);
        
      if (error) throw error;
    } catch (err: any) {
      console.error('Error toggling store_active:', err);
      alert('Error al cambiar el estado de la tienda: ' + err.message);
      // Revert state
      setForm(f => ({ ...f, store_active: !nextState }));
    }
  }

  const previewItem = form.store_domain 
    ? `/tienda/${form.store_domain}` 
    : (tenant?.slug ? `/tienda/${tenant.slug}` : '');

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'general', label: 'General', icon: 'settings' },
    { id: 'apariencia', label: 'Apariencia', icon: 'palette' },
    { id: 'envio', label: 'Envío', icon: 'local_shipping' },
    { id: 'social', label: 'Social', icon: 'share' },
    { id: 'pagos', label: 'Pagos', icon: 'payments' },
  ];

  const currentTheme = THEME_COLORS.find(t => t.id === appearance.theme_color) || THEME_COLORS[0];

  return (
    <FeatureGate feature="online_store">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white">Tienda Online</h1>
            <p className="text-sm text-zinc-500">Personalizá tu negocio</p>
          </div>
          {form.store_active ? (
            <span className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-full text-sm font-medium">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
              Activa
            </span>
          ) : (
            <span className="px-3 py-1.5 bg-zinc-800 text-zinc-400 rounded-full text-sm font-medium">Inactiva</span>
          )}
        </div>

        {/* Preview Link */}
        {previewItem && (
          <a href={previewItem} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 py-3 bg-white text-zinc-900 rounded-xl font-bold hover:bg-zinc-100">
            <span className="material-symbols-outlined">visibility</span>
            Ver mi tienda
          </a>
        )}

        {/* Toggle Active */}
        <div className="flex items-center justify-between p-4 bg-zinc-900 rounded-xl">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-xl text-zinc-400">power_settings</span>
            <div>
              <p className="text-white font-medium">Tienda {form.store_active ? 'Activa' : 'Inactiva'}</p>
              <p className="text-xs text-zinc-500">{form.store_active ? 'Visible para todos' : 'Solo vos la ves'}</p>
            </div>
          </div>
          <button
            onClick={handleToggleActive}
            className={`w-12 h-6 rounded-full transition-colors ${form.store_active ? 'bg-secondary' : 'bg-zinc-700'}`}
          >
            <span className={`block w-5 h-5 rounded-full bg-white transition-transform ${form.store_active ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 border-b border-zinc-200 dark:border-white/5 bg-transparent px-4">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3 text-xs font-black uppercase tracking-widest transition-all relative flex items-center gap-2 outline-none ${
                  isActive 
                    ? 'text-secondary font-black' 
                    : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                {tab.label}
                {isActive && (
                  <div className="absolute bottom-0 left-0 w-full h-[2px] bg-secondary shadow-[0_0_15px_rgba(var(--secondary),0.6)] animate-in fade-in duration-200" />
                )}
              </button>
            );
          })}
        </div>

{/* Tab Content */}
        <div className="p-6 bg-zinc-900 rounded-xl space-y-6">
          {/* General Tab */}
          {activeTab === 'general' && (
            <>
              {/* Store Name */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Nombre de la tienda</label>
                <input
                  type="text"
                  value={form.store_name}
                  onChange={(e) => setForm(f => ({ ...f, store_name: e.target.value }))}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-secondary/70 focus:ring-2 focus:ring-secondary/20 transition-all"
                  placeholder="Mi Tienda"
                />
              </div>

              {/* Store URL */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">URL personalizada</label>
                <div className="flex">
                  <span className="bg-zinc-800 border border-white/10 border-r-0 rounded-l-xl px-4 py-3 text-sm text-zinc-500">obsidiana.app/</span>
                  <input
                    type="text"
                    value={form.store_domain}
                    onChange={(e) => setForm(f => ({ ...f, store_domain: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') }))}
                    className="flex-1 bg-zinc-950 border border-white/10 rounded-r-xl px-4 py-3 text-white focus:outline-none focus:border-secondary/70 focus:ring-2 focus:ring-secondary/20 transition-all"
                    placeholder="mitienda"
                  />
                </div>
              </div>

              {/* Tagline */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Descripción corta</label>
                <input
                  type="text"
                  value={form.store_tagline}
                  onChange={(e) => setForm(f => ({ ...f, store_tagline: e.target.value }))}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-secondary/70 focus:ring-2 focus:ring-secondary/20 transition-all"
                  placeholder="Los mejores productos de la ciudad"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Descripción (opcional)</label>
                <textarea
                  value={form.store_description}
                  onChange={(e) => setForm(f => ({ ...f, store_description: e.target.value }))}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-secondary/70 focus:ring-2 focus:ring-secondary/20 transition-all"
                  rows={3}
                  placeholder="Contá brevemente sobre tu negocio..."
                />
              </div>

              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Logo</label>
                <div className="flex items-center gap-4">
                  <input type="file" ref={logoFileRef} accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  <div 
                    onClick={() => logoFileRef.current?.click()}
                    className="w-24 h-24 rounded-xl border-2 border-dashed border-white/20 flex items-center justify-center bg-zinc-950 overflow-hidden cursor-pointer hover:border-white/40 transition-colors"
                  >
                    {form.store_logo_url ? (
                      <img src={form.store_logo_url} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <span className="material-symbols-outlined text-zinc-600">add_photo_alternate</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <button type="button" onClick={() => logoFileRef.current?.click()} className="text-zinc-400 text-sm hover:text-white">
                      {form.store_logo_url ? 'Cambiar logo' : 'Subir logo'}
                    </button>
                    {form.store_logo_url && (
                      <button type="button" onClick={() => setForm(f => ({ ...f, store_logo_url: '' }))} className="block text-red-400 text-sm mt-2 hover:underline">
                        Eliminar logo
                      </button>
                    )}
                     <p className="text-xs text-zinc-600 mt-1">JPG, PNG o WEBP, cuadrada, mínimo 200x200px (máx. 2MB)</p>
                  </div>
                </div>
              </div>

              {/* Banner Upload - Single or Carousel */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Banner de portada {form.store_banners.length > 1 ? '(carrusel)' : ''}
                </label>
                <input type="file" ref={bannerFileRef} accept="image/*" onChange={handleBannerUpload} className="hidden" />
                
                {form.store_banners.length > 0 ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      {form.store_banners.map((banner, idx) => (
                        <div key={idx} className="relative aspect-video rounded-lg overflow-hidden group">
                          <img src={banner} alt={`Banner ${idx + 1}`} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button
                              onClick={() => setForm(f => ({ ...f, store_banners: f.store_banners.filter((_, i) => i !== idx) }))}
                              className="p-2 bg-red-500 rounded-full text-white"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          </div>
                          {idx === 0 && (
                            <span className="absolute top-1 left-1 px-2 py-0.5 bg-black/60 text-white text-xs rounded">Principal</span>
                          )}
                        </div>
                      ))}
                      {form.store_banners.length < 3 && (
                        <div 
                          onClick={() => bannerFileRef.current?.click()}
                          className="aspect-video rounded-lg border-2 border-dashed border-white/20 flex items-center justify-center cursor-pointer hover:border-white/40 transition-colors"
                        >
                          <span className="material-symbols-outlined text-zinc-600">add_photo_alternate</span>
</div>
            )}

          {/* ML Affiliate Tab */}

        </div>
                    {form.store_banners.length < 3 && (
                      <p className="text-xs text-zinc-500">
                        Agregá hasta 3 imágenes. La primera será el banner principal. <br />
                        <strong>Recomendado:</strong> Proporción 3:1 (ej. 1200x400px), formatos JPG, PNG o WEBP (máx. 2MB c/u) para optimizar la velocidad.
                      </p>
                    )}
                  </div>
                ) : (
                  <div 
                    onClick={() => bannerFileRef.current?.click()}
                    className="h-40 rounded-xl border-2 border-dashed border-white/20 flex items-center justify-center cursor-pointer hover:border-white/40 transition-colors"
                  >
                    <div className="text-center p-4">
                      <span className="material-symbols-outlined text-4xl text-zinc-600 mb-2">add_photo_alternate</span>
                      <p className="text-zinc-500 text-sm font-semibold">Subir banner de portada</p>
                      <p className="text-zinc-500 text-xs mt-1">Opcional - Carrusel de hasta 3 imágenes</p>
                      <p className="text-zinc-600 text-[11px] mt-2 max-w-md mx-auto">
                        <strong>Dimensiones recomendadas:</strong> Relación de aspecto horizontal de 1200x400px (o proporción 3:1). <br />
                        <strong>Formatos admitidos:</strong> JPG, PNG o WEBP (máx. 2MB por imagen) para una velocidad de carga óptima.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Apariencia Tab */}
          {activeTab === 'apariencia' && (
            <>
              {/* Template Selection */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-3">Estilo de tienda</label>
                <div className="grid grid-cols-3 gap-3">
                  {TEMPLATES.map(tpl => (
                    <button
                      key={tpl.id}
                      onClick={() => setAppearance(a => ({ ...a, template: tpl.id as Appearance['template'] }))}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        appearance.template === tpl.id 
                          ? 'border-secondary bg-secondary/5 ring-1 ring-secondary/35 text-secondary' 
                          : 'border-zinc-200 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20'
                      }`}
                    >
                      <span className="material-symbols-outlined text-2xl text-zinc-400 mb-1 block">{tpl.icon}</span>
                      <p className="text-white text-sm font-medium">{tpl.name}</p>
                      <p className="text-zinc-500 text-xs">{tpl.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme Color */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-3">Color principal</label>
                <div className="flex gap-2">
                  {THEME_COLORS.map(theme => (
                    <button
                      key={theme.id}
                      onClick={() => setAppearance(a => ({ ...a, theme_color: theme.id as Appearance['theme_color'] }))}
                      className={`w-10 h-10 rounded-full transition-all ${appearance.theme_color === theme.id ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900' : ''}`}
                      style={{ backgroundColor: theme.color }}
                      title={theme.name}
                    />
                  ))}
                </div>
              </div>

              {/* Font Family */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-3">Tipografía</label>
                <div className="flex gap-3">
                  {FONTS.map(font => (
                    <button
                      key={font.id}
                      onClick={() => setAppearance(a => ({ ...a, font_family: font.id as Appearance['font_family'] }))}
                      className={`flex-1 p-3 rounded-xl border-2 transition-all ${
                        appearance.font_family === font.id 
                          ? 'border-secondary bg-secondary/5 ring-1 ring-secondary/35 text-secondary' 
                          : 'border-zinc-200 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20'
                      }`}
                      style={{ fontFamily: font.id === 'sans' ? 'system-ui' : font.id === 'serif' ? '"Outfit"' : '"Inter"' }}
                    >
                      <p className="text-white text-sm">{font.name}</p>
                      <p className="text-zinc-500 text-xs mt-1">{font.sample}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dark Mode Toggle */}
              <div className="flex items-center justify-between p-4 bg-zinc-950 rounded-xl">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-xl text-zinc-400">dark_mode</span>
                  <div>
                    <p className="text-white font-medium">Modo oscuro</p>
                    <p className="text-xs text-zinc-500">Fondo oscuro para la tienda</p>
                  </div>
                </div>
                <button
                  onClick={() => setAppearance(a => ({ ...a, dark_mode: !a.dark_mode }))}
                  className={`w-12 h-6 rounded-full transition-colors ${appearance.dark_mode ? 'bg-secondary' : 'bg-zinc-700'}`}
                >
                  <span className={`block w-5 h-5 rounded-full bg-white transition-transform ${appearance.dark_mode ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {/* Live Preview Card */}
              <div className="p-4 bg-zinc-950 rounded-xl">
                <label className="block text-sm font-medium text-zinc-400 mb-3">Vista previa</label>
                <div 
                  className="p-4 rounded-lg border border-white/10"
                  style={{ 
                    backgroundColor: appearance.dark_mode ? '#09090b' : '#ffffff',
                    fontFamily: appearance.font_family === 'sans' ? 'system-ui' : appearance.font_family === 'serif' ? '"Outfit"' : '"Inter"'
                  }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg" style={{ backgroundColor: currentTheme?.color }}></div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: appearance.dark_mode ? '#fff' : '#000' }}>Nombre de tu tienda</p>
                      <p className="text-xs" style={{ color: appearance.dark_mode ? '#71717a' : '#a1a1aa' }}>Tu tagline aquí</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div 
                      className="flex-1 py-2 px-3 rounded-lg text-center text-sm font-medium"
                      style={{ backgroundColor: currentTheme?.color, color: currentTheme?.text }}
                    >
                      Comprar
                    </div>
                    <div 
                      className="flex-1 py-2 px-3 rounded-lg text-center text-sm border"
                      style={{ borderColor: currentTheme?.color, color: currentTheme?.color }}
                    >
                      $99.00
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Envio Tab */}
          {activeTab === 'envio' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center justify-between p-4 bg-zinc-950 rounded-xl">
                <div>
                  <p className="text-white font-medium">Habilitar envíos y entregas</p>
                  <p className="text-xs text-zinc-500">Permite elegir entre Retiro en Tienda y Envío Local</p>
                </div>
                <button
                  onClick={() => setForm(f => ({ ...f, store_shipping_enabled: !f.store_shipping_enabled }))}
                  className={`w-12 h-6 rounded-full transition-colors ${form.store_shipping_enabled ? 'bg-secondary' : 'bg-zinc-700'}`}
                >
                  <span className={`block w-5 h-5 rounded-full bg-white transition-transform ${form.store_shipping_enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {form.store_shipping_enabled && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-2">Costo base de envío ($)</label>
                      <input
                        type="number"
                        value={form.store_shipping_cost}
                        onChange={(e) => setForm(f => ({ ...f, store_shipping_cost: parseInt(e.target.value) || 0 }))}
                        className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-secondary/70 focus:ring-2 focus:ring-secondary/20 transition-all"
                        placeholder="0"
                      />
                      <p className="text-[10px] text-zinc-500 mt-1">Costo genérico si no coincide ninguna zona local.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-2">Envío gratis desde ($)</label>
                      <input
                        type="number"
                        value={form.store_shipping_free_threshold}
                        onChange={(e) => setForm(f => ({ ...f, store_shipping_free_threshold: parseInt(e.target.value) || 0 }))}
                        className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-secondary/70 focus:ring-2 focus:ring-secondary/20 transition-all"
                        placeholder="Sin umbral"
                      />
                      <p className="text-[10px] text-zinc-500 mt-1">Monto de compra para envío gratis (0 = desactivado).</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Monto de pedido mínimo ($)</label>
                    <input
                      type="number"
                      value={form.store_min_order_amount}
                      onChange={(e) => setForm(f => ({ ...f, store_min_order_amount: parseInt(e.target.value) || 0 }))}
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-secondary/70 focus:ring-2 focus:ring-secondary/20 transition-all"
                      placeholder="0"
                    />
                    <p className="text-[10px] text-zinc-500 mt-1">Monto mínimo en el carrito para poder finalizar la compra.</p>
                  </div>

                  <div className="border-t border-white/5 pt-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-secondary text-sm">map</span>
                          Zonas de Envío Locales
                        </h4>
                        <p className="text-xs text-zinc-500">Delimitá las zonas donde hacés entregas y sus costos</p>
                      </div>
                      {!isAddingZone && (
                        <button
                          type="button"
                          onClick={() => setIsAddingZone(true)}
                          className="px-3 py-1.5 bg-zinc-800 text-white rounded-lg text-xs font-bold hover:bg-zinc-700 transition-colors flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-xs">add</span>
                          Agregar Zona
                        </button>
                      )}
                    </div>

                    {isAddingZone && (
                      <div className="p-4 bg-zinc-950 border border-white/5 rounded-xl space-y-4 animate-in slide-in-from-top-4 duration-300">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                          <h5 className="text-xs font-black uppercase text-white tracking-wider">Nueva Zona de Envío</h5>
                          <button
                            type="button"
                            onClick={() => setIsAddingZone(false)}
                            className="text-zinc-500 hover:text-white"
                          >
                            <span className="material-symbols-outlined text-sm">close</span>
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1.5">Nombre de la Zona *</label>
                            <input
                              type="text"
                              value={newZoneName}
                              onChange={e => setNewZoneName(e.target.value)}
                              className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-secondary/70 focus:ring-2 focus:ring-secondary/20 transition-all"
                              placeholder="Ej: Salta Capital"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1.5">Costo de Envío ($) *</label>
                            <input
                              type="number"
                              value={newZoneCost}
                              onChange={e => setNewZoneCost(parseInt(e.target.value) || 0)}
                              className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-secondary/70 focus:ring-2 focus:ring-secondary/20 transition-all"
                              placeholder="0"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-zinc-500 mb-1.5">Códigos Postales (Separados por coma) *</label>
                          <textarea
                            value={newZoneCodes}
                            onChange={e => setNewZoneCodes(e.target.value)}
                            className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-secondary/70 focus:ring-2 focus:ring-secondary/20 transition-all"
                            rows={2}
                            placeholder="Ej: 4400, 4403, 4405"
                          />
                          <p className="text-[9px] text-zinc-600 mt-1">Los clientes deben ingresar uno de estos códigos postales exactos en el checkout para que se aplique esta zona.</p>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setIsAddingZone(false)}
                            className="px-3 py-2 bg-zinc-900 text-zinc-400 hover:text-white rounded-lg text-xs font-bold transition-colors"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={handleAddZone}
                            className="px-4 py-2 bg-white text-zinc-950 hover:bg-zinc-100 rounded-lg text-xs font-bold transition-colors"
                          >
                            Agregar
                          </button>
                        </div>
                      </div>
                    )}

                    {shippingZones.length === 0 ? (
                      <div className="text-center p-8 bg-zinc-950/50 border border-dashed border-white/5 rounded-xl">
                        <span className="material-symbols-outlined text-3xl text-zinc-700 mb-2 block">location_off</span>
                        <p className="text-xs text-zinc-400 font-semibold">Sin zonas locales configuradas</p>
                        <p className="text-[10px] text-zinc-600 mt-1 max-w-sm mx-auto">
                          Al no tener zonas específicas, los clientes de cualquier localidad podrán comprar aplicando el Costo Base de Envío.
                        </p>
                      </div>
                    ) : (
                      <div className="grid gap-3">
                        {shippingZones.map(zone => (
                          <div
                            key={zone.id}
                            className="flex items-center justify-between p-4 bg-zinc-950 border border-white/5 rounded-xl group hover:border-white/10 transition-colors"
                          >
                            <div className="space-y-1.5 flex-1 pr-4">
                              <div className="flex items-center gap-2">
                                <h5 className="font-bold text-white text-xs">{zone.name}</h5>
                                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider">
                                  ${zone.cost.toLocaleString('es-AR')}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {zone.postal_codes.map((code, cIdx) => (
                                  <span
                                    key={cIdx}
                                    className="bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded text-[9px] font-medium"
                                  >
                                    {code}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteZone(zone.id)}
                              className="p-2 text-zinc-600 hover:text-red-400 transition-colors rounded-lg hover:bg-zinc-900 opacity-0 group-hover:opacity-100 focus:opacity-100"
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Social Tab */}
          {activeTab === 'social' && (
            <>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">WhatsApp</label>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-secondary">chat</span>
                  <input
                    type="text"
                    value={form.store_social_whatsapp}
                    onChange={(e) => setForm(f => ({ ...f, store_social_whatsapp: e.target.value }))}
                    className="flex-1 bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-secondary/70 focus:ring-2 focus:ring-secondary/20 transition-all"
                    placeholder="5491112345678"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Instagram</label>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-secondary">camera_alt</span>
                  <input
                    type="text"
                    value={form.store_social_instagram}
                    onChange={(e) => setForm(f => ({ ...f, store_social_instagram: e.target.value }))}
                    className="flex-1 bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-secondary/70 focus:ring-2 focus:ring-secondary/20 transition-all"
                    placeholder="@mitienda"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Facebook</label>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-secondary">thumb_up</span>
                  <input
                    type="text"
                    value={form.store_social_facebook}
                    onChange={(e) => setForm(f => ({ ...f, store_social_facebook: e.target.value }))}
                    className="flex-1 bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-secondary/70 focus:ring-2 focus:ring-secondary/20 transition-all"
                    placeholder="https://facebook.com/mitienda"
                  />
                </div>
              </div>
            </>
          )}

          {/* Pagos Tab */}
          {activeTab === 'pagos' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Transferencia Bancaria */}
              <div className="p-6 bg-zinc-950 border border-white/5 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-secondary text-2xl">account_balance</span>
                    <div>
                      <h4 className="font-bold text-white text-sm">Transferencia Bancaria</h4>
                      <p className="text-xs text-zinc-500">Recibí transferencias directas mostrando tus datos en el checkout</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTransferEnabled(!transferEnabled)}
                    className={`w-12 h-6 rounded-full transition-colors ${transferEnabled ? 'bg-secondary' : 'bg-zinc-700'}`}
                  >
                    <span className={`block w-5 h-5 rounded-full bg-white transition-transform ${transferEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </div>

                {transferEnabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/5 animate-in fade-in duration-200">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Banco</label>
                      <input
                        type="text"
                        value={transferBank}
                        onChange={(e) => setTransferBank(e.target.value)}
                        placeholder="Ej: Banco Galicia / Mercado Pago"
                        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-secondary/70 focus:ring-2 focus:ring-secondary/20 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Titular de la Cuenta</label>
                      <input
                        type="text"
                        value={transferHolder}
                        onChange={(e) => setTransferHolder(e.target.value)}
                        placeholder="Ej: Juan Pérez"
                        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-secondary/70 focus:ring-2 focus:ring-secondary/20 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-1.5">CBU / CVU</label>
                      <input
                        type="text"
                        value={transferCbu}
                        onChange={(e) => setTransferCbu(e.target.value)}
                        placeholder="22 dígitos numéricos"
                        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-mono focus:outline-none focus:border-secondary/70 focus:ring-2 focus:ring-secondary/20 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Alias</label>
                      <input
                        type="text"
                        value={transferAlias}
                        onChange={(e) => setTransferAlias(e.target.value)}
                        placeholder="Ej: JUAN.PEREZ.ALIAS"
                        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-mono focus:outline-none focus:border-secondary/70 focus:ring-2 focus:ring-secondary/20 transition-all"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Número de Cuenta (Opcional)</label>
                      <input
                        type="text"
                        value={transferAccount}
                        onChange={(e) => setTransferAccount(e.target.value)}
                        placeholder="Ej: CA 4005-12345/6"
                        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-secondary/70 focus:ring-2 focus:ring-secondary/20 transition-all"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Mercado Pago */}
              <div className="p-6 bg-zinc-950 border border-white/5 rounded-2xl space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-secondary text-2xl">payment</span>
                  <div>
                    <h4 className="font-bold text-white text-sm">Mercado Pago</h4>
                    <p className="text-xs text-zinc-500">Cobros automáticos con tarjetas de crédito, débito o saldo en cuenta</p>
                  </div>
                </div>

                <div className="p-4 bg-zinc-900 border border-white/5 rounded-xl flex gap-3 text-xs text-zinc-400 leading-relaxed">
                  <span className="material-symbols-outlined text-secondary">info</span>
                  <p>
                    Configurá tus credenciales de <strong>Mercado Pago</strong> para recibir pagos automáticos. 
                    Podés encontrarlas en el panel de desarrolladores de Mercado Pago.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">MP Public Key</label>
                    <input
                      type="text"
                      value={form.store_mp_public_key}
                      onChange={(e) => setForm(f => ({ ...f, store_mp_public_key: e.target.value }))}
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-mono focus:outline-none focus:border-secondary/70 focus:ring-2 focus:ring-secondary/20 transition-all"
                      placeholder="APP_USR-..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">MP Access Token</label>
                    <input
                      type="password"
                      value={form.store_mp_access_token}
                      onChange={(e) => setForm(f => ({ ...f, store_mp_access_token: e.target.value }))}
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-mono focus:outline-none focus:border-secondary/70 focus:ring-2 focus:ring-secondary/20 transition-all"
                      placeholder="APP_USR-..."
                    />
                    <p className="text-[10px] text-zinc-600 mt-1">Este token es secreto y se usa para generar los cobros de forma segura.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>


        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 bg-secondary text-zinc-950 rounded-xl font-bold hover:brightness-110 disabled:opacity-50 transition-all shadow-[0_0_20px_rgba(var(--secondary),0.15)] hover:shadow-[0_0_25px_rgba(var(--secondary),0.25)]"
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </FeatureGate>
  );
}