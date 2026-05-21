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

export default function TerminosPage({ params }: { params: Promise<{ slug: string }> }) {
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
        console.error('Error loading tenant for terms:', error);
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
            Términos de Uso
          </span>
        </div>
      </header>

      {/* Main Legal Content */}
      <main className="max-w-4xl mx-auto px-6 py-16 flex-1 w-full">
        <div className="text-center mb-16">
          <h1 className="text-3xl sm:text-4xl font-sans font-black tracking-tight uppercase mb-4" style={{ color: textColor }}>
            Términos de Uso y Condiciones
          </h1>
          <p className="text-xs uppercase tracking-[0.2em] font-bold" style={{ color: mutedColor }}>
            Última actualización: {new Date().toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="space-y-12 text-sm leading-relaxed" style={{ color: appearance.dark_mode ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.8)' }}>
          
          {/* Section 1 */}
          <section className="space-y-4">
            <h2 className="text-lg font-black uppercase tracking-wider" style={primaryText}>
              1. Relación de las Partes y Rol de la Plataforma
            </h2>
            <p>
              El presente sitio web y catálogo online es de propiedad exclusiva de <strong>{storeName}</strong>, quien lo administra de forma independiente. Para hospedar, organizar y canalizar la muestra de sus productos y la recepción de pedidos, {storeName} utiliza el software como servicio (SaaS) provisto por <strong>Obsidiana</strong>.
            </p>
            <p>
              <strong>Obsidiana</strong> actúa únicamente como proveedor tecnológico de la infraestructura de tienda online e integración de punto de venta (POS). En tal carácter, Obsidiana no es dueño de los artículos exhibidos, no interviene en la determinación de precios, no maneja la logística de envío, ni actúa como intermediario comercial o garante en las transacciones. Toda relación de compra, pago y reclamos comerciales es concertada de manera directa y exclusiva entre el Cliente Final (comprador) y {storeName} (vendedor).
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-4">
            <h2 className="text-lg font-black uppercase tracking-wider" style={primaryText}>
              2. Origen del Catálogo y Exactitud de la Información
            </h2>
            <p>
              El catálogo que visualizas en esta tienda puede conformarse por artículos locales cargados directamente por el comercio o bien por productos vinculados y sincronizados de forma inteligente desde plataformas de terceros como Mercado Libre (a través de métodos afiliados o de indexación automatizada).
            </p>
            <p>
              {storeName} se esfuerza en mantener la información de descripción, imágenes, precios y variantes de stock actualizados al instante. No obstante, todas las compras procesadas constituyen <strong>órdenes de intención de compra</strong> y quedan sujetas a la verificación física y definitiva del inventario disponible por parte de los encargados de la tienda al momento de la preparación.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-4">
            <h2 className="text-lg font-black uppercase tracking-wider" style={primaryText}>
              3. Proceso de Checkout y Creación de Órdenes
            </h2>
            <p>
              El proceso de checkout de esta tienda consta de 3 etapas transparentes diseñadas para garantizar la simplicidad del flujo:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Paso 1 (Tu Carrito):</strong> Resumen e incentivo de compra con barra inteligente de envío gratis.</li>
              <li><strong>Paso 2 (Datos de Envío):</strong> Carga obligatoria de datos identificatorios para contacto y entrega.</li>
              <li><strong>Paso 3 (Método de Pago):</strong> Selección del medio de pago preferido.</li>
            </ul>
            <p>
              Al completar el Paso 3 y hacer clic en <em>"Confirmar Compra"</em>, se registrará una orden formal en el panel del comercio. Si la orden incluye datos de contacto correspondientes, el sistema generará un resumen estructurado para ser enviado directamente por el cliente a través de **WhatsApp** para agilizar la preparación y el canal de comunicación.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-4">
            <h2 className="text-lg font-black uppercase tracking-wider" style={primaryText}>
              4. Condiciones y Métodos de Pago Habilitados
            </h2>
            <p>
              Los pagos se procesarán bajo las siguientes pautas, de acuerdo a la elección efectuada por el cliente:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Efectivo / Acuerdo contra entrega:</strong> El comprador se compromete formalmente a abonar el precio exacto en moneda de curso legal al recibir o retirar el pedido físico, coordinando previamente horario y sucursal.
              </li>
              <li>
                <strong>Transferencia Bancaria:</strong> El cliente debe realizar la transferencia a los datos bancarios provistos en pantalla por el valor exacto de la orden y marcar la casilla de verificación. La entrega de la mercadería queda sujeta a la efectiva acreditación de los fondos en la cuenta de {storeName}.
              </li>
              <li>
                <strong>Mercado Pago:</strong> Si se encuentra activo el módulo correspondiente, el pago se efectúa mediante enlaces de pago externos seguros o checkout directo. El cliente se compromete a verificar el estado de aprobado del importe en su cuenta.
              </li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-4">
            <h2 className="text-lg font-black uppercase tracking-wider" style={primaryText}>
              5. Envíos y Logística de Distribución
            </h2>
            <p>
              Todos los despachos, envíos a domicilio y retiros por sucursal son responsabilidad exclusiva de {storeName}. El costo del flete se calcula en base a las tarifas establecidas por el comercio.
            </p>
            <p>
              En caso de que el total de tu carrito supere el umbral de envío gratuito configurado por el tenant (<em>Free Shipping Threshold</em>), el sistema eximirá automáticamente el cobro del transporte en la liquidación del checkout. El cliente se compromete a proporcionar una dirección de entrega exacta y completa. Cualquier error en los datos provistos que cause una imposibilidad de entrega o reenvío correrá por cuenta del comprador.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-4">
            <h2 className="text-lg font-black uppercase tracking-wider" style={primaryText}>
              6. Protección de Datos Personales
            </h2>
            <p>
              Conforme a las leyes de protección de datos, la información que proporcionas al momento del checkout (nombre, teléfono, correo electrónico, dirección y notas adicionales) es almacenada de forma segura en las bases de datos en la nube de Obsidiana con aislamiento estricto multi-tenant (RLS).
            </p>
            <p>
              Estos datos serán accedidos única y exclusivamente por los operadores autorizados de {storeName} con el único fin de procesar el despacho de tu orden, verificar tus pagos y entablar contacto directo de posventa sobre tu pedido.
            </p>
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
            <span className="cursor-default font-black" style={{ color: currentTheme.primary }}>Términos de Uso</span>
            <Link href="/privacidad" className="cursor-pointer hover:opacity-100 transition-opacity" style={{ color: appearance.dark_mode ? '#ffffff' : '#000000' }}>Política de Privacidad</Link>
            <span className="cursor-default opacity-40" style={{ color: appearance.dark_mode ? '#ffffff' : '#000000' }}>Defensa al Consumidor</span>
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
