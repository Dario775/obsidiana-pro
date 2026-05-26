'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './auth-provider';
import { useTenant } from '../hooks/use-tenant';
import { CURRENT_VERSION, CHANGELOG } from '../lib/version';

interface SidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
}

export function Sidebar({ isCollapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { user, signOut, role, permissions, isSuperAdmin } = useAuth();
  const { isOnlineStoreEnabled, getPlanName, loading: tenantLoading, tenant } = useTenant();
  const isPlatformAdmin = isSuperAdmin || tenant?.is_platform_admin === true;

  const [showChangelog, setShowChangelog] = React.useState(false);
  const [isNewVersion, setIsNewVersion] = React.useState(false);

  React.useEffect(() => {
    // Check if the user has seen the current version
    const lastSeenVersion = localStorage.getItem('obsidiana_last_seen_version');
    if (lastSeenVersion !== CURRENT_VERSION) {
      setIsNewVersion(true);
      setShowChangelog(true);
      localStorage.setItem('obsidiana_last_seen_version', CURRENT_VERSION);
    }
  }, []);

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  const navItemClasses = (path: string) => {
    const active = isActive(path);
    return `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-inter text-[13px] font-semibold ${
      active 
        ? 'bg-secondary/10 text-secondary border-r-2 border-secondary' 
        : 'text-zinc-500 hover:text-white hover:bg-white/5'
    }`;
  };

  return (
    <nav className={`hidden lg:flex flex-col h-screen overflow-y-auto py-6 bg-zinc-900 border-r border-white/5 w-64 fixed top-0 left-0 z-40 transition-all duration-300 ease-in-out ${
      isCollapsed ? '-translate-x-full opacity-0 pointer-events-none' : 'translate-x-0'
    }`}>
      <div className="px-6 mb-8 flex flex-col gap-2 relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="Obsidiana" className="w-6 h-6 object-contain brightness-110" />
            <h1 className="text-lg font-black text-white dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-violet-400 dark:to-fuchsia-400 leading-none tracking-tight">Obsidiana</h1>
          </div>
          {onToggle && (
            <button 
              onClick={onToggle}
              className="p-1.5 hover:bg-white/5 rounded-lg transition-colors text-zinc-500 hover:text-white"
              title="Esconder Menú"
            >
              <span className="material-symbols-outlined text-[18px]">menu_open</span>
            </button>
          )}
        </div>
        <p className="font-body-sm text-zinc-400 truncate">
          {isSuperAdmin ? 'Administración Global' : tenant?.nombre || 'Mi Tienda'}
        </p>
        <div className="mt-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border border-white/10 bg-zinc-800 flex items-center justify-center overflow-hidden">
            <span className="material-symbols-outlined text-zinc-500">person</span>
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="font-data-tabular text-on-background text-sm font-medium truncate max-w-[140px]">
              {user?.email || 'Admin de Tienda'}
            </span>
            <span className={`text-[10px] font-semibold uppercase tracking-wider ${isSuperAdmin ? 'text-violet-400' : 'text-zinc-600'}`}>
              {isSuperAdmin ? 'Super Admin' : 'Propietario'}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-2 mt-4">
          {isSuperAdmin ? (
            <Link href="/overview" className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-lg py-2 font-label-md uppercase tracking-wider hover:bg-opacity-90 transition-colors text-xs font-bold active:scale-95 transition-all text-center flex items-center justify-center gap-1.5 shadow-lg shadow-violet-500/20 border border-violet-500/25">
              <span className="material-symbols-outlined text-[15px] font-bold">admin_panel_settings</span>
              Super Admin
            </Link>
          ) : (
            <Link href="/pos/terminal" className="w-full bg-secondary dark:bg-gradient-to-r dark:from-violet-600 dark:to-fuchsia-600 dark:hover:from-violet-500 dark:hover:to-fuchsia-500 text-white rounded-lg py-2 font-label-md uppercase tracking-wider hover:brightness-110 transition-all text-xs font-bold active:scale-95 text-center shadow-md dark:shadow-violet-500/10">
              Venta Rápida
            </Link>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 space-y-8 custom-scrollbar">
        {/* Retail Core Section */}
        <div>
          <h2 className="px-3 mb-3 text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Gestión Retail</h2>
          <ul className="flex flex-col gap-1">
            <li>
              <Link href="/dashboard" className={navItemClasses('/dashboard')}>
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: isActive('/dashboard') ? "'FILL' 1" : "" }}>dashboard</span>
                Panel General
              </Link>
            </li>
            <li>
              <Link href="/pos" className={navItemClasses('/pos')}>
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: isActive('/pos') ? "'FILL' 1" : "" }}>point_of_sale</span>
                Terminal POS
              </Link>
            </li>
            {permissions.cash_close !== false && (
              <>
                <li>
                  <Link href="/pos/closure" className={navItemClasses('/pos/closure')}>
                    <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: isActive('/pos/closure') ? "'FILL' 1" : "" }}>lock</span>
                    Cierre de Caja (Z)
                  </Link>
                </li>
                <li>
                  <Link href="/pos/history" className={navItemClasses('/pos/history')}>
                    <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: isActive('/pos/history') ? "'FILL' 1" : "" }}>history</span>
                    Historial de Caja
                  </Link>
                </li>
              </>
            )}
            <li>
              <Link href="/inventory" className={navItemClasses('/inventory')}>
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: isActive('/inventory') ? "'FILL' 1" : "" }}>inventory_2</span>
                Inventario
              </Link>
            </li>
            <li>
              <Link href="/customers" className={navItemClasses('/customers')}>
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: isActive('/customers') ? "'FILL' 1" : "" }}>group</span>
                Clientes
              </Link>
            </li>
          </ul>
        </div>

        {/* Online Store Module */}
        <div className={`rounded-2xl p-2 border ${isOnlineStoreEnabled ? 'bg-secondary/5 border-secondary/20' : 'bg-zinc-900/50 border-white/5'}`}>
          <div className="flex items-center justify-between px-3 py-2 mb-2">
            <h2 className="text-[10px] font-medium text-secondary uppercase tracking-wider">Tienda Online</h2>
            {tenantLoading ? (
              <span className="bg-zinc-500/10 text-zinc-400 text-[8px] font-semibold px-1.5 py-0.5 rounded border border-zinc-500/20 uppercase tracking-wider">Cargando...</span>
            ) : isOnlineStoreEnabled ? (
              <span className="bg-emerald-500/10 text-emerald-400 text-[8px] font-semibold px-1.5 py-0.5 rounded border border-emerald-500/20 uppercase tracking-wider">{getPlanName()}</span>
            ) : (
              <span className="bg-amber-500/10 text-amber-400 text-[8px] font-semibold px-1.5 py-0.5 rounded border border-amber-500/20 uppercase tracking-wider">Requiere Plan</span>
            )}
          </div>
          <ul className="flex flex-col gap-1">
            <li>
              <Link href="/orders" className={`${navItemClasses('/orders')} ${!isOnlineStoreEnabled ? 'opacity-60 hover:opacity-100' : ''}`}>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: isActive('/orders') ? "'FILL' 1" : "" }}>shopping_bag</span>
                  <div className="flex flex-col">
                    <span>Pedidos Web</span>
                    {!isOnlineStoreEnabled && (
                      <span className="text-[9px] text-amber-500/70 font-medium">Sujeto a suscripción</span>
                    )}
                  </div>
                </div>
              </Link>
            </li>
            <li>
              <Link href="/online-catalog" className={`${navItemClasses('/online-catalog')} ${!isOnlineStoreEnabled ? 'opacity-60 hover:opacity-100' : ''}`}>
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: isActive('/online-catalog') ? "'FILL' 1" : "" }}>grid_view</span>
                <div className="flex flex-col">
                  <span>Catálogo Web</span>
                  {!isOnlineStoreEnabled && (
                    <span className="text-[9px] text-amber-500/70 font-medium">Sujeto a suscripción</span>
                  )}
                </div>
              </Link>
            </li>
            <li>
              <Link href="/settings/store" className={`${navItemClasses('/settings/store')} ${!isOnlineStoreEnabled ? 'opacity-60 hover:opacity-100' : ''}`}>
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: isActive('/settings/store') ? "'FILL' 1" : "" }}>language</span>
                <div className="flex flex-col">
                  <span>Personalización</span>
                  {!isOnlineStoreEnabled && (
                    <span className="text-[9px] text-amber-500/70 font-medium">Sujeto a suscripción</span>
                  )}
                </div>
              </Link>
            </li>

          </ul>
        </div>

        {/* Global Settings */}
        <div className="mt-auto pt-4 border-t border-white/5 space-y-1">
          {(role === 'owner' || role === 'admin') && (
            <Link href="/settings" className={navItemClasses('/settings')}>
              <span className="material-symbols-outlined text-[18px]">settings</span>
              Ajustes Globales
            </Link>
          )}
          <div 
            onClick={() => {
              setIsNewVersion(false);
              setShowChangelog(true);
            }}
            className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-zinc-950/40 border border-white/5 hover:border-violet-500/30 hover:bg-zinc-950/80 cursor-pointer group transition-all duration-300 w-full"
          >
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-mono font-medium text-zinc-400 group-hover:text-zinc-200 transition-colors">
                v{CURRENT_VERSION}
              </span>
            </div>
            <span className="text-[9px] font-bold tracking-wider text-violet-400/80 group-hover:text-violet-400 uppercase flex items-center gap-1 transition-colors">
              Novedades
              <span className="material-symbols-outlined text-[10px] group-hover:translate-x-0.5 transition-transform">arrow_forward_ios</span>
            </span>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-inter text-[13px] font-semibold text-zinc-500 hover:text-red-400 hover:bg-red-500/10 w-full"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Changelog Modal */}
      {showChangelog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-md transition-all duration-300 animate-in fade-in">
          <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl shadow-violet-950/20 overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-violet-600/10 to-fuchsia-600/0 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-gradient-to-tr from-indigo-600/10 to-transparent rounded-full blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="relative px-6 py-5 border-b border-white/5 flex items-start justify-between bg-zinc-900/50 backdrop-blur-sm z-10">
              <div>
                {isNewVersion && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 mb-2 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20 text-[10px] font-bold uppercase tracking-wider animate-pulse">
                    <span className="material-symbols-outlined text-[12px]">celebration</span>
                    ¡Sistema Actualizado!
                  </span>
                )}
                <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                  Historial de Actualizaciones
                  <span className="text-xs font-mono text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded border border-white/5">
                    v{CURRENT_VERSION}
                  </span>
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Descubre las últimas mejoras, correcciones y nuevas funcionalidades añadidas a Obsidiana-Pro.
                </p>
              </div>
              <button 
                onClick={() => {
                  setShowChangelog(false);
                  setIsNewVersion(false);
                }}
                className="p-1.5 hover:bg-white/5 rounded-xl transition-all text-zinc-500 hover:text-white"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Content (Scrollable Timeline) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar z-10">
              <div className="relative border-l border-zinc-800 ml-3.5 pl-6 space-y-8">
                {CHANGELOG.map((entry, index) => {
                  const isCurrent = entry.version === CURRENT_VERSION;
                  return (
                    <div key={entry.version} className="relative group">
                      
                      {/* Timeline Dot */}
                      <span className={`absolute -left-[31px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full border transition-all duration-300 ${
                        isCurrent 
                          ? 'bg-violet-500 border-violet-400 shadow-lg shadow-violet-500/40 scale-110' 
                          : 'bg-zinc-900 border-zinc-700 group-hover:border-zinc-500'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${isCurrent ? 'bg-white' : 'bg-zinc-500 group-hover:bg-zinc-300'}`} />
                      </span>

                      {/* Header Card */}
                      <div className="flex flex-col gap-1.5 mb-3">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className={`text-sm font-black tracking-tight ${isCurrent ? 'text-violet-400' : 'text-zinc-200'}`}>
                            {entry.title}
                          </span>
                          <span className="text-[10px] font-mono text-zinc-500 bg-zinc-950 px-2 py-0.5 rounded border border-white/5">
                            v{entry.version}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-medium">
                            {entry.date}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 font-normal leading-relaxed">
                          {entry.description}
                        </p>
                      </div>

                      {/* Changes List */}
                      <ul className="grid grid-cols-1 gap-2 bg-zinc-950/40 border border-white/5 rounded-xl p-3">
                        {entry.changes.map((change, cIndex) => {
                          let badgeBg = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                          let badgeText = 'FEAT';
                          
                          if (change.type === 'fix') {
                            badgeBg = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
                            badgeText = 'FIX';
                          } else if (change.type === 'perf') {
                            badgeBg = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                            badgeText = 'PERF';
                          } else if (change.type === 'security') {
                            badgeBg = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
                            badgeText = 'SEGURIDAD';
                          } else if (change.type === 'style') {
                            badgeBg = 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20';
                            badgeText = 'DISEÑO';
                          }

                          return (
                            <li key={cIndex} className="flex items-start gap-2.5 text-xs text-zinc-300">
                              <span className={`inline-flex shrink-0 items-center justify-center px-1.5 py-0.5 rounded border text-[8px] font-bold tracking-wider uppercase ${badgeBg}`}>
                                {badgeText}
                              </span>
                              <span className="leading-tight mt-0.5">{change.text}</span>
                            </li>
                          );
                        })}
                      </ul>

                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-white/5 bg-zinc-950/50 backdrop-blur-sm flex items-center justify-between z-10">
              <span className="text-[10px] text-zinc-500 font-mono">
                Obsidiana Pro Suite • Todos los derechos reservados
              </span>
              <button 
                onClick={() => {
                  setShowChangelog(false);
                  setIsNewVersion(false);
                }}
                className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs transition-all active:scale-95 shadow-md shadow-violet-600/25"
              >
                Entendido
              </button>
            </div>

          </div>
        </div>
      )}
    </nav>
  );
}
