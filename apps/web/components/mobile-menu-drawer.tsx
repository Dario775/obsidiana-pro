'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './auth-provider';
import { useTenant } from '../hooks/use-tenant';
import { useTheme } from './theme-provider';
import { ThemeToggle } from './theme-toggle';

interface MobileMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileMenuDrawer({ isOpen, onClose }: MobileMenuDrawerProps) {
  const pathname = usePathname();
  const { user, signOut, role, permissions } = useAuth();
  const { tenant, isOnlineStoreEnabled } = useTenant();
  const { theme } = useTheme();

  // Prevent background scrolling when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  const menuItems = [
    {
      title: 'Panel General',
      href: '/dashboard',
      icon: 'dashboard',
      desc: 'Métricas y KPIs del negocio'
    },
    {
      title: 'Terminal POS',
      href: '/pos',
      icon: 'calculate',
      desc: 'Registrar ventas rápidas'
    },
    ...(permissions.cash_close !== false ? [
      {
        title: 'Cierre de Caja Z',
        href: '/pos/closure',
        icon: 'lock',
        desc: 'Cerrar turno y arqueo'
      },
      {
        title: 'Historial de Caja',
        href: '/pos/history',
        icon: 'history',
        desc: 'Auditoría de sesiones de caja'
      }
    ] : []),
    {
      title: 'Control de Stock',
      href: '/inventory',
      icon: 'grid_view',
      desc: 'Inventario y alertas'
    },
    {
      title: 'Base de Clientes',
      href: '/customers',
      icon: 'group',
      desc: 'Crédito y cuentas corrientes'
    }
  ];

  const onlineStoreItems = [
    {
      title: 'Pedidos Web',
      href: '/orders',
      icon: 'shopping_bag',
      desc: 'Gestión de ventas online',
      requiresStore: true
    },
    {
      title: 'Catálogo Web',
      href: '/online-catalog',
      icon: 'storefront',
      desc: 'Editar productos online',
      requiresStore: true
    },
    {
      title: 'Personalización',
      href: '/settings/store',
      icon: 'language',
      desc: 'Personalizar banner y colores',
      requiresStore: true
    }
  ];

  return (
    <div className="lg:hidden fixed inset-0 z-[100] flex flex-col justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-out"
        onClick={onClose}
      />

      {/* Slide-up Container */}
      <div 
        className="relative z-10 w-full max-h-[85vh] overflow-y-auto bg-zinc-900/98 border-t border-white/10 rounded-t-2xl shadow-[0_-8px_30px_rgba(0,0,0,0.8)] pb-safe transition-transform duration-300 ease-out translate-y-0"
      >
        {/* Pull Indicator Bar */}
        <div className="flex justify-center py-3">
          <div className="w-12 h-1.5 bg-white/20 rounded-full" onClick={onClose} />
        </div>

        {/* Header */}
        <div className="px-6 pb-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="Obsidiana Logo" className="w-7 h-7 object-contain brightness-110" />
            <div>
              <h2 className="text-base font-black text-white tracking-tight leading-none">Obsidiana</h2>
              <p className="text-[10px] text-zinc-500 font-semibold mt-1">
                {tenant?.nombre || 'Mi Negocio'} · {user?.email}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 active:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 space-y-6">
          {/* Main Retail Section */}
          <div>
            <h3 className="text-[11px] font-black text-zinc-500 uppercase tracking-widest mb-3">Gestión Retail</h3>
            <div className="grid grid-cols-1 gap-2">
              {menuItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link 
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center gap-4 p-3 rounded-xl transition-all btn-native-active ${
                      active 
                        ? 'bg-secondary/10 text-secondary border-l-4 border-secondary' 
                        : 'bg-white/5 text-zinc-300 hover:text-white'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[22px] text-secondary" style={{ fontVariationSettings: active ? "'FILL' 1" : "" }}>
                      {item.icon}
                    </span>
                    <div className="flex-1 flex flex-col">
                      <span className="text-[13px] font-bold tracking-tight">{item.title}</span>
                      <span className="text-[10px] text-zinc-500 font-medium">{item.desc}</span>
                    </div>
                    <span className="material-symbols-outlined text-[16px] text-zinc-600">chevron_right</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Online Store Section */}
          <div>
            <h3 className="text-[11px] font-black text-zinc-500 uppercase tracking-widest mb-3">Tienda Online</h3>
            <div className="grid grid-cols-1 gap-2">
              {onlineStoreItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link 
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center gap-4 p-3 rounded-xl transition-all btn-native-active ${
                      !isOnlineStoreEnabled ? 'opacity-65' : ''
                    } ${
                      active 
                        ? 'bg-secondary/10 text-secondary border-l-4 border-secondary' 
                        : 'bg-white/5 text-zinc-300 hover:text-white'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[22px] text-secondary" style={{ fontVariationSettings: active ? "'FILL' 1" : "" }}>
                      {item.icon}
                    </span>
                    <div className="flex-1 flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-bold tracking-tight">{item.title}</span>
                        {!isOnlineStoreEnabled && (
                          <span className="text-[8px] bg-amber-500/10 text-amber-500 font-extrabold uppercase px-1.5 py-0.5 rounded">Básico</span>
                        )}
                      </div>
                      <span className="text-[10px] text-zinc-500 font-medium">{item.desc}</span>
                    </div>
                    <span className="material-symbols-outlined text-[16px] text-zinc-600">chevron_right</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Foot Actions */}
          <div className="pt-4 border-t border-white/5 flex flex-col gap-2">
            {/* Selector de Tema */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 text-zinc-300">
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-[20px] text-zinc-400">
                  {theme === 'dark' ? 'dark_mode' : 'light_mode'}
                </span>
                <span className="text-[13px] font-bold">Tema: {theme === 'dark' ? 'Oscuro' : 'Claro'}</span>
              </div>
              <ThemeToggle />
            </div>

            {(role === 'owner' || role === 'admin') && (
              <Link 
                href="/settings"
                onClick={onClose}
                className={`flex items-center gap-4 p-3 rounded-xl transition-all btn-native-active ${
                  isActive('/settings') ? 'bg-secondary/10 text-secondary' : 'bg-white/5 text-zinc-300'
                }`}
              >
                <span className="material-symbols-outlined text-[20px] text-zinc-400">settings</span>
                <span className="text-[13px] font-bold">Ajustes Globales</span>
              </Link>
            )}

            <button 
              onClick={() => {
                onClose();
                signOut();
              }}
              className="flex items-center gap-4 p-3 rounded-xl bg-red-500/10 text-red-400 transition-all active:bg-red-500/20 btn-native-active w-full text-left"
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
              <span className="text-[13px] font-bold">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
