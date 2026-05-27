'use client';

import { AuthProvider, useAuth } from '../../components/auth-provider';
import Link from 'next/link';
import Image from 'next/image';

function UnauthorizedContent() {
  const { user, signOut, isSuperAdmin } = useAuth();

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 relative overflow-hidden font-inter selection:bg-violet-500/30 selection:text-white">
      {/* Luces de fondo premium */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet-600/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 left-1/4 w-72 h-72 bg-indigo-600/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-[500px] z-10 text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
        {/* Logo */}
        <div className="flex justify-center mb-2">
          <Image src="/logo.png" alt="Logo" width={56} height={56} className="h-14 w-auto brightness-110 drop-shadow-[0_0_15px_rgba(139,92,246,0.3)]" />
        </div>

        {/* Contenedor Glassmorphic */}
        <div className="bg-zinc-900/60 backdrop-blur-md border border-white/5 rounded-3xl p-8 md:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          {/* Escudo/Llave Brillante */}
          <div className="relative w-20 h-20 mx-auto mb-6 flex items-center justify-center bg-violet-500/10 border border-violet-500/20 rounded-2xl animate-pulse">
            <span className="material-symbols-outlined text-[36px] text-violet-400 drop-shadow-[0_0_10px_rgba(167,139,250,0.5)]">
              {isSuperAdmin ? 'shield_person' : 'lock'}
            </span>
          </div>

          {/* Título */}
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-none mb-3">
            Acceso Restringido
          </h1>
          <p className="text-zinc-500 text-xs font-semibold uppercase tracking-widest mb-6">
            Control de Seguridad Obsidiana
          </p>

          {/* Mensajes Personalizados según el Rol */}
          {isSuperAdmin ? (
            <div className="space-y-4">
              <p className="text-zinc-300 text-sm leading-relaxed">
                Hola, <span className="font-semibold text-violet-400">{user?.email}</span>. Tu rol de <span className="font-bold text-white uppercase tracking-wider text-[11px] bg-violet-500/20 px-2 py-0.5 rounded border border-violet-500/30">Super Admin</span> está diseñado exclusivamente para la administración global y la infraestructura de la plataforma.
              </p>
              <p className="text-zinc-400 text-[13px] leading-relaxed bg-zinc-950/40 p-4 rounded-xl border border-white/5">
                Para evitar inconsistencias en la base de datos y mantener el estricto aislamiento multitenant, no tienes una tienda asignada ni acceso a los flujos de venta directa de comerciantes.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-zinc-300 text-sm leading-relaxed">
                Lo sentimos, <span className="font-semibold text-violet-400">{user?.email || 'usuario'}</span>. Tu cuenta no dispone de los niveles de autorización requeridos para acceder al panel de administración central de la plataforma.
              </p>
              <p className="text-zinc-400 text-[13px] leading-relaxed bg-zinc-950/40 p-4 rounded-xl border border-white/5">
                Esta sección está reservada únicamente para auditores globales y administradores de infraestructura del sistema Obsidiana.
              </p>
            </div>
          )}

          {/* Botones de Acción */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            {isSuperAdmin ? (
              <Link
                href="/overview"
                className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-[14px] py-3.5 px-6 rounded-xl shadow-lg shadow-violet-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 border border-violet-500/20"
              >
                <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
                Volver a Consola Global
              </Link>
            ) : (
              <Link
                href="/dashboard"
                className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-[14px] py-3.5 px-6 rounded-xl shadow-lg shadow-violet-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 border border-violet-500/20"
              >
                <span className="material-symbols-outlined text-[18px]">grid_view</span>
                Volver a mi Tienda
              </Link>
            )}

            <button
              onClick={async () => {
                await signOut();
                window.location.href = '/login';
              }}
              className="flex-1 bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 hover:text-white font-semibold text-[14px] py-3.5 px-6 rounded-xl border border-white/5 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              Cerrar Sesión
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-zinc-600 text-xs">
          Obsidiana &copy; {new Date().getFullYear()} &bull; Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
}

export default function UnauthorizedPage() {
  return (
    <AuthProvider>
      <UnauthorizedContent />
    </AuthProvider>
  );
}
