'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useTenant } from '../hooks/use-tenant';

// ─── Ilustraciones SVG únicas por paso ────────────────────────────────────────

function IllustrationWelcome() {
  return (
    <svg viewBox="0 0 200 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-48 h-40 mx-auto">
      <defs>
        <radialGradient id="gw1" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#a855f7" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="90" r="70" fill="url(#gw1)" />
      {/* Stars */}
      <circle cx="40" cy="30" r="3" fill="#a855f7" opacity="0.7" />
      <circle cx="160" cy="40" r="2" fill="#c084fc" opacity="0.5" />
      <circle cx="170" cy="130" r="3" fill="#a855f7" opacity="0.6" />
      <circle cx="30" cy="140" r="2" fill="#c084fc" opacity="0.5" />
      {/* Rocket body */}
      <ellipse cx="100" cy="75" rx="20" ry="35" fill="#7c3aed" />
      <ellipse cx="100" cy="65" rx="14" ry="20" fill="#a855f7" />
      {/* Window */}
      <circle cx="100" cy="68" r="7" fill="#1e1b4b" />
      <circle cx="100" cy="68" r="5" fill="#312e81" />
      <circle cx="98" cy="66" r="2" fill="#6366f1" opacity="0.6" />
      {/* Wings */}
      <path d="M80 90 L72 115 L90 100 Z" fill="#6d28d9" />
      <path d="M120 90 L128 115 L110 100 Z" fill="#6d28d9" />
      {/* Flame */}
      <ellipse cx="100" cy="118" rx="10" ry="8" fill="#f59e0b" opacity="0.9" />
      <ellipse cx="100" cy="122" rx="7" ry="6" fill="#fbbf24" />
      <ellipse cx="100" cy="126" rx="4" ry="4" fill="#fef3c7" />
      {/* Sparkles */}
      <path d="M145 55 L147 60 L152 62 L147 64 L145 69 L143 64 L138 62 L143 60 Z" fill="#c084fc" />
      <path d="M55 45 L56.5 49 L60 50.5 L56.5 52 L55 56 L53.5 52 L50 50.5 L53.5 49 Z" fill="#a78bfa" />
    </svg>
  );
}

function IllustrationBusiness() {
  return (
    <svg viewBox="0 0 200 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-48 h-40 mx-auto">
      <defs>
        <radialGradient id="gb1" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="90" r="68" fill="url(#gb1)" />
      {/* Store building */}
      <rect x="45" y="70" width="110" height="80" rx="6" fill="#1e1b4b" />
      <rect x="45" y="70" width="110" height="20" rx="6" fill="#4c1d95" />
      {/* Awning */}
      <path d="M40 90 L160 90 L155 105 L45 105 Z" fill="#7c3aed" />
      <path d="M40 90 L160 90" stroke="#a855f7" strokeWidth="2" />
      {/* Awning stripes */}
      <line x1="70" y1="90" x2="65" y2="105" stroke="#a855f7" strokeWidth="1.5" strokeOpacity="0.4" />
      <line x1="90" y1="90" x2="85" y2="105" stroke="#a855f7" strokeWidth="1.5" strokeOpacity="0.4" />
      <line x1="110" y1="90" x2="105" y2="105" stroke="#a855f7" strokeWidth="1.5" strokeOpacity="0.4" />
      <line x1="130" y1="90" x2="125" y2="105" stroke="#a855f7" strokeWidth="1.5" strokeOpacity="0.4" />
      {/* Door */}
      <rect x="83" y="120" width="34" height="30" rx="3" fill="#312e81" />
      <circle cx="112" cy="135" r="2" fill="#818cf8" />
      {/* Windows */}
      <rect x="53" y="112" width="20" height="18" rx="2" fill="#312e81" />
      <rect x="127" y="112" width="20" height="18" rx="2" fill="#312e81" />
      <line x1="63" y1="112" x2="63" y2="130" stroke="#4f46e5" strokeWidth="1" />
      <line x1="53" y1="121" x2="73" y2="121" stroke="#4f46e5" strokeWidth="1" />
      <line x1="137" y1="112" x2="137" y2="130" stroke="#4f46e5" strokeWidth="1" />
      <line x1="127" y1="121" x2="147" y2="121" stroke="#4f46e5" strokeWidth="1" />
      {/* Sign */}
      <rect x="60" y="75" width="80" height="12" rx="2" fill="#6d28d9" />
      <rect x="64" y="78" width="50" height="5" rx="1" fill="#c084fc" opacity="0.5" />
      {/* Stars */}
      <circle cx="35" cy="55" r="2" fill="#a855f7" opacity="0.6" />
      <circle cx="165" cy="60" r="2.5" fill="#c084fc" opacity="0.5" />
    </svg>
  );
}

function IllustrationStore() {
  return (
    <svg viewBox="0 0 200 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-48 h-40 mx-auto">
      <defs>
        <radialGradient id="gs1" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ec4899" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="90" r="68" fill="url(#gs1)" />
      {/* Phone frame */}
      <rect x="65" y="30" width="70" height="120" rx="12" fill="#18181b" />
      <rect x="68" y="33" width="64" height="114" rx="10" fill="#09090b" />
      {/* Notch */}
      <rect x="88" y="33" width="24" height="6" rx="3" fill="#27272a" />
      {/* Screen content */}
      {/* Header */}
      <rect x="68" y="39" width="64" height="18" rx="0" fill="#4c1d95" />
      <circle cx="82" cy="48" r="4" fill="#7c3aed" />
      <rect x="89" y="45" width="25" height="3" rx="1" fill="#c084fc" opacity="0.7" />
      <rect x="89" y="50" width="15" height="2" rx="1" fill="#a78bfa" opacity="0.4" />
      {/* Product cards */}
      <rect x="72" y="61" width="27" height="32" rx="4" fill="#1e1b4b" />
      <rect x="72" y="61" width="27" height="20" rx="4" fill="#2d1b69" />
      <rect x="74" y="85" width="14" height="2" rx="1" fill="#c084fc" opacity="0.6" />
      <rect x="74" y="89" width="20" height="2" rx="1" fill="#a78bfa" opacity="0.4" />
      <rect x="74" y="93" width="10" height="2" rx="1" fill="#7c3aed" />

      <rect x="103" y="61" width="27" height="32" rx="4" fill="#1e1b4b" />
      <rect x="103" y="61" width="27" height="20" rx="4" fill="#1e3a5f" />
      <rect x="105" y="85" width="14" height="2" rx="1" fill="#93c5fd" opacity="0.6" />
      <rect x="105" y="89" width="20" height="2" rx="1" fill="#60a5fa" opacity="0.4" />
      <rect x="105" y="93" width="10" height="2" rx="1" fill="#3b82f6" />

      {/* Cart button */}
      <rect x="72" y="97" width="58" height="12" rx="4" fill="#7c3aed" />
      <rect x="80" y="101" width="40" height="4" rx="2" fill="#c084fc" opacity="0.7" />

      {/* Bottom nav */}
      <rect x="68" y="133" width="64" height="14" rx="0" fill="#18181b" />
      <circle cx="86" cy="140" r="3" fill="#7c3aed" />
      <circle cx="100" cy="140" r="3" fill="#52525b" />
      <circle cx="114" cy="140" r="3" fill="#52525b" />

      {/* Sparkle */}
      <path d="M155 55 L157 60 L162 62 L157 64 L155 69 L153 64 L148 62 L153 60 Z" fill="#c084fc" opacity="0.8" />
      <circle cx="45" cy="100" r="3" fill="#a855f7" opacity="0.5" />
    </svg>
  );
}

function IllustrationProduct() {
  return (
    <svg viewBox="0 0 200 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-48 h-40 mx-auto">
      <defs>
        <radialGradient id="gp1" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#059669" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="90" r="68" fill="url(#gp1)" />
      {/* Box */}
      <rect x="55" y="75" width="90" height="75" rx="6" fill="#1e1b4b" />
      <rect x="55" y="75" width="90" height="20" rx="6" fill="#2d1b69" />
      <line x1="55" y1="90" x2="145" y2="90" stroke="#4c1d95" strokeWidth="1" />
      {/* Ribbon */}
      <rect x="95" y="55" width="10" height="40" fill="#7c3aed" />
      <rect x="60" y="73" width="80" height="8" fill="#7c3aed" />
      <path d="M100 55 L85 43 L80 50 L100 55 Z" fill="#a855f7" />
      <path d="M100 55 L115 43 L120 50 L100 55 Z" fill="#a855f7" />
      {/* Box front details */}
      <circle cx="100" cy="115" r="12" fill="#312e81" />
      <path d="M95 115 L99 119 L107 111" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Barcode */}
      <rect x="65" y="130" width="3" height="12" fill="#4c1d95" />
      <rect x="70" y="130" width="2" height="12" fill="#4c1d95" />
      <rect x="74" y="130" width="4" height="12" fill="#4c1d95" />
      <rect x="80" y="130" width="2" height="12" fill="#4c1d95" />
      <rect x="84" y="130" width="3" height="12" fill="#4c1d95" />
      {/* Stars */}
      <circle cx="38" cy="65" r="2" fill="#a855f7" opacity="0.6" />
      <circle cx="162" cy="80" r="2.5" fill="#34d399" opacity="0.5" />
      <path d="M155 50 L156.5 54 L160 55.5 L156.5 57 L155 61 L153.5 57 L150 55.5 L153.5 54 Z" fill="#a855f7" opacity="0.7" />
    </svg>
  );
}

function IllustrationDone() {
  return (
    <svg viewBox="0 0 200 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-48 h-40 mx-auto">
      <defs>
        <radialGradient id="gd1" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#a855f7" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="90" r="68" fill="url(#gd1)" />
      {/* Big checkmark circle */}
      <circle cx="100" cy="90" r="42" fill="#1e1b4b" />
      <circle cx="100" cy="90" r="38" fill="#2d1b69" />
      <path d="M82 90 L95 103 L120 78" stroke="#a855f7" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Confetti */}
      <rect x="45" y="40" width="8" height="8" rx="2" fill="#f59e0b" transform="rotate(20 45 40)" />
      <rect x="148" y="45" width="7" height="7" rx="2" fill="#ec4899" transform="rotate(-15 148 45)" />
      <rect x="38" y="120" width="6" height="6" rx="1" fill="#34d399" transform="rotate(30 38 120)" />
      <rect x="155" y="115" width="8" height="8" rx="2" fill="#60a5fa" transform="rotate(-25 155 115)" />
      <circle cx="55" cy="65" r="4" fill="#c084fc" />
      <circle cx="148" cy="130" r="3" fill="#fbbf24" />
      <circle cx="160" cy="65" r="3.5" fill="#34d399" />
      <circle cx="40" cy="90" r="3" fill="#f87171" />
      {/* Sparkles */}
      <path d="M145 30 L147 35 L152 37 L147 39 L145 44 L143 39 L138 37 L143 35 Z" fill="#c084fc" />
      <path d="M52 30 L53.5 34 L57 35.5 L53.5 37 L52 41 L50.5 37 L47 35.5 L50.5 34 Z" fill="#fbbf24" />
    </svg>
  );
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface OnboardingData {
  // Paso 2: Negocio
  businessName: string;
  cuit: string;
  ivaCondition: string;
  phone: string;
  address: string;
  // Paso 3: Tienda Online
  storeName: string;
  storeTagline: string;
  storeTheme: string;
  // Paso 4: Primer producto
  productName: string;
  productPrice: string;
  skipProduct: boolean;
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export function OnboardingWizard() {
  const { tenant, loading } = useTenant();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [animDir, setAnimDir] = useState<'forward' | 'back'>('forward');
  const [animating, setAnimating] = useState(false);

  const [data, setData] = useState<OnboardingData>({
    businessName: '',
    cuit: '',
    ivaCondition: '',
    phone: '',
    address: '',
    storeName: '',
    storeTagline: '',
    storeTheme: 'dark',
    productName: '',
    productPrice: '',
    skipProduct: false,
  });

  // Mostrar wizard solo si el tenant no completó el onboarding
  useEffect(() => {
    if (!loading && tenant) {
      const completed = tenant.settings?.onboarding_completed === true;
      if (!completed) {
        // Pre-fill with existing data
        setData(prev => ({
          ...prev,
          businessName: tenant.nombre || '',
          phone: tenant.phone || '',
          address: tenant.address || '',
          cuit: tenant.cuit || '',
          ivaCondition: tenant.condicion_iva || '',
          storeName: tenant.store_name || tenant.nombre || '',
          storeTagline: tenant.store_tagline || '',
          storeTheme: tenant.store_theme || 'dark',
        }));
        // Small delay for smooth appearance after login
        setTimeout(() => setVisible(true), 600);
      }
    }
  }, [tenant, loading]);

  const TOTAL_STEPS = 5;

  const goToStep = useCallback((target: number, direction: 'forward' | 'back') => {
    if (animating) return;
    setAnimDir(direction);
    setAnimating(true);
    setTimeout(() => {
      setStep(target);
      setAnimating(false);
    }, 280);
  }, [animating]);

  const next = () => {
    if (step < TOTAL_STEPS - 1) goToStep(step + 1, 'forward');
  };

  const back = () => {
    if (step > 0) goToStep(step - 1, 'back');
  };

  const [saveError, setSaveError] = useState<string | null>(null);

  const markCompleted = async (): Promise<boolean> => {
    if (!tenant?.id) return false;
    const { error } = await supabase
      .from('tenants')
      .update({
        settings: { ...(tenant.settings || {}), onboarding_completed: true },
      })
      .eq('id', tenant.id);
    return !error;
  };

  const skip = async () => {
    await markCompleted();
    setVisible(false);
  };

  const saveAndFinish = async () => {
    if (!tenant?.id) {
      setVisible(false);
      return;
    }
    setSaving(true);
    setSaveError(null);

    try {
      // 1. Construir payload con TODOS los campos del wizard
      const updatePayload: Record<string, any> = {
        settings: { ...(tenant.settings || {}), onboarding_completed: true },
        // Siempre guardar estos campos aunque estén vacíos (el usuario los limpió intencionalmente)
        nombre: data.businessName || tenant.nombre,
        store_name: data.storeName || tenant.store_name || data.businessName || tenant.nombre,
        store_theme: data.storeTheme || 'dark',
      };

      // Campos opcionales — solo sobrescribir si el usuario los completó
      if (data.cuit.trim()) updatePayload.cuit = data.cuit.trim();
      if (data.ivaCondition) updatePayload.condicion_iva = data.ivaCondition;
      if (data.phone.trim()) updatePayload.phone = data.phone.trim();
      if (data.address.trim()) updatePayload.address = data.address.trim();
      if (data.storeTagline.trim()) updatePayload.store_tagline = data.storeTagline.trim();

      // 2. Guardar en tenants — verificar error explícitamente
      const { error: tenantError } = await supabase
        .from('tenants')
        .update(updatePayload)
        .eq('id', tenant.id);

      if (tenantError) {
        console.error('Error actualizando tenant:', tenantError);
        setSaveError(`Error al guardar el negocio: ${tenantError.message}`);
        setSaving(false);
        return;
      }

      // 3. Crear primer producto si se completó y tiene nombre y precio
      if (!data.skipProduct && data.productName.trim() && data.productPrice) {
        const precio = parseFloat(data.productPrice);
        if (!isNaN(precio) && precio >= 0) {
          // Generar slug único a partir del nombre
          const slugBase = data.productName.trim()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
          const slugUnique = `${slugBase}-${Date.now()}`;

          const { error: productError } = await supabase
            .from('products')
            .insert({
              tenant_id: tenant.id,
              nombre: data.productName.trim(),
              slug: slugUnique,
              precio: precio,
              precio_ars: precio,
              price_ars: precio,
              status: 'active',
              available_online: true,
            })
            .select('id')
            .single();

          if (productError) {
            // El producto falló pero el tenant se guardó — no es crítico
            console.warn('No se pudo crear el primer producto:', productError.message);
            // Continuar igual — el tenant ya fue guardado
          }
        }
      }

      // 4. Recargar la página para que el TenantProvider y el dashboard
      //    reflejen inmediatamente los nuevos datos
      window.location.reload();

    } catch (err: any) {
      console.error('Error inesperado en onboarding:', err);
      setSaveError('Ocurrió un error inesperado. Intentá de nuevo.');
      setSaving(false);
    }
  };

  if (!visible) return null;

  const progress = ((step) / (TOTAL_STEPS - 1)) * 100;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}
    >
      {/* Modal */}
      <div
        className="relative w-full max-w-lg bg-zinc-950 rounded-3xl border border-white/10 shadow-2xl overflow-hidden"
        style={{ boxShadow: '0 0 80px rgba(139,92,246,0.15), 0 25px 60px rgba(0,0,0,0.6)' }}
      >
        {/* Top glow accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 rounded-full bg-gradient-to-r from-transparent via-purple-500 to-transparent" />

        {/* Progress bar */}
        <div className="relative h-1 bg-zinc-800 mt-1 mx-6 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #7c3aed, #a855f7, #c084fc)',
            }}
          />
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 pt-4 pb-2">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === step ? '24px' : '8px',
                height: '8px',
                background: i <= step
                  ? 'linear-gradient(90deg, #7c3aed, #a855f7)'
                  : '#3f3f46',
              }}
            />
          ))}
        </div>

        {/* Step content with slide animation */}
        <div
          className="px-8 pt-4 pb-8 transition-all duration-280"
          style={{
            opacity: animating ? 0 : 1,
            transform: animating
              ? `translateX(${animDir === 'forward' ? '40px' : '-40px'})`
              : 'translateX(0)',
            transition: 'opacity 0.28s ease, transform 0.28s ease',
          }}
        >
          {/* Step 0: Bienvenida */}
          {step === 0 && (
            <div className="text-center space-y-4">
              <IllustrationWelcome />
              <div>
                <p className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-2">Paso 1 de 5</p>
                <h2 className="text-3xl font-black text-white tracking-tight">
                  ¡Bienvenido a <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Obsidiana</span>!
                </h2>
                <p className="text-zinc-400 text-sm mt-3 leading-relaxed">
                  En los próximos minutos vas a configurar tu negocio para empezar a vender.
                  Te guiamos paso a paso.
                </p>
              </div>
              <div className="flex flex-col gap-2 pt-2">
                <div className="flex items-center gap-3 bg-zinc-900 rounded-xl px-4 py-3 text-left">
                  <span className="text-lg">🏪</span>
                  <span className="text-xs text-zinc-300">Datos de tu negocio</span>
                </div>
                <div className="flex items-center gap-3 bg-zinc-900 rounded-xl px-4 py-3 text-left">
                  <span className="text-lg">🎨</span>
                  <span className="text-xs text-zinc-300">Personalizá tu tienda online</span>
                </div>
                <div className="flex items-center gap-3 bg-zinc-900 rounded-xl px-4 py-3 text-left">
                  <span className="text-lg">📦</span>
                  <span className="text-xs text-zinc-300">Agregá tu primer producto</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Tu Negocio */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="text-center">
                <IllustrationBusiness />
                <p className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-1">Paso 2 de 5</p>
                <h2 className="text-2xl font-black text-white">Tu Negocio</h2>
                <p className="text-zinc-500 text-xs mt-1">Contanos sobre tu comercio</p>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                    Nombre del negocio <span className="text-purple-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={data.businessName}
                    onChange={e => setData(p => ({ ...p, businessName: e.target.value }))}
                    placeholder="Ej: La Boutique de Ana"
                    className="w-full bg-zinc-900 border border-white/10 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">CUIT</label>
                    <input
                      type="text"
                      value={data.cuit}
                      onChange={e => setData(p => ({ ...p, cuit: e.target.value }))}
                      placeholder="XX-XXXXXXXX-X"
                      className="w-full bg-zinc-900 border border-white/10 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Condición IVA</label>
                    <select
                      value={data.ivaCondition}
                      onChange={e => setData(p => ({ ...p, ivaCondition: e.target.value }))}
                      className="w-full bg-zinc-900 border border-white/10 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 rounded-xl px-4 py-3 text-sm text-white outline-none transition-all"
                    >
                      <option value="">Seleccionar...</option>
                      <option value="responsable_inscripto">Responsable Inscripto</option>
                      <option value="monotributista">Monotributista</option>
                      <option value="consumidor_final">Consumidor Final</option>
                      <option value="exento">Exento</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Teléfono</label>
                    <input
                      type="text"
                      value={data.phone}
                      onChange={e => setData(p => ({ ...p, phone: e.target.value }))}
                      placeholder="+54 9 387..."
                      className="w-full bg-zinc-900 border border-white/10 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Dirección</label>
                    <input
                      type="text"
                      value={data.address}
                      onChange={e => setData(p => ({ ...p, address: e.target.value }))}
                      placeholder="Calle 123, Ciudad"
                      className="w-full bg-zinc-900 border border-white/10 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Tienda Online */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="text-center">
                <IllustrationStore />
                <p className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-1">Paso 3 de 5</p>
                <h2 className="text-2xl font-black text-white">Tu Tienda Online</h2>
                <p className="text-zinc-500 text-xs mt-1">Personalizá cómo se ve tu tienda para los clientes</p>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                    Nombre de la tienda
                  </label>
                  <input
                    type="text"
                    value={data.storeName}
                    onChange={e => setData(p => ({ ...p, storeName: e.target.value }))}
                    placeholder="Ej: Boutique Ana"
                    className="w-full bg-zinc-900 border border-white/10 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                    Slogan o descripción
                  </label>
                  <input
                    type="text"
                    value={data.storeTagline}
                    onChange={e => setData(p => ({ ...p, storeTagline: e.target.value }))}
                    placeholder="Ej: La moda que te inspira"
                    className="w-full bg-zinc-900 border border-white/10 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                    Tema de la tienda
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: 'dark', label: 'Oscuro', emoji: '🌙', desc: 'Elegante y moderno' },
                      { value: 'light', label: 'Claro', emoji: '☀️', desc: 'Limpio y minimalista' },
                    ].map(theme => (
                      <button
                        key={theme.value}
                        type="button"
                        onClick={() => setData(p => ({ ...p, storeTheme: theme.value }))}
                        className="relative rounded-xl border-2 p-3 text-left transition-all"
                        style={{
                          borderColor: data.storeTheme === theme.value ? '#a855f7' : 'rgba(255,255,255,0.08)',
                          background: data.storeTheme === theme.value ? 'rgba(168,85,247,0.1)' : '#18181b',
                        }}
                      >
                        {data.storeTheme === theme.value && (
                          <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center">
                            <span className="text-white text-[8px] font-bold">✓</span>
                          </div>
                        )}
                        <div className="text-lg mb-1">{theme.emoji}</div>
                        <div className="text-xs font-bold text-white">{theme.label}</div>
                        <div className="text-[10px] text-zinc-500">{theme.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Primer Producto */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="text-center">
                <IllustrationProduct />
                <p className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-1">Paso 4 de 5</p>
                <h2 className="text-2xl font-black text-white">Primer Producto</h2>
                <p className="text-zinc-500 text-xs mt-1">Opcional — podés agregar más productos después</p>
              </div>

              {/* Toggle skip */}
              <div className="flex items-center justify-between bg-zinc-900 rounded-xl px-4 py-3">
                <div>
                  <p className="text-xs font-bold text-white">Agregar un producto ahora</p>
                  <p className="text-[10px] text-zinc-500">Aparecerá en tu tienda e inventario</p>
                </div>
                <button
                  type="button"
                  onClick={() => setData(p => ({ ...p, skipProduct: !p.skipProduct }))}
                  className="relative w-11 h-6 rounded-full transition-all duration-300"
                  style={{ background: !data.skipProduct ? '#7c3aed' : '#3f3f46' }}
                >
                  <div
                    className="absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-300"
                    style={{ left: !data.skipProduct ? '26px' : '4px' }}
                  />
                </button>
              </div>

              {!data.skipProduct && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                      Nombre del producto <span className="text-purple-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={data.productName}
                      onChange={e => setData(p => ({ ...p, productName: e.target.value }))}
                      placeholder="Ej: Remera básica negra"
                      className="w-full bg-zinc-900 border border-white/10 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                      Precio (ARS) <span className="text-purple-400">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-bold">$</span>
                      <input
                        type="number"
                        value={data.productPrice}
                        onChange={e => setData(p => ({ ...p, productPrice: e.target.value }))}
                        placeholder="0.00"
                        min="0"
                        className="w-full bg-zinc-900 border border-white/10 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 rounded-xl pl-8 pr-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}

              {data.skipProduct && (
                <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-4 text-center">
                  <p className="text-zinc-500 text-xs">
                    Podés agregar productos desde <span className="text-purple-400 font-bold">Inventario</span> en cualquier momento.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Listo! */}
          {step === 4 && (
            <div className="text-center space-y-4">
              <IllustrationDone />
              <div>
                <p className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-2">Paso 5 de 5</p>
                <h2 className="text-3xl font-black text-white tracking-tight">
                  ¡Todo listo! 🎉
                </h2>
                <p className="text-zinc-400 text-sm mt-2 leading-relaxed">
                  Tu negocio está configurado y listo para empezar a operar. Podés ajustar todo esto después desde <span className="text-purple-400 font-bold">Ajustes</span>.
                </p>
              </div>
              {/* Summary */}
              <div className="bg-zinc-900 rounded-2xl p-4 space-y-2 text-left">
                {data.businessName && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-purple-400">✓</span>
                    <span className="text-zinc-400">Negocio: <span className="text-white font-bold">{data.businessName}</span></span>
                  </div>
                )}
                {data.storeName && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-purple-400">✓</span>
                    <span className="text-zinc-400">Tienda: <span className="text-white font-bold">{data.storeName}</span></span>
                  </div>
                )}
                {!data.skipProduct && data.productName && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-purple-400">✓</span>
                    <span className="text-zinc-400">Producto: <span className="text-white font-bold">{data.productName}</span></span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-purple-400">✓</span>
                  <span className="text-zinc-400">Tema: <span className="text-white font-bold">{data.storeTheme === 'dark' ? '🌙 Oscuro' : '☀️ Claro'}</span></span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error banner — solo visible si saveAndFinish falla */}
        {saveError && (
          <div className="mx-8 mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p className="text-xs text-red-400 leading-relaxed">{saveError}</p>
          </div>
        )}

        {/* Navigation */}
        <div className="px-8 pb-8 flex items-center justify-between">
          {/* Back / Skip */}
          <div>
            {step === 0 ? (
              <button
                onClick={skip}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors font-medium"
              >
                Saltar configuración
              </button>
            ) : (
              <button
                onClick={back}
                disabled={animating}
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors font-bold"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 5l-7 7 7 7" />
                </svg>
                Atrás
              </button>
            )}
          </div>

          {/* Next / Finish */}
          <button
            onClick={step === TOTAL_STEPS - 1 ? saveAndFinish : next}
            disabled={animating || saving}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-sm text-white transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
              boxShadow: '0 4px 20px rgba(139,92,246,0.4)',
            }}
          >
            {saving ? (
              <>
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                Guardando...
              </>
            ) : step === TOTAL_STEPS - 1 ? (
              <>
                ¡Ir al Dashboard!
                <span className="text-base">🚀</span>
              </>
            ) : (
              <>
                Continuar
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

