'use client';

import Link from 'next/link';

export default function PlatformPrivacidadPage() {
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
          <span className="material-symbols-outlined text-[16px]">security</span>
          <span className="text-[10px] font-bold tracking-widest uppercase">SEGURIDAD Y CONFIDENCIALIDAD</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-black text-[#dae2fd] mb-6 leading-tight tracking-tight">
          Política de Privacidad de<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ddb7ff] via-[#5de6ff] to-[#ddb7ff]">
            La Plataforma Obsidiana
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
              En <strong>Obsidiana</strong>, sabemos que tu negocio es el fruto de tu esfuerzo constante. Por ello, consideramos la privacidad, la seguridad y el resguardo de tu información comercial y la de tus clientes como nuestra prioridad absoluta y diaria.
            </p>
            <p>
              Esta política explica, en palabras sencillas y sin tecnicismos complejos, cómo cuidamos, procesamos y protegemos tus datos cuando utilizas nuestra suite de herramientas omnicanal (Punto de Venta POS, e-commerce, gestión de stock e integraciones).
            </p>
          </section>

          <hr className="border-white/10" />

          {/* Section 1 */}
          <section className="space-y-4">
            <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
              <span className="text-[#5de6ff] font-bold">1.</span>
              ¿Qué información resguardamos de tu negocio?
            </h2>
            <p>
              Para proveer un servicio de alto rendimiento y permitirte administrar tu negocio de manera unificada, guardamos la siguiente información estrictamente comercial:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
                <span className="material-symbols-outlined text-[#b76dff] mb-3 text-3xl">badge</span>
                <h3 className="font-bold text-white text-xs uppercase tracking-wider mb-2">Perfil de tu Comercio</h3>
                <p className="text-xs opacity-80 leading-relaxed">
                  Nombre comercial, logotipos, banners de diseño, teléfono de contacto y configuración estética de tu tienda online.
                </p>
              </div>
              <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
                <span className="material-symbols-outlined text-[#5de6ff] mb-3 text-3xl">inventory_2</span>
                <h3 className="font-bold text-white text-xs uppercase tracking-wider mb-2">Productos e Inventario</h3>
                <p className="text-xs opacity-80 leading-relaxed">
                  Listado de artículos cargados, variantes de talles/colores, precios fijados, códigos SKU y existencias disponibles.
                </p>
              </div>
              <div className="bg-white/5 border border-white/5 rounded-2xl p-5">
                <span className="material-symbols-outlined text-[#fabc4e] mb-3 text-3xl">payments</span>
                <h3 className="font-bold text-white text-xs uppercase tracking-wider mb-2">Ventas y Facturación</h3>
                <p className="text-xs opacity-80 leading-relaxed">
                  Historial de cierres de caja (Corte Z), órdenes de compra de tu e-commerce y facturación interna de transacciones.
                </p>
              </div>
            </div>
          </section>

          <hr className="border-white/10" />

          {/* Section 2 */}
          <section className="space-y-4">
            <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
              <span className="text-[#5de6ff] font-bold">2.</span>
              Blindaje Total de Datos (Row Level Security)
            </h2>
            <p>
              En Obsidiana aplicamos un estricto aislamiento tecnológico multi-tenant a nivel de base de datos:
            </p>
            <ul className="space-y-3.5 pl-2">
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-[#5de6ff] text-sm shrink-0 mt-1">shield</span>
                <span><strong>Privacidad Maestra:</strong> Tu base de clientes, tus movimientos de caja y tu stock están completamente aislados de otros comercios registrados. Nadie fuera de tu personal autorizado puede acceder a tus registros.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-[#5de6ff] text-sm shrink-0 mt-1">shield</span>
                <span><strong>Sin Fuga de Datos:</strong> Ninguna información comercial de tu catálogo es compartida con redes publicitarias ajenas o competidores comerciales.</span>
              </li>
            </ul>
          </section>

          <hr className="border-white/10" />

          {/* Section 3 */}
          <section className="space-y-4">
            <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
              <span className="text-[#5de6ff] font-bold">3.</span>
              Los Datos de tus Compradores Finales
            </h2>
            <p>
              Cuando un cliente realiza un pedido en tu tienda, ingresa datos identificatorios (nombre, dirección de entrega y teléfono):
            </p>
            <ul className="space-y-3.5 pl-2">
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-[#b76dff] text-sm shrink-0 mt-1">check_circle</span>
                <span><strong>Propiedad del Comercio:</strong> La base de datos de tus clientes es de tu absoluta propiedad. Obsidiana nunca venderá, alquilará ni comercializará los datos de tus clientes a terceros bajo ningún concepto.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-[#b76dff] text-sm shrink-0 mt-1">check_circle</span>
                <span><strong>Pagos 100% Protegidos:</strong> Obsidiana no procesa ni almacena números de tarjeta, cuentas o claves de acceso. Toda transacción se canaliza mediante redirecciones seguras y cifradas a Mercado Pago o Mercado Libre.</span>
              </li>
            </ul>
          </section>

          <hr className="border-white/10" />

          {/* Section 4 */}
          <section className="space-y-4">
            <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
              <span className="text-[#5de6ff] font-bold">4.</span>
              Tus Derechos sobre tu Información Comercial
            </h2>
            <p>
              Tienes pleno derecho y control sobre tu información en nuestra Plataforma. En cualquier momento puedes modificar tu perfil, actualizar stock, editar precios, y en caso de que desees discontinuar el uso del servicio, solicitar la eliminación definitiva y total de todos tus registros comerciales en nuestros servidores escribiendo directamente a nuestro canal de soporte.
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
