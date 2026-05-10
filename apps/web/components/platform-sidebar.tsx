'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './auth-provider';

export function Sidebar() {
  const { signOut } = useAuth();
  const pathname = usePathname();

  const links = [
    { href: '/overview', label: 'System Overview', icon: 'dashboard' },
    { href: '/tenants', label: 'Tenants', icon: 'store' },
    { href: '/settings/payments', label: 'Payment Settings', icon: 'credit_card' },
    { href: '/settings/ml', label: 'ML Integration', icon: 'local_offer' },
    { href: '/subscriptions', label: 'Subscriptions', icon: 'payments' },
    { href: '/infrastructure', label: 'Infrastructure', icon: 'dns' }
  ];

  return (
    <nav className="hidden lg:flex flex-col h-full py-6 bg-zinc-900 border-r border-white/10 w-64 fixed top-0 left-0 z-50">
      <div className="px-6 mb-8 flex flex-col gap-1">
        <h1 className="text-xl font-black text-white tracking-tighter uppercase">Obsidiana</h1>
        <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em]">Super Admin Panel</p>
      </div>

      <ul className="flex flex-col flex-1 px-4 gap-1">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all font-inter text-[13px] font-semibold ${
                  isActive
                    ? 'bg-violet-500/10 text-violet-400 border-r-2 border-violet-500'
                    : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: isActive ? "'FILL' 1" : undefined }}>
                  {link.icon}
                </span>
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="px-6 mt-auto">
        <div className="flex flex-col gap-2 py-4 border-t border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center border border-white/10">
              <span className="material-symbols-outlined text-zinc-500 text-[18px]">admin_panel_settings</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white leading-none">Super User</span>
              <span className="text-[9px] text-zinc-500 font-black uppercase mt-1">Global Root</span>
            </div>
          </div>
          <button
            onClick={signOut}
            className="mt-2 w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all font-inter text-[13px] font-semibold text-zinc-500 hover:text-red-400 hover:bg-red-500/10 text-left"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            Cerrar Sesión
          </button>
        </div>
      </div>
    </nav>
  );
}
