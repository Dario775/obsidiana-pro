'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MobileMenuDrawer } from './mobile-menu-drawer';

export function AdminBottomNav() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-2 py-2 pb-safe bg-zinc-950/95 border-t border-white/10 shadow-[0_-4px_10px_rgba(0,0,0,0.5)]">
        {/* Panel General */}
        <Link 
          href="/dashboard" 
          className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all btn-native-active ${
            isActive('/dashboard') ? 'text-secondary scale-105' : 'text-zinc-500'
          }`}
        >
          <span 
            className="material-symbols-outlined text-[24px]"
            style={{ fontVariationSettings: isActive('/dashboard') ? "'FILL' 1" : "" }}
          >
            dashboard
          </span>
          <span className="font-inter text-[9px] uppercase font-black mt-0.5">Panel</span>
        </Link>

        {/* POS */}
        <Link 
          href="/pos" 
          className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all btn-native-active ${
            isActive('/pos') ? 'text-secondary scale-105' : 'text-zinc-500'
          }`}
        >
          <span 
            className="material-symbols-outlined text-[24px]"
            style={{ fontVariationSettings: isActive('/pos') ? "'FILL' 1" : "" }}
          >
            calculate
          </span>
          <span className="font-inter text-[9px] uppercase font-black mt-0.5">POS</span>
        </Link>

        {/* Stock */}
        <Link 
          href="/inventory" 
          className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all btn-native-active ${
            isActive('/inventory') ? 'text-secondary scale-105' : 'text-zinc-500'
          }`}
        >
          <span 
            className="material-symbols-outlined text-[24px]"
            style={{ fontVariationSettings: isActive('/inventory') ? "'FILL' 1" : "" }}
          >
            grid_view
          </span>
          <span className="font-inter text-[9px] uppercase font-black mt-0.5">Stock</span>
        </Link>

        {/* Clientes */}
        <Link 
          href="/customers" 
          className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all btn-native-active ${
            isActive('/customers') ? 'text-secondary scale-105' : 'text-zinc-500'
          }`}
        >
          <span 
            className="material-symbols-outlined text-[24px]"
            style={{ fontVariationSettings: isActive('/customers') ? "'FILL' 1" : "" }}
          >
            group
          </span>
          <span className="font-inter text-[9px] uppercase font-black mt-0.5">Clientes</span>
        </Link>

        {/* Menú Drawer Trigger */}
        <button 
          onClick={() => setIsMenuOpen(true)}
          className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all btn-native-active ${
            isMenuOpen ? 'text-secondary scale-105' : 'text-zinc-500'
          }`}
        >
          <span className="material-symbols-outlined text-[24px]">menu</span>
          <span className="font-inter text-[9px] uppercase font-black mt-0.5">Menú</span>
        </button>
      </nav>

      {/* Drawer Menu */}
      <MobileMenuDrawer isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </>
  );
}
