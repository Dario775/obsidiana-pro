'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './auth-provider';
import { useTenant } from '../hooks/use-tenant';

export function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { isOnlineStoreEnabled, getPlanName, loading: tenantLoading, tenant } = useTenant();
  const isPlatformAdmin = tenant?.is_platform_admin === true;

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  const navItemClasses = (path: string) => {
    const active = isActive(path);
    return `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-inter text-[13px] font-semibold ${
      active 
        ? 'bg-violet-500/10 text-violet-400 border-r-2 border-violet-500' 
        : 'text-zinc-500 hover:text-white hover:bg-white/5'
    }`;
  };

  return (
    <nav className="hidden lg:flex flex-col h-full py-6 bg-zinc-900 border-r border-white/5 w-64 fixed top-0 left-0 z-40">
      <div className="px-6 mb-8 flex flex-col gap-2">
        <h1 className="text-lg font-black text-white">Obsidiana Admin</h1>
        <p className="font-body-sm text-zinc-400">Casa Central - AR</p>
        <div className="mt-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border border-white/10 bg-zinc-800 flex items-center justify-center overflow-hidden">
            <span className="material-symbols-outlined text-zinc-500">person</span>
          </div>
          <div className="flex flex-col">
            <span className="font-data-tabular text-on-background text-sm font-medium truncate max-w-[140px]">
              {user?.email || 'Admin de Tienda'}
            </span>
            <span className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">Propietario</span>
          </div>
        </div>
        <div className="flex flex-col gap-2 mt-4">
          <Link href="/pos/terminal" className="w-full bg-primary-container text-white rounded-lg py-2 font-label-md uppercase tracking-wider hover:bg-opacity-90 transition-colors text-xs font-bold active:scale-95 transition-all text-center">
            Venta Rápida
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 space-y-8 custom-scrollbar">
        {/* Retail Core Section */}
        <div>
          <h2 className="px-3 mb-3 text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">Gestión Retail</h2>
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
        <div className={`rounded-2xl p-2 border ${isOnlineStoreEnabled ? 'bg-violet-500/5 border-violet-500/20' : 'bg-zinc-900/50 border-white/5'}`}>
          <div className="flex items-center justify-between px-3 py-2 mb-2">
            <h2 className="text-[10px] font-black text-secondary uppercase tracking-[0.2em]">Tienda Online</h2>
            {tenantLoading ? (
              <span className="bg-zinc-500/10 text-zinc-500 text-[8px] font-black px-1.5 py-0.5 rounded border border-zinc-500/20 uppercase tracking-widest">Cargando...</span>
            ) : isOnlineStoreEnabled ? (
              <span className="bg-emerald-500/10 text-emerald-400 text-[8px] font-black px-1.5 py-0.5 rounded border border-emerald-500/20 uppercase tracking-widest">{getPlanName()}</span>
            ) : (
              <span className="bg-amber-500/10 text-amber-400 text-[8px] font-black px-1.5 py-0.5 rounded border border-amber-500/20 uppercase tracking-widest">Requiere Plan</span>
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
            <li>
              <Link href="/settings/ml-affiliate" className={`${navItemClasses('/settings/ml-affiliate')} ${!isOnlineStoreEnabled && !isPlatformAdmin ? 'opacity-60 hover:opacity-100' : ''}`}>
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: isActive('/settings/ml-affiliate') ? "'FILL' 1" : "" }}>local_offer</span>
                <div className="flex flex-col">
                  <span>ML Afiliado</span>
                  {!isOnlineStoreEnabled && !isPlatformAdmin && (
                    <span className="text-[9px] text-amber-500/70 font-medium">Sujeto a suscripción</span>
                  )}
                </div>
              </Link>
            </li>
          </ul>
        </div>

        {/* Global Settings */}
        <div className="mt-auto pt-4 border-t border-white/5 space-y-1">
          <Link href="/settings" className={navItemClasses('/settings')}>
            <span className="material-symbols-outlined text-[18px]">settings</span>
            Ajustes Globales
          </Link>
          <button
            onClick={signOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-inter text-[13px] font-semibold text-zinc-500 hover:text-red-400 hover:bg-red-500/10 w-full"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            Cerrar Sesión
          </button>
        </div>
      </div>
    </nav>
  );
}
