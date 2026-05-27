'use client';

import Link from 'next/link';

export default function PoliticaAfiliadosPage() {
  return (
    <div className="min-h-screen bg-[#0b1326] text-[#dae2fd] selection:bg-[#b76dff] selection:text-[#490080] font-sans">
      {/* Background Glowing Gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#b76dff]/10 blur-[120px] animate-pulse duration-[6000ms]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#5de6ff]/10 blur-[120px] animate-pulse duration-[8000ms]"></div>
      </div>

      {/* Navbar */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-[#0b1326]/60 border-b border-white/10">
        <div className="flex justify-between items-center w-full px-4 md:px-10 max-w-[1440px] mx-auto h-20">
          <Link href="/" className="text-xl font-extrabold text-[#dae2fd] hover:text-[#5de6ff] transition-colors flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-[#b76dff]/10 border border-[#b76dff]/20 flex items-center justify-center group-hover:bg-[#b76dff]/20 transition-all">
              <img src="/logo.png" alt="Obsidiana Logo" className="w-4.5 h-4.5 object-contain rounded-md" />
            </div>
            <span>Obsidiana</span>
          </Link>
          <Link href="/" className="px-6 py-2.5 bg-white/5 border border-white/10 text-[#dae2fd] rounded-full font-bold hover:bg-white/10 hover:border-white/20 active:scale-95 transition-all text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Volver a la Home
          </Link>
        </div>
      </nav>

      {/* Header Section */}
      <header className="relative pt-20 pb-12 px-4 md:px-10 max-w-4xl mx-auto text-center z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#b76dff]/10 border border-[#ddb7ff]/20 text-[#ddb7ff] mb-6">
          <span className="material-symbols-outlined text-[16px]">gavel</span>
          <span className="text-[10px] font-bold tracking-widest uppercase">REGLAS DE NUESTRA PLATAFORMA</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-black text-[#dae2fd] mb-6 leading-tight tracking-tight">
          Términos y Condiciones Generales de Uso de<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ddb7ff] via-[#5de6ff] to-[#ddb7ff]">
            La Plataforma Omnicanal Obsidiana
          </span>
        </h1>
        <p className="text-xs md:text-sm text-[#cfc2d6] opacity-60 font-semibold tracking-wider uppercase">
          Última actualización: 27 de mayo de 2026
        </p>
      </header>

      {/* Main Content */}
      <main className="relative px-4 pb-32 max-w-4xl mx-auto z-10">
        <div className="bg-[rgba(23,31,51,0.5)] backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-6 md:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.3)] space-y-10 leading-relaxed text-sm md:text-base text-[#cfc2d6]">
          
          <section className="space-y-4">
            <p>
              ¡Bienvenido a <strong>Obsidiana</strong>! Nos alegra mucho acompañarte en el crecimiento de tu negocio. Obsidiana es una plataforma diseñada para ayudarte a unificar la gestión de tus ventas, tanto en tu local físico como en internet, de una forma sencilla y sin complicaciones.
            </p>
            <p>
              El presente documento detalla las reglas de convivencia y uso de nuestra plataforma (en adelante, los "Términos"). Al crear tu cuenta y utilizar Obsidiana, aceptas estas pautas diseñadas para proteger tu negocio y el de toda nuestra comunidad.
            </p>
          </section>

          <hr className="border-white/10" />

          {/* Section 1 */}
          <section className="space-y-4">
            <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
              <span className="text-[#5de6ff] font-bold">1.</span>
              ¿Qué es Obsidiana y cómo te ayuda?
            </h2>
            <p>
              Obsidiana te brinda un conjunto de herramientas digitales integradas para modernizar tu negocio:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
                <span className="material-symbols-outlined text-[#b76dff] mb-3 text-3xl">storefront</span>
                <h3 className="font-bold text-white text-xs uppercase tracking-wider mb-2">Punto de Venta (POS) y Stock</h3>
                <p className="text-xs opacity-80 leading-relaxed">
                  Registra ventas físicas de mostrador en tiempo real, controla tu caja diaria, imprime comprobantes y centraliza tus existencias de stock de forma inteligente.
                </p>
              </div>
              <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
                <span className="material-symbols-outlined text-[#5de6ff] mb-3 text-3xl">shopping_bag</span>
                <h3 className="font-bold text-white text-xs uppercase tracking-wider mb-2">Tienda Online y Catálogo</h3>
                <p className="text-xs opacity-80 leading-relaxed">
                  Lanza un e-commerce propio con tu marca para que tus compradores elijan variantes, realicen pedidos online por WhatsApp y completen transacciones.
                </p>
              </div>
              <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
                <span className="material-symbols-outlined text-[#fabc4e] mb-3 text-3xl">bolt</span>
                <h3 className="font-bold text-white text-xs uppercase tracking-wider mb-2">Módulo de Recomendaciones</h3>
                <p className="text-xs opacity-80 leading-relaxed">
                  Exhibe artículos curados de grandes tiendas como Mercado Libre como "Perfiles de Productos", permitiendo redireccionar a tus clientes y ganar comisiones de afiliación.
                </p>
              </div>
              <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
                <span className="material-symbols-outlined text-[#10b981] mb-3 text-3xl">shield</span>
                <h3 className="font-bold text-white text-xs uppercase tracking-wider mb-2">Aislamiento Seguro (SaaS)</h3>
                <p className="text-xs opacity-80 leading-relaxed">
                  Tu base de datos impositiva, stock y clientes se almacena de forma blindada, asegurando privacidad total frente a otros comercios de la Plataforma.
                </p>
              </div>
            </div>
          </section>

          <hr className="border-white/10" />

          {/* Section 2 */}
          <section className="space-y-4">
            <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
              <span className="text-[#5de6ff] font-bold">2.</span>
              Reglas para el Catálogo y Enlaces Recomendados (Afiliados)
            </h2>
            <p>
              Obsidiana te permite vender stock físico propio con despacho local, pero también recomendar productos de terceros (como Mercado Libre u otros marketplaces). Si decides utilizar nuestro módulo de afiliación, te solicitamos cumplir con estas pautas de convivencia:
            </p>
            <ul className="space-y-3.5 pl-2">
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-[#5de6ff] text-sm shrink-0 mt-1">check_circle</span>
                <span><strong>Transparencia Directa:</strong> Debes declarar en tu pie de página que actúas como afiliado y obtienes comisiones por ventas elegibles redirigidas (te facilitamos una plantilla preestablecida para configurarlo con un clic).</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-[#5de6ff] text-sm shrink-0 mt-1">check_circle</span>
                <span><strong>Clic Genuino:</strong> Queda terminantemente prohibido forzar redirecciones de cookies o clics automáticos sin un interés real e interacción consciente del comprador final.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-[#5de6ff] text-sm shrink-0 mt-1">check_circle</span>
                <span><strong>Limpia Identidad Visual:</strong> La tienda online provista es de tu marca. No imites las marcas comerciales de Mercado Libre ni sugieras una sociedad o representación oficial de las mismas para no confundir a los clientes.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-[#5de6ff] text-sm shrink-0 mt-1">check_circle</span>
                <span><strong>Campañas Publicitarias Autorizadas:</strong> No utilices anuncios en buscadores (como Google Ads) pujando por nombres y marcas registradas de terceros (como "Mercado Libre") para desviar tráfico.</span>
              </li>
            </ul>
          </section>

          <hr className="border-white/10" />

          {/* Section 3 */}
          <section className="space-y-4">
            <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
              <span className="text-[#5de6ff] font-bold">3.</span>
              Tu Responsabilidad como Comercio
            </h2>
            <p>
              Como administrador independiente del negocio registrado, asumes la completa responsabilidad de tus operaciones:
            </p>
            <ul className="space-y-3 pl-2">
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-[#b76dff] text-sm shrink-0 mt-1">payments</span>
                <span><strong>Cobro Directo:</strong> Los pagos por tus ventas físicas o digitales (efectivo, transferencias, Mercado Pago) ingresan directo a tus cuentas. Obsidiana no cobra comisiones por transacción ni custodia tus fondos.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-[#b76dff] text-sm shrink-0 mt-1">gavel</span>
                <span><strong>Obligaciones Fiscales:</strong> Eres el único responsable de regularizar tu condición impositiva tributaria (ej. <strong>Monotributo vigente en Argentina</strong> o Responsable Inscripto) ante entes reguladores para facturar adecuadamente.</span>
              </li>
            </ul>
          </section>

          <hr className="border-white/10" />

          {/* Section 4 */}
          <section className="space-y-4">
            <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
              <span className="text-red-400 font-bold">4.</span>
              Buen Uso y Medidas Preventivas
            </h2>
            <p>
              Para mantener la salud de nuestra comunidad, nos reservamos el derecho de suspender o dar de baja tiendas que violen estas normas, imiten marcas registradas sin autorización, utilicen la plataforma para actividades fraudulentas o realicen campañas masivas de spam.
            </p>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#060e20] border-t border-white/10 py-10 text-center text-[#cfc2d6] opacity-60 text-xs z-10 relative">
        <div className="flex flex-col items-center gap-3 mb-2">
          <div className="w-6 h-6 rounded-md bg-[#b76dff]/10 border border-[#b76dff]/20 flex items-center justify-center">
            <img src="/logo.png" alt="Obsidiana Logo" className="w-3.5 h-3.5 object-contain rounded-sm" />
          </div>
          <span className="font-bold text-[#dae2fd]">Obsidiana</span>
        </div>
        <p className="opacity-40">© 2026 Obsidiana. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
