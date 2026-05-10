'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface Tab {
  label: string;
  href: string;
}

const TAB_MAP: Record<string, Tab[]> = {
  '/': [
    { label: 'Panel General', href: '/' },
    { label: 'Métricas', href: '/metrics' },
    { label: 'Actividad', href: '/activity' },
  ],
  '/pos': [
    { label: 'Terminal POS', href: '/pos' },
    { label: 'Ventas', href: '/pos/sales' },
    { label: 'Sesiones', href: '/pos/sessions' },
  ],
  '/inventory': [
    { label: 'Inventario', href: '/inventory' },
    { label: 'Movimientos', href: '/inventory/moves' },
    { label: 'Análisis', href: '/inventory/analytics' },
  ],
  '/customers': [
    { label: 'Base de Clientes', href: '/customers' },
    { label: 'Segmentos', href: '/customers/segments' },
    { label: 'Fidelización', href: '/customers/loyalty' },
  ],
  '/orders': [
    { label: 'Pedidos Web', href: '/orders' },
    { label: 'Despacho', href: '/orders/shipping' },
    { label: 'Análisis', href: '/orders/analytics' },
  ],
  '/online-catalog': [
    { label: 'Catálogo Web', href: '/online-catalog' },
    { label: 'Categorías', href: '/online-catalog/categories' },
    { label: 'Sincronización', href: '/online-catalog/sync' },
  ],
  '/settings/store': [
    { label: 'Apariencia', href: '/settings/store' },
    { label: 'Pagos', href: '/settings/store/payments' },
    { label: 'Dominios', href: '/settings/store/domains' },
  ],
};

export function Topbar() {
  const pathname = usePathname();

  // Find the closest base path that has tabs, sorting by length to get more specific matches first
  const sortedPaths = Object.keys(TAB_MAP).sort((a, b) => b.length - a.length);
  const basePath = sortedPaths.find(path => 
    path === '/' ? pathname === '/' : pathname.startsWith(path)
  );

  const tabs = basePath ? TAB_MAP[basePath] : null;

  return (
    <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-zinc-950/90 backdrop-blur-md border-b border-white/10 lg:ml-64 lg:w-[calc(100%-16rem)]">
      <div className="flex items-center gap-4 h-full">
        <span className="text-xl font-black tracking-tighter text-white uppercase lg:hidden">Obsidiana</span>
        
        {/* Dynamic Tabs */}
        <nav className="hidden md:flex gap-1 h-full items-center">
          {tabs?.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`px-4 h-full flex items-center text-[11px] font-black uppercase tracking-widest transition-all relative group ${
                  isActive ? 'text-secondary' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {tab.label}
                {isActive && (
                  <div className="absolute bottom-0 left-0 w-full h-[2px] bg-secondary shadow-[0_0_15px_rgba(0,162,230,0.6)]" />
                )}
                {!isActive && (
                  <div className="absolute bottom-0 left-4 right-4 h-[2px] bg-white/0 group-hover:bg-white/10 transition-all" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <button className="hidden md:block bg-primary-container text-white px-4 py-2 rounded-lg font-label-md uppercase tracking-wider hover:bg-opacity-90 transition-colors shadow-[0_0_10px_rgba(124,58,237,0.2)] text-[11px] font-bold active:scale-95">
          Nueva Transacción
        </button>
        <div className="flex items-center gap-2 text-violet-500">
          <button className="p-2 hover:bg-white/5 rounded-full transition-colors relative">
            <span className="material-symbols-outlined text-[22px]">notifications</span>
            <div className="absolute top-2 right-2 w-2 h-2 bg-secondary rounded-full border border-zinc-950"></div>
          </button>
          <button className="p-2 hover:bg-white/5 rounded-full transition-colors hidden md:block">
            <span className="material-symbols-outlined text-[22px]">settings</span>
          </button>
          <button className="p-2 hover:bg-white/5 rounded-full transition-colors lg:hidden">
            <span className="material-symbols-outlined text-[22px]">account_circle</span>
          </button>
        </div>
      </div>
    </header>
  );
}
