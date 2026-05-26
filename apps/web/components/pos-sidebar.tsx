'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from './auth-provider';
import { CURRENT_VERSION } from '../lib/version';

export function Sidebar() {
  const { signOut, role } = useAuth();

  return (
    <nav className="hidden lg:flex flex-col h-full py-6 bg-zinc-900 border-r border-white/5 w-64 fixed top-0 left-0 z-40">
      <div className="px-6 mb-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-surface-container-high border border-outline-variant flex items-center justify-center shrink-0 overflow-hidden">
          <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
            <span className="material-symbols-outlined text-zinc-500">person</span>
          </div>
        </div>
        <div>
          <h2 className="font-inter text-[13px] font-semibold text-white">Obsidiana Admin</h2>
          <p className="font-body-sm text-body-sm text-zinc-500">Casa Central - AR</p>
        </div>
      </div>
      
      <div className="flex flex-col gap-2 px-4 flex-1">
        <Link href="/" className="flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-all duration-200 ease-in-out font-inter text-[13px] font-semibold">
          <span className="material-symbols-outlined text-[20px]">dashboard</span>
          Dashboard
        </Link>
        <Link href="/pos" className="flex items-center gap-3 px-3 py-2 rounded-lg bg-violet-500/10 text-violet-400 border-r-2 border-violet-500 transition-all duration-200 ease-in-out font-inter text-[13px] font-semibold">
          <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>point_of_sale</span>
          POS Terminal
        </Link>
        <Link href="/inventory" className="flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-all duration-200 ease-in-out font-inter text-[13px] font-semibold">
          <span className="material-symbols-outlined text-[20px]">inventory_2</span>
          Inventory
        </Link>
        <Link href="/orders" className="flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-all duration-200 ease-in-out font-inter text-[13px] font-semibold">
          <span className="material-symbols-outlined text-[20px]">shopping_bag</span>
          Orders
        </Link>
        <Link href="/customers" className="flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-all duration-200 ease-in-out font-inter text-[13px] font-semibold">
          <span className="material-symbols-outlined text-[20px]">group</span>
          Customers
        </Link>
        {(role === 'owner' || role === 'admin') && (
          <Link href="/settings" className="flex items-center gap-3 px-3 py-2 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-all duration-200 ease-in-out font-inter text-[13px] font-semibold">
            <span className="material-symbols-outlined text-[20px]">settings</span>
            Settings
          </Link>
        )}
      </div>

      <div className="px-4 mt-auto flex flex-col gap-2 pt-4 border-t border-white/5">
        <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-zinc-950/20 border border-white/5 w-full">
          <span className="text-[10px] text-zinc-500 font-mono">Sistema POS</span>
          <span className="text-[10px] text-zinc-400 font-mono font-medium">v{CURRENT_VERSION}</span>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-inter text-[13px] font-semibold text-zinc-500 hover:text-red-400 hover:bg-red-500/10 w-full"
        >
          <span className="material-symbols-outlined text-[18px]">logout</span>
          Cerrar Sesión
        </button>
      </div>
    </nav>
  );
}
