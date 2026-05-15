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
  { id: 'sans', name: 'Sans', sample: 'Moderno ABC' },
  { id: 'serif', name: 'Serif', sample: 'Elegante ABC' },
  { id: 'mono', name: 'Mono', sample: 'Técnico ABC' },
];

type Appearance = {
  template: 'classic' | 'minimal' | 'list';
  theme_color: 'violet' | 'blue' | 'emerald' | 'rose' | 'amber' | 'slate';
  font_family: 'sans' | 'serif' | 'mono';
  dark_mode: boolean;
};

type Tab = 'general' | 'apariencia' | 'envio' | 'social';

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

  });
  
  const [uploading, setUploading] = useState(false);
  const [previewItem, setPreviewItem] = useState<string | null>(null);
  const [appearance, setAppearance] = useState<Appearance>({
    template: 'classic',
    theme_color: 'violet',
    font_family: 'sans',
    dark_mode: false,
  });
  const logoFileRef = useRef<HTMLInputElement>(null);

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

      });
      
      if (t.store_appearance) {
        setAppearance(t.store_appearance as Appearance);
      }
      
      if (t.store_domain) {
        setPreviewItem(`/tienda/${t.store_domain}`);
      } else if (tenant.slug) {
        setPreviewItem(`/tienda/${tenant.slug}`);
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
        store_appearance: appearance,
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
            onClick={() => setForm(f => ({ ...f, store_active: !f.store_active }))}
            className={`w-12 h-6 rounded-full transition-colors ${form.store_active ? 'bg-emerald-500' : 'bg-zinc-700'}`}
          >
            <span className={`block w-5 h-5 rounded-full bg-white transition-transform ${form.store_active ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-zinc-900 rounded-xl">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
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
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white"
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
                    className="flex-1 bg-zinc-950 border border-white/10 rounded-r-xl px-4 py-3 text-white"
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
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white"
                  placeholder="Los mejores productos de la ciudad"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Descripción (opcional)</label>
                <textarea
                  value={form.store_description}
                  onChange={(e) => setForm(f => ({ ...f, store_description: e.target.value }))}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white"
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
                    <p className="text-xs text-zinc-600 mt-1">PNG o JPG, cuadrada, mínimo 200x200px</p>
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
                      <p className="text-xs text-zinc-500">Agregá hasta 3 imágenes. La primera será el banner principal.</p>
                    )}
                  </div>
                ) : (
                  <div 
                    onClick={() => bannerFileRef.current?.click()}
                    className="h-40 rounded-xl border-2 border-dashed border-white/20 flex items-center justify-center cursor-pointer hover:border-white/40 transition-colors"
                  >
                    <div className="text-center">
                      <span className="material-symbols-outlined text-4xl text-zinc-600 mb-2">add_photo_alternate</span>
                      <p className="text-zinc-500 text-sm">Subir banner de portada</p>
                      <p className="text-zinc-600 text-xs">Opcional - Puede ser carrusel de hasta 3 imágenes</p>
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
                      className={`p-4 rounded-xl border-2 transition-all ${
                        appearance.template === tpl.id 
                          ? 'border-white bg-zinc-800' 
                          : 'border-white/10 hover:border-white/30'
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
                          ? 'border-white bg-zinc-800' 
                          : 'border-white/10 hover:border-white/30'
                      }`}
                      style={{ fontFamily: font.id === 'sans' ? 'system-ui' : font.id === 'serif' ? 'Georgia' : 'monospace' }}
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
                  className={`w-12 h-6 rounded-full transition-colors ${appearance.dark_mode ? 'bg-violet-600' : 'bg-zinc-700'}`}
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
                    fontFamily: appearance.font_family === 'sans' ? 'system-ui' : appearance.font_family === 'serif' ? 'Georgia' : 'monospace'
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
            <>
              <div className="flex items-center justify-between p-4 bg-zinc-950 rounded-xl">
                <div>
                  <p className="text-white font-medium">Habilitar envío</p>
                  <p className="text-xs text-zinc-500">Permite elegir método de entrega</p>
                </div>
                <button
                  onClick={() => setForm(f => ({ ...f, store_shipping_enabled: !f.store_shipping_enabled }))}
                  className={`w-12 h-6 rounded-full transition-colors ${form.store_shipping_enabled ? 'bg-emerald-500' : 'bg-zinc-700'}`}
                >
                  <span className={`block w-5 h-5 rounded-full bg-white transition-transform ${form.store_shipping_enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Costo de envío ($)</label>
                  <input
                    type="number"
                    value={form.store_shipping_cost}
                    onChange={(e) => setForm(f => ({ ...f, store_shipping_cost: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Envío gratis desde ($)</label>
                  <input
                    type="number"
                    value={form.store_shipping_free_threshold}
                    onChange={(e) => setForm(f => ({ ...f, store_shipping_free_threshold: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Pedido mínimo ($)</label>
                <input
                  type="number"
                  value={form.store_min_order_amount}
                  onChange={(e) => setForm(f => ({ ...f, store_min_order_amount: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white"
                />
              </div>
            </>
          )}

          {/* Social Tab */}
          {activeTab === 'social' && (
            <>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">WhatsApp</label>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-emerald-400">chat</span>
                  <input
                    type="text"
                    value={form.store_social_whatsapp}
                    onChange={(e) => setForm(f => ({ ...f, store_social_whatsapp: e.target.value }))}
                    className="flex-1 bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white"
                    placeholder="5491112345678"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Instagram</label>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-pink-400">camera_alt</span>
                  <input
                    type="text"
                    value={form.store_social_instagram}
                    onChange={(e) => setForm(f => ({ ...f, store_social_instagram: e.target.value }))}
                    className="flex-1 bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white"
                    placeholder="@mitienda"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Facebook</label>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-blue-400">thumb_up</span>
                  <input
                    type="text"
                    value={form.store_social_facebook}
                    onChange={(e) => setForm(f => ({ ...f, store_social_facebook: e.target.value }))}
                    className="flex-1 bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white"
                    placeholder="https://facebook.com/mitienda"
                  />
                </div>
              </div>
            </>
          )}

          {/* Pagos Tab */}
          {activeTab === 'pagos' && (
            <>
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex gap-3">
                <span className="material-symbols-outlined text-blue-400">info</span>
                <p className="text-xs text-blue-100 leading-relaxed">
                  Configurá tus credenciales de <strong>Mercado Pago</strong> para recibir pagos automáticos. 
                  Podés encontrarlas en el panel de desarrolladores de Mercado Pago.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">MP Public Key</label>
                <input
                  type="text"
                  value={form.store_mp_public_key}
                  onChange={(e) => setForm(f => ({ ...f, store_mp_public_key: e.target.value }))}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white text-xs font-mono"
                  placeholder="APP_USR-..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">MP Access Token</label>
                <input
                  type="password"
                  value={form.store_mp_access_token}
                  onChange={(e) => setForm(f => ({ ...f, store_mp_access_token: e.target.value }))}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white text-xs font-mono"
                  placeholder="APP_USR-..."
                />
                <p className="text-[10px] text-zinc-500 mt-1">Este token es secreto y se usa para generar los cobros de forma segura.</p>
              </div>
            </>
          )}
        </div>


        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 bg-white text-zinc-900 rounded-xl font-bold hover:bg-zinc-100 disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </FeatureGate>
  );
}