'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Plan {
  id: string;
  name: string;
  nombre: string;
  monthly_price: number;
  yearly_price: number;
  features: Record<string, boolean>;
  max_products: number;
  max_branches: number;
  online_store: boolean;
  pos: boolean;
}

export default function LandingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPlans() {
      try {
        const { data } = await supabase
          .from('plans')
          .select('*')
          .order('monthly_price', { ascending: true });
        
        if (data) {
          setPlans(data as Plan[]);
        }
      } catch (err) {
        console.error('Error fetching plans:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchPlans();
  }, []);

  const featureLabels: Record<string, string> = {
    pos: 'Punto de Venta Profesional',
    ml_sync: 'Sincronización Mercado Libre',
    inventory: 'Gestión de Stock Avanzada',
    mercadopago: 'Integración Mercado Pago',
    multi_branch: 'Gestión Multisucursal',
    online_store: 'E-commerce Propio',
    custom_domain: 'Dominio Personalizado',
    reports_basic: 'Analíticas de Ventas',
    reports_advanced: 'Inteligencia de Negocio',
    ai_tools: 'Asistente IA para Productos',
    multi_user: 'Múltiples Accesos Staff',
  };

  return (
    <div className="min-h-screen bg-[#0b1326] text-[#dae2fd] selection:bg-[#b76dff] selection:text-[#490080]">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-[#0b1326]/60 border-b border-white/10">
        <div className="flex justify-between items-center w-full px-4 md:px-10 max-w-[1440px] mx-auto h-20">
          <Link href="/" className="flex items-center gap-2.5 text-xl font-extrabold text-[#dae2fd] group">
            <div className="w-8 h-8 rounded-lg bg-[#b76dff]/10 border border-[#b76dff]/20 flex items-center justify-center group-hover:bg-[#b76dff]/20 transition-all">
              <img src="/logo.png" alt="Obsidiana Logo" className="w-4.5 h-4.5 object-contain rounded-md" />
            </div>
            <span>Obsidiana</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-[#ddb7ff] border-b-2 border-[#ddb7ff] font-bold pb-1 transition-colors">
              Funcionalidades
            </a>
            <a href="#pricing" className="text-[#cfc2d6] hover:text-[#ddb7ff] transition-colors">
              Precios
            </a>
            <a href="#" className="text-[#cfc2d6] hover:text-[#5de6ff] transition-colors">
              Comunidad
            </a>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="px-6 py-2.5 bg-[#b76dff] text-[#490080] rounded-full font-bold hover:brightness-110 active:scale-95 transition-all">
              Comenzar Gratis
            </Link>
          </div>
        </div>
      </nav>

      <main className="relative bg-[radial-gradient(circle_at_50%_-20%,rgba(168,85,247,0.15)_0%,transparent_50%)]">
        {/* Hero Section */}
        <section className="relative pt-24 pb-32 px-4 md:px-10 max-w-[1440px] mx-auto text-center overflow-hidden">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#b76dff]/10 border border-[#ddb7ff]/20 text-[#ddb7ff] mb-8 animate-pulse">
            <span className="material-symbols-outlined text-[18px]">verified</span>
            <span className="text-xs font-medium tracking-wider uppercase">NUEVA VERSIÓN 2.0 YA DISPONIBLE</span>
          </div>

          <h1 className="text-4xl md:text-[72px] font-extrabold text-[#dae2fd] mb-6 max-w-4xl mx-auto leading-tight tracking-tighter">
            Tu negocio,{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ddb7ff] via-[#5de6ff] to-[#ddb7ff]">
              en todas partes.
            </span>
          </h1>

          <p className="text-base md:text-lg text-[#cfc2d6] mb-12 max-w-2xl mx-auto opacity-80 leading-relaxed">
            Gestiona tu local físico con un POS profesional y lanza tu tienda online en segundos. Sin complicaciones, sin límites.
          </p>

          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            <Link href="/register" className="w-full md:w-auto px-10 py-4 bg-white text-[#0b1326] rounded-2xl font-bold hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-all text-center">
              Crear mi tienda gratis
            </Link>
            <button className="w-full md:w-auto px-10 py-4 bg-[rgba(23,31,51,0.6)] backdrop-blur-md border border-white/10 text-[#dae2fd] rounded-2xl font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-2">
              <span className="material-symbols-outlined">play_circle</span>
              Ver Demo
            </button>
          </div>

          {/* Dashboard Preview */}
          <div className="mt-24 relative max-w-6xl mx-auto group">
            <div className="absolute -inset-1 bg-gradient-to-r from-[#ddb7ff]/30 to-[#5de6ff]/30 rounded-[3rem] blur-2xl opacity-50 group-hover:opacity-100 transition duration-1000"></div>
            <div className="relative bg-[rgba(23,31,51,0.6)] backdrop-blur-md border border-white/10 rounded-[2.5rem] overflow-hidden p-4 md:p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex gap-4">
                  <div className="px-3 py-1 rounded-full bg-[#ddb7ff]/10 border border-[#ddb7ff]/20 text-[#ddb7ff] text-xs font-bold flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span> PLAN: PROFESIONAL
                  </div>
                </div>
                <div className="text-[#cfc2d6]/40 text-[10px] tracking-widest font-medium uppercase hidden sm:block">
                  Última sincronización: en tiempo real
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
                {[
                  { label: 'VENTAS DEL DÍA', value: '$74.774', sub: 'ARS', trend: '+5 HOY', icon: 'payments', color: 'emerald' },
                  { label: 'PEDIDOS HOY', value: '5', sub: 'ÓRDENES', trend: 'PROCESADAS HOY', icon: 'shopping_cart', color: 'emerald' },
                  { label: 'STOCK CRÍTICO', value: '0', sub: 'SKUS', trend: 'SIN PROBLEMAS', icon: 'warning', color: 'emerald' },
                  { label: 'TICKET PROMEDIO', value: '$14.955', sub: 'ARS', trend: 'HOY', icon: 'receipt_long', color: 'emerald' },
                ].map((card, i) => (
                  <div key={i} className="bg-[#131b2e] p-4 md:p-6 rounded-3xl border border-white/5">
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-[10px] text-[#cfc2d6] font-bold tracking-wider uppercase">{card.label}</span>
                      <span className="material-symbols-outlined text-[#cfc2d6] opacity-40">{card.icon}</span>
                    </div>
                    <div className="text-xl md:text-2xl font-bold mb-2">{card.value} <span className="text-xs font-normal opacity-40 ml-1">{card.sub}</span></div>
                    <div className="text-emerald-400 text-xs flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">trending_up</span> {card.trend}
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-auto md:h-[400px]">
                {/* Chart */}
                <div className="md:col-span-2 bg-[#131b2e] rounded-3xl p-6 md:p-8 border border-white/5 flex flex-col">
                  <div className="flex justify-between items-end mb-8 md:mb-12">
                    <div>
                      <h3 className="font-bold text-base md:text-lg mb-1">RENDIMIENTO SEMANAL</h3>
                      <p className="text-[10px] text-[#cfc2d6] tracking-wider uppercase">VENTAS CONSOLIDADAS POS + ONLINE</p>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex items-center gap-2 text-[10px] font-bold">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#b76dff]"></span> POS
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-bold">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#5de6ff]"></span> ONLINE
                      </div>
                    </div>
                  </div>
                  <div className="flex-grow flex items-end justify-between gap-2 md:gap-4 px-2 md:px-4 pb-4">
                    {[
                      { pos: 'h-20 md:h-32', online: 'h-24 md:h-40', day: 'LUN' },
                      { pos: 'h-12 md:h-20', online: 'h-16 md:h-24', day: 'MAR' },
                      { pos: 'h-28 md:h-44', online: 'h-36 md:h-56', day: 'MIE' },
                      { pos: 'h-10 md:h-16', online: 'h-12 md:h-20', day: 'JUE' },
                      { pos: 'h-24 md:h-36', online: 'h-32 md:h-48', day: 'VIE' },
                      { pos: 'h-18 md:h-28', online: 'h-20 md:h-32', day: 'SAB' },
                      { pos: 'h-8 md:h-12', online: 'h-10 md:h-16', day: 'DOM' },
                    ].map((bar, i) => (
                      <div key={i} className="flex flex-col items-center gap-2 w-full">
                        <div className="flex gap-1 items-end w-full justify-center">
                          <div className={`w-4 md:w-6 ${bar.pos} bg-[#b76dff]/20 rounded-t-lg`}></div>
                          <div className={`w-4 md:w-6 ${bar.online} bg-[#5de6ff]/40 rounded-t-lg`}></div>
                        </div>
                        <span className="text-[10px] font-bold text-[#cfc2d6]">{bar.day}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Orders */}
                <div className="bg-[#131b2e] rounded-3xl p-4 md:p-6 border border-white/5 flex flex-col">
                  <div className="flex justify-between items-center mb-4 md:mb-6">
                    <h3 className="font-bold text-xs md:text-sm tracking-widest uppercase">PEDIDOS RECIENTES</h3>
                    <a href="#" className="text-[#ddb7ff] text-[10px] font-bold flex items-center gap-1 uppercase hover:underline">
                      VER TODOS <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </a>
                  </div>
                  <div className="space-y-3 md:space-y-4">
                    {[4, 3, 2].map((num) => (
                      <div key={num} className="flex items-center gap-3 md:gap-4 p-2 md:p-3 rounded-2xl bg-white/5 border border-white/5">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-[#2d3449] flex items-center justify-center font-bold text-xs md:text-sm text-[#cfc2d6]">{num}</div>
                        <div className="flex-grow">
                          <div className="font-bold text-xs">#{num}</div>
                          <div className="text-[8px] md:text-[9px] text-[#cfc2d6] opacity-60 uppercase">TIENDA WEB</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-xs">$ 9.800</div>
                          <div className="text-[7px] md:text-[8px] text-[#fabc4e] font-bold uppercase">PENDIENTE</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="py-24 px-4 md:px-10 max-w-[1440px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: 'sync_alt', title: 'Venta Física y Digital', desc: 'Vende en tu local con nuestro POS integrado y sincroniza tu stock con tu tienda online automáticamente.', color: 'primary', bg: 'bg-[#ddb7ff]/10', border: 'hover:border-[#ddb7ff]/20' },
              { icon: 'local_shipping', title: 'Dropshipping Pro', desc: 'Gana comisiones sin invertir en stock. Encuentra productos en Mercado Libre, comparte el link y recibe tus ganancias.', color: 'secondary', bg: 'bg-[#5de6ff]/10', border: 'hover:border-[#5de6ff]/20' },
              { icon: 'monitoring', title: 'Panel de Control Pro', desc: 'Análisis en tiempo real, gestión de pedidos y clientes desde una interfaz intuitiva y potente.', color: 'tertiary', bg: 'bg-[#fabc4e]/10', border: 'hover:border-[#fabc4e]/20' },
            ].map((f, i) => (
              <div key={i} className={`bg-[rgba(23,31,51,0.6)] backdrop-blur-md p-8 md:p-10 rounded-[2.5rem] border border-white/5 ${f.border} transition-all group`}>
                <div className={`w-14 h-14 rounded-2xl ${f.bg} flex items-center justify-center mb-8 group-hover:scale-110 transition-transform`}>
                  <span className={`material-symbols-outlined text-[#ddb7ff] text-3xl`}>{f.icon}</span>
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-[#dae2fd] mb-4">{f.title}</h3>
                <p className="text-[#cfc2d6] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Business Features Section */}
        <section className="py-24 border-y border-white/5 bg-[#0b1326]/40 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(93,180,255,0.03),transparent_50%)] pointer-events-none"></div>
          <div className="max-w-[1440px] mx-auto px-4 md:px-10 text-center relative z-10">
            <span className="text-[10px] font-bold tracking-[0.25em] text-[#5de6ff] uppercase mb-4 block">DISEÑADO PARA TU CRECIMIENTO</span>
            <h2 className="text-2xl md:text-4xl font-extrabold text-white mb-4 tracking-tight">
              TODO LO QUE TU NEGOCIO NECESITA PARA CRECER
            </h2>
            <p className="text-xs md:text-sm text-[#cfc2d6] opacity-60 max-w-xl mx-auto mb-16">
              Obsidiana unifica las herramientas más potentes del comercio en una sola plataforma simple, veloz y pensada para la comodidad de tus clientes.
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6 max-w-6xl mx-auto">
              {[
                { name: 'Catálogo al Instante', role: 'Velocidad de Carga', icon: 'speed', desc: 'Cargas instantáneas en celulares para que tus compradores elijan rápido y no abandonen.', glow: 'group-hover:border-[#b76dff]/30 hover:shadow-[0_0_20px_rgba(183,109,255,0.15)]' },
                { name: 'Seguridad Total', role: 'Información Privada', icon: 'shield', desc: 'Tus registros de caja, stock y clientes están protegidos de forma 100% confidencial.', glow: 'group-hover:border-emerald-500/30 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]' },
                { name: 'Cobros Integrados', role: 'Medios de Pago', icon: 'payments', desc: 'Acepta tarjetas de crédito, débito y transferencias de forma unificada y segura.', glow: 'group-hover:border-blue-500/30 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)]' },
                { name: 'Control de Stock', role: 'Mostrador + Web', icon: 'sync_alt', desc: 'Si vendes en tu local físico o en internet, tu inventario se actualiza de forma automática.', glow: 'group-hover:border-yellow-400/30 hover:shadow-[0_0_20px_rgba(250,204,21,0.15)]' },
                { name: 'Pedidos en WhatsApp', role: 'Conexión Directa', icon: 'chat', desc: 'Recibe resúmenes estructurados directo a tu celular para cerrar ventas en segundos.', glow: 'group-hover:border-[#5de6ff]/30 hover:shadow-[0_0_20px_rgba(93,230,255,0.15)]' },
              ].map((tech, i) => (
                <div key={i} className={`bg-[#131b2e]/60 backdrop-blur-md p-6 rounded-[2rem] border border-white/5 text-left transition-all duration-500 hover:-translate-y-1.5 group cursor-default ${tech.glow}`}>
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-[#dae2fd] opacity-60 group-hover:opacity-100 transition-opacity text-xl">{tech.icon}</span>
                  </div>
                  <h4 className="font-extrabold text-sm text-white mb-0.5 tracking-tight">{tech.name}</h4>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#cfc2d6]/50 mb-3">{tech.role}</p>
                  <p className="text-[11px] text-[#cfc2d6] opacity-60 leading-relaxed font-medium">{tech.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-24 md:py-32 px-4 md:px-10 max-w-[1440px] mx-auto">
          <div className="text-center mb-16 md:mb-20">
            <span className="text-xs font-medium text-[#ddb7ff] uppercase tracking-[0.2em]">PRICING</span>
            <h2 className="text-3xl md:text-[56px] font-extrabold text-white mt-4 tracking-tighter">
              ELEGÍ EL PLAN PERFECTO<br />
              <span className="text-[#cfc2d6] opacity-40">PARA TU CRECIMIENTO</span>
            </h2>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="w-12 h-12 border-4 border-[#ddb7ff]/20 border-t-[#ddb7ff] rounded-full animate-spin"></div>
            </div>
          ) : plans.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-[#cfc2d6] text-lg">Próximamente nuevos planes</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {plans.map((plan, index) => {
                const isPopular = plan.monthly_price > 0 && plan.monthly_price < 20000;
                const features = plan.features && typeof plan.features === 'object' 
                  ? Object.entries(plan.features).filter(([_, enabled]) => enabled === true)
                  : [];
                
                return (
                  <div 
                    key={plan.id}
                    className={`bg-[rgba(23,31,51,0.6)] backdrop-blur-md p-6 md:p-8 rounded-3xl flex flex-col border ${isPopular ? 'border-[#ddb7ff]/20 md:scale-105 relative z-10 shadow-2xl bg-[#222a3d]' : 'border-white/5'}`}
                  >
                    {isPopular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#ddb7ff] text-[#490080] px-3 py-0.5 rounded-full text-[9px] font-bold tracking-widest uppercase shadow-lg shadow-[#ddb7ff]/20 whitespace-nowrap">
                        MÁS POPULAR
                      </div>
                    )}
                    <div className="mb-6">
                      <span className="text-[10px] font-medium text-[#cfc2d6]/60 uppercase tracking-widest">PLAN</span>
                      <h3 className="text-xl md:text-2xl font-extrabold text-white mt-1">{plan.name || plan.nombre || 'Plan'}</h3>
                    </div>
                    <div className="mb-8 flex items-baseline gap-2">
                      <span className="text-4xl md:text-5xl font-black leading-none">
                        ${plan.monthly_price?.toLocaleString() || 0}
                      </span>
                      <span className="text-[10px] text-[#cfc2d6] opacity-40 uppercase tracking-widest">/ MES</span>
                    </div>
                    <div className="flex-grow space-y-3 md:space-y-4 mb-8 border-t border-white/5 pt-6">
                      <div className="text-[9px] text-[#cfc2d6] font-bold tracking-widest uppercase mb-3">FUNCIONALIDADES INCLUIDAS</div>
                      {features.slice(0, 5).map(([key, _], fi) => (
                        <div key={fi} className="flex items-center gap-2 md:gap-3 text-xs font-medium">
                          <span className="material-symbols-outlined text-[#ddb7ff] text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                          {featureLabels[key] || key}
                        </div>
                      ))}
                      <div className="flex items-center gap-2 md:gap-3 text-xs font-medium opacity-60">
                        <span className="material-symbols-outlined text-sm">inventory_2</span>
                        Hasta {plan.max_products || 50} productos
                      </div>
                      <div className="flex items-center gap-2 md:gap-3 text-xs font-medium opacity-60">
                        <span className="material-symbols-outlined text-sm">storefront</span>
                        {plan.max_branches || 1} Sucursal{plan.max_branches && plan.max_branches > 1 ? 'es' : ''}
                      </div>
                    </div>
                    <Link href="/register" className="w-full py-3 md:py-4 bg-white text-[#0b1326] rounded-xl font-black text-[10px] tracking-widest uppercase hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all text-center">
                      SELECCIONAR PLAN
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Final CTA */}
        <section className="py-24 md:py-32 px-4 md:px-10 text-center max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-[48px] font-extrabold text-[#dae2fd] mb-6 md:mb-8 tracking-tighter">
            ¿Listo para llevar tu negocio al siguiente nivel?
          </h2>
          <p className="text-base md:text-lg text-[#cfc2d6] mb-8 md:mb-12">
            Únete a miles de emprendedores que ya están transformando su forma de vender.
          </p>
          <div className="inline-flex bg-[rgba(23,31,51,0.6)] backdrop-blur-md border border-white/10 p-2 rounded-3xl">
            <input className="bg-transparent border-none focus:ring-0 px-4 md:px-6 text-[#dae2fd] w-48 md:w-64 placeholder:text-[#cfc2d6]/40" placeholder="tu@email.com" type="email" />
            <Link href="/register" className="px-6 md:px-8 py-3 md:py-4 bg-[#ddb7ff] text-[#490080] font-bold rounded-2xl hover:brightness-110 transition-all whitespace-nowrap">
              Empezar ahora
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#060e20] border-t border-white/10">
        <div className="w-full px-4 md:px-10 py-12 max-w-[1440px] mx-auto flex flex-col md:flex-row justify-between items-start gap-10 md:gap-0">
          <div className="mb-6 md:mb-0">
            <div className="flex items-center gap-2.5 text-xl font-bold text-[#dae2fd] mb-4">
              <div className="w-7 h-7 rounded-lg bg-[#b76dff]/10 border border-[#b76dff]/20 flex items-center justify-center">
                <img src="/logo.png" alt="Obsidiana Logo" className="w-4 h-4 object-contain rounded-md" />
              </div>
              <span>Obsidiana</span>
            </div>
            <p className="text-sm text-[#cfc2d6] max-w-xs opacity-60">
              La plataforma de comercio omnicanal líder en Latinoamérica. Diseñada para el alto rendimiento.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-12">
            <div className="flex flex-col gap-3 md:gap-4">
              <span className="text-xs font-medium text-[#ddb7ff] uppercase tracking-widest">PRODUCTO</span>
              <a href="#features" className="text-[#cfc2d6] hover:text-[#5de6ff] transition-all">Funcionalidades</a>
              <a href="#pricing" className="text-[#cfc2d6] hover:text-[#5de6ff] transition-all">Precios</a>
              <a href="#" className="text-[#cfc2d6] hover:text-[#5de6ff] transition-all">Comunidad</a>
            </div>
            <div className="flex flex-col gap-3 md:gap-4">
              <span className="text-xs font-medium text-[#ddb7ff] uppercase tracking-widest">LEGAL</span>
              <Link href="/privacidad" className="text-[#cfc2d6] hover:text-[#5de6ff] transition-all">Privacidad</Link>
              <Link href="/politica-afiliados" className="text-[#cfc2d6] hover:text-[#5de6ff] transition-all">Términos</Link>
            </div>
            <div className="flex flex-col gap-3 md:gap-4 col-span-2 md:col-span-1">
              <span className="text-xs font-medium text-[#ddb7ff] uppercase tracking-widest">SOCIAL</span>
              <div className="flex items-center gap-4">
                {/* WhatsApp */}
                <a 
                  href="https://wa.me/543877534410" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  title="WhatsApp" 
                  className="text-[#cfc2d6] hover:text-[#25D366] transition-colors flex items-center"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.963C16.588 2.016 14.12 1.01 11.66 1.01c-5.442 0-9.866 4.372-9.87 9.802 0 1.714.462 3.393 1.337 4.866L2.125 21.84l6.522-1.705z" />
                  </svg>
                </a>
                {/* Facebook */}
                <a 
                  href="https://facebook.com" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  title="Facebook" 
                  className="text-[#cfc2d6] hover:text-[#1877F2] transition-colors flex items-center"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </a>
                {/* Website */}
                <Link href="/" title="Sitio Web" className="text-[#cfc2d6] hover:text-[#b76dff] transition-colors flex items-center">
                  <span className="material-symbols-outlined text-[20px]">public</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-[1440px] mx-auto px-4 md:px-10 py-6 border-t border-white/5 text-center md:text-left text-[#cfc2d6] opacity-40 text-[10px] font-medium">
          © 2026 Obsidiana. Todos los derechos reservados.
        </div>
      </footer>
    </div>
  );
}
