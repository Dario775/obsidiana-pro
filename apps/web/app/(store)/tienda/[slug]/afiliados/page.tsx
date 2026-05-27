'use client';

import React, { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface Appearance {
  template: 'classic' | 'minimal' | 'list';
  theme_color: 'violet' | 'blue' | 'emerald' | 'rose' | 'amber' | 'slate';
  font_family: 'sans' | 'serif' | 'mono';
  dark_mode: boolean;
}

const THEME_MAP: Record<string, { primary: string; primaryLight: string; bg: string; text: string }> = {
  violet: { primary: '#8b5cf6', primaryLight: '#a78bfa', bg: 'bg-violet-600', text: '#fff' },
  blue: { primary: '#3b82f6', primaryLight: '#60a5fa', bg: 'bg-blue-600', text: '#fff' },
  emerald: { primary: '#10b981', primaryLight: '#34d399', bg: 'bg-emerald-600', text: '#fff' },
  rose: { primary: '#f43f5e', primaryLight: '#fb7185', bg: 'bg-rose-600', text: '#fff' },
  amber: { primary: '#f59e0b', primaryLight: '#fbbf24', bg: 'bg-amber-600', text: '#000' },
  cyan: { primary: '#06b6d4', primaryLight: '#22d3ee', bg: 'bg-cyan-600', text: '#fff' },
  slate: { primary: '#64748b', primaryLight: '#94a3b8', bg: 'bg-slate-600', text: '#fff' },
};

const FONT_MAP = {
  sans: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  serif: '"Outfit", sans-serif',
  mono: '"Inter", sans-serif',
};

export default function AfiliadosPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState<any>(null);

  const defaultAppearance: Appearance = {
    template: 'classic',
    theme_color: 'violet',
    font_family: 'sans',
    dark_mode: false,
  };

  const defaultTheme = { primary: '#8b5cf6', primaryLight: '#a78bfa', bg: 'bg-violet-600', text: '#fff' };
  const appearance: Appearance = {
    ...defaultAppearance,
    ...(tenant?.store_appearance || {})
  };
  const currentTheme = THEME_MAP[appearance.theme_color] || defaultTheme;
  const primaryText = { color: currentTheme.primary };
  
  const bgColor = appearance.dark_mode ? '#09090b' : '#ffffff';
  const textColor = appearance.dark_mode ? '#ffffff' : '#000000';
  const cardBg = appearance.dark_mode ? '#18181b' : '#f4f4f5';
  const mutedColor = appearance.dark_mode ? '#a1a1aa' : '#71717a';
  const fontFamily = FONT_MAP[appearance.font_family] || FONT_MAP.sans;

  useEffect(() => {
    async function loadTenantData() {
      try {
        const { data: tenantData, error: tenantError } = await supabase
          .from('tenants')
          .select(`
            id, nombre, slug, status, address, phone, email, logo_url, banner_url,
            store_name, store_description, store_domain, store_active, store_theme,
            store_template, store_banners, store_tagline, store_currency,
            store_shipping_enabled, store_shipping_cost, store_shipping_free_threshold,
            store_social_instagram, store_social_facebook, store_social_whatsapp,
            store_appearance, store_logo_url, updated_at
          `)
          .or(`slug.eq.${slug},store_domain.eq.${slug}`)
          .single();

        if (!tenantError && tenantData) {
          setTenant(tenantData);
        }
      } catch (error) {
        console.error('Error loading tenant for affiliates page:', error);
      } finally {
        setLoading(false);
      }
    }

    loadTenantData();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090b] text-white">
        <div className="w-8 h-8 border-4 border-t-transparent border-violet-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090b] text-white">
        <p className="text-sm font-semibold tracking-wider uppercase">Tienda no encontrada</p>
      </div>
    );
  }

  const storeName = tenant.store_name || tenant.nombre || 'Nuestra Tienda';

  return (
    <div 
      className="min-h-screen transition-colors duration-500 flex flex-col justify-between" 
      style={{ backgroundColor: bgColor, color: textColor, fontFamily }}
    >
      {/* Header Container */}
      <header className="w-full border-b sticky top-0 z-40 backdrop-blur-md transition-colors duration-500" style={{ 
        backgroundColor: appearance.dark_mode ? 'rgba(9, 9, 11, 0.9)' : 'rgba(255, 255, 255, 0.9)',
        borderColor: appearance.dark_mode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
      }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link 
            href="/"
            className="flex items-center gap-2 group text-xs font-black uppercase tracking-wider transition-all"
            style={{ color: textColor }}
          >
            <span className="material-symbols-outlined text-sm font-black transition-transform group-hover:-translate-x-1">arrow_back</span>
            Volver a la tienda
          </Link>
          
          <span className="text-xs font-black uppercase tracking-widest" style={primaryText}>
            Compra y Transparencia
          </span>
        </div>
      </header>

      {/* Main Legal Content */}
      <main className="max-w-4xl mx-auto px-6 py-16 flex-1 w-full">
        <div className="text-center mb-16">
          <h1 className="text-3xl sm:text-4xl font-sans font-black tracking-tight uppercase mb-4" style={{ color: textColor }}>
            Guía de Compra y Transparencia
          </h1>
          <p className="text-xs uppercase tracking-[0.2em] font-bold" style={{ color: mutedColor }}>
            Última actualización: {new Date().toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="space-y-12 text-sm leading-relaxed" style={{ color: appearance.dark_mode ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.8)' }}>
          
          {/* Introduction */}
          <section className="space-y-4">
            <p>
              ¡Hola! Te damos la bienvenida a nuestra tienda online. En <strong>{storeName}</strong> valoramos profundamente la honestidad, la confianza y la claridad en cada una de tus visitas. Por ello, redactamos esta guía para explicarte detalladamente y en palabras sencillas cómo funciona nuestro catálogo, cómo despachamos tus compras y qué tipo de productos ofrecemos.
            </p>
          </section>

          <hr className="border-zinc-200 dark:border-zinc-800" />

          {/* Section 1 */}
          <section className="space-y-6">
            <h2 className="text-lg font-black uppercase tracking-wider" style={primaryText}>
              1. Dos Formas de Comprar en Nuestra Tienda
            </h2>
            <p>
              Para brindarte un catálogo extenso y con opciones de alta calidad, dividimos nuestra oferta en dos tipos de productos claramente identificables:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Local Stock Card */}
              <div className="rounded-2xl p-6 border space-y-3" style={{ backgroundColor: cardBg, borderColor: appearance.dark_mode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                <span className="material-symbols-outlined text-3xl" style={primaryText}>storefront</span>
                <h3 className="font-black text-xs uppercase tracking-wider" style={{ color: textColor }}>Productos de Stock Local</h3>
                <ul className="text-xs space-y-2.5 opacity-90">
                  <li>• Artículos disponibles directamente en nuestro local físico.</li>
                  <li>• Los pagas contra entrega en efectivo, por transferencia o mediante tarjeta vía Mercado Pago.</li>
                  <li>• Nosotros preparamos, empaquetamos y coordinamos el despacho a tu dirección o te los guardamos para retiro gratis en nuestra sucursal.</li>
                  <li>• La facturación y garantía es manejada en su totalidad de forma directa por nuestro equipo.</li>
                </ul>
              </div>

              {/* Affiliate Card */}
              <div className="rounded-2xl p-6 border space-y-3" style={{ backgroundColor: cardBg, borderColor: appearance.dark_mode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                <span className="material-symbols-outlined text-3xl" style={primaryText}>bolt</span>
                <h3 className="font-black text-xs uppercase tracking-wider" style={{ color: textColor }}>Recomendados de Mercado Libre</h3>
                <ul className="text-xs space-y-2.5 opacity-90">
                  <li>• Artículos que curamos y seleccionamos cuidadosamente de Mercado Libre.</li>
                  <li>• Al hacer clic en comprar, te redirigimos de forma segura a la publicación oficial para completar el pago de forma habitual.</li>
                  <li>• El precio es exactamente el mismo; percibimos una pequeña comisión por recomendación abonada por Mercado Libre.</li>
                  <li>• El envío impositivo, distribución (Mercado Envíos) y programa de Compra Protegida corren por cuenta del vendedor en Mercado Libre.</li>
                </ul>
              </div>
            </div>
          </section>

          <hr className="border-zinc-200 dark:border-zinc-800" />

          {/* Section 2 */}
          <section className="space-y-4">
            <h2 className="text-lg font-black uppercase tracking-wider" style={primaryText}>
              2. Tus Datos de Contacto y Privacidad de Pago
            </h2>
            <p>
              Garantizar tu tranquilidad al navegar y realizar pedidos en nuestro checkout digital es nuestro mayor compromiso:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Tus Datos de Envío:</strong> La información básica que ingresas (nombre, dirección y teléfono) es procesada bajo esquemas estrictos de seguridad de la base de datos de Obsidiana, utilizándose únicamente para coordinar entregas locales y facturación impositiva de nuestro negocio.
              </li>
              <li>
                <strong>Privacidad Financiera:</strong> Nosotros <strong>nunca guardamos ni tenemos acceso</strong> a tus números de tarjeta de crédito, cuentas bancarias o claves. Todo pago online se realiza a través de las pasarelas certificadas y encriptadas externas de Mercado Pago o Mercado Libre.
              </li>
              <li>
                <strong>Cookies de Recomendación:</strong> Si decides comprar un producto de Mercado Libre recomendado en las siguientes horas, se almacena una cookie transitoria en tu navegador para adjudicarnos la comisión por recomendación. Puedes desactivar o borrar tus cookies cuando gustes en tu navegador.
              </li>
            </ul>
          </section>

        </div>
      </main>

      {/* Footer Premium Unificado */}
      <footer className="relative border-t mt-24 pt-16 transition-colors duration-500" style={{ 
        backgroundColor: appearance.dark_mode ? '#000000' : '#ffffff', 
        borderColor: appearance.dark_mode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' 
      }}>
        {/* Floating Brand Badge */}
        <div className="absolute -top-8 right-8 md:right-16 w-16 h-16 flex items-center justify-center z-20 cursor-pointer"
          title={storeName}
        >
          {(() => {
            const activeLogo = tenant.store_logo_url || tenant.logo_url;
            if (activeLogo) {
              const cacheBuster = tenant.updated_at 
                ? new Date(tenant.updated_at).getTime() 
                : Date.now();
              const bustedUrl = `${activeLogo}${activeLogo.includes('?') ? '&' : '?'}_t=${cacheBuster}`;
              
              return (
                <img 
                  src={bustedUrl} 
                  alt="Logo" 
                  className="w-14 h-14 rounded-full object-contain border border-zinc-200 dark:border-white/10 shadow-md bg-white"
                />
              );
            }
            
            return (
              <span className="font-serif text-4xl font-black select-none text-zinc-900 dark:text-white leading-none">
                {storeName.charAt(0).toUpperCase()}
              </span>
            );
          })()}
        </div>

        <div className="max-w-7xl mx-auto px-6">
          {/* Main Links Row */}
          <div className="flex flex-col items-center justify-center gap-6 md:gap-8 mb-8">
            <nav className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-xs font-semibold tracking-[0.2em] uppercase">
              <Link 
                href="/"
                className="transition-colors"
                style={{ color: appearance.dark_mode ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)' }}
              >
                Volver a la Tienda
              </Link>
              {tenant.address && (
                <span 
                  className="cursor-default opacity-85 text-center"
                  style={{ color: appearance.dark_mode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}
                >
                  {tenant.address}
                </span>
              )}
              {tenant.store_social_whatsapp && (
                <a 
                  href={`https://wa.me/${tenant.store_social_whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors"
                  style={{ color: appearance.dark_mode ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)' }}
                >
                  WhatsApp
                </a>
              )}
            </nav>
          </div>

          {/* Sub Links Row */}
          <div className="flex flex-wrap items-center justify-center gap-6 mb-4 text-[10px] tracking-widest uppercase opacity-55">
            <Link href="/terminos" className="cursor-pointer hover:opacity-100 transition-opacity" style={{ color: appearance.dark_mode ? '#ffffff' : '#000000' }}>Términos de Uso</Link>
            <Link href="/privacidad" className="cursor-pointer hover:opacity-100 transition-opacity" style={{ color: appearance.dark_mode ? '#ffffff' : '#000000' }}>Política de Privacidad</Link>
            <span className="cursor-default font-black" style={{ color: currentTheme.primary }}>Divulgación de Afiliados</span>
          </div>

          {/* Copyright */}
          <div className="text-center text-[10px] tracking-[0.15em] uppercase opacity-40 mb-6">
            <p style={{ color: appearance.dark_mode ? '#ffffff' : '#000000' }}>
              All Rights Reserved © {new Date().getFullYear()} Copyright
            </p>
          </div>

          {/* Giant Premium Branding Logo at the very bottom */}
          <div className="border-t pt-8 overflow-hidden" style={{ borderColor: appearance.dark_mode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
            {(() => {
              const rawStoreName = tenant.store_name || tenant.nombre || 'Obsidiana';
              const fontSizeVw = Math.min(12, Math.max(3, 100 / rawStoreName.length));

              return (
                <span className="w-full text-center block font-sans font-black tracking-tighter select-none uppercase pointer-events-none transition-all duration-500 whitespace-nowrap overflow-hidden"
                  style={{ 
                    color: appearance.dark_mode ? '#ffffff' : '#000000',
                    letterSpacing: '-0.04em',
                    fontSize: `${fontSizeVw}vw`,
                    lineHeight: '0.9'
                  }}
                >
                  {rawStoreName}
                </span>
              );
            })()}
          </div>
        </div>
      </footer>
    </div>
  );
}
