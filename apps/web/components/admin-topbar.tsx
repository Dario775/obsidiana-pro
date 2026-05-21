'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { useTenant } from '../hooks/use-tenant';
import { useAuth } from './auth-provider';
import { ThemeToggle } from './theme-toggle';

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

interface TopbarProps {
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export function Topbar({ isSidebarCollapsed = false, onToggleSidebar }: TopbarProps) {
  const pathname = usePathname();
  const { tenant } = useTenant();
  const { user, signOut } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [supportType, setSupportType] = useState('consulta');
  const [supportMessage, setSupportMessage] = useState('');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const [activeSession, setActiveSession] = useState<any>(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const isOnPosPage = pathname.startsWith('/pos');

  useEffect(() => {
    if (tenant?.id && isOnPosPage) {
      const fetchSession = async () => {
        setSessionLoading(true);
        try {
          const { data, error } = await supabase
            .from('cash_sessions')
            .select('id, name, status, opened_at')
            .eq('tenant_id', tenant.id)
            .eq('status', 'open')
            .order('opened_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (!error && data) {
            setActiveSession(data);
          } else {
            setActiveSession(null);
          }
        } catch (err) {
          console.error('Error checking active session in topbar:', err);
        } finally {
          setSessionLoading(false);
        }
      };
      fetchSession();
      
      const channel = supabase
        .channel('cash-sessions-topbar')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'cash_sessions', filter: `tenant_id=eq.${tenant.id}` },
          () => {
            fetchSession();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setActiveSession(null);
    }
  }, [tenant?.id, isOnPosPage]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      alert(
        'Para instalar Obsidiana:\n\n' +
        '• En Chrome / Edge: Hacé click en el icono de instalación en la barra de direcciones de tu navegador.\n' +
        '• En Safari (iOS / Mac): Hacé click en "Compartir" y seleccioná "Agregar a inicio".'
      );
    }
  };

  const userInitials = user?.email
    ? user.email.split('@')[0]?.slice(0, 2).toUpperCase()
    : 'US';

  // Find the closest base path that has tabs, sorting by length to get more specific matches first
  const sortedPaths = Object.keys(TAB_MAP).sort((a, b) => b.length - a.length);
  const basePath = sortedPaths.find(path => 
    path === '/' ? pathname === '/' : pathname.startsWith(path)
  );

  const tabs = basePath ? TAB_MAP[basePath] : null;

  useEffect(() => {
    const tenantId = tenant?.id;
    if (!tenantId) return;
    
    // Load read notifications state
    const stored = localStorage.getItem(`read_notifications_${tenantId}`);
    const parsedReadIds = stored ? JSON.parse(stored) : [];
    setReadIds(parsedReadIds);

    async function loadNotifications() {
      const newNotifications: any[] = [];

      try {
        // 1. Check subscription expiry
        if (tenant?.paid_until) {
          const daysLeft = Math.ceil((new Date(tenant.paid_until).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          if (daysLeft <= 7 && daysLeft > 0) {
            newNotifications.push({
              id: 'sub-expiring',
              type: 'warning',
              title: 'Plan por vencer',
              message: `Tu plan vence en ${daysLeft} días. Hacé click para renovar.`,
              link: '/settings/billing',
              icon: 'credit_card',
              date: new Date().toISOString()
            });
          } else if (daysLeft <= 0) {
            newNotifications.push({
              id: 'sub-expired',
              type: 'error',
              title: 'Suscripción Vencida',
              message: 'Tu suscripción ha vencido. Actualizá tu plan para continuar operando.',
              link: '/settings/billing',
              icon: 'warning',
              date: new Date().toISOString()
            });
          }
        }

        // 2. Fetch critical stock
        const { data: inventoryData } = await supabase
          .from('inventory_levels')
          .select('available')
          .eq('tenant_id', tenantId);

        if (inventoryData) {
          const criticalCount = inventoryData.filter((inv: any) => inv.available <= 0).length;
          if (criticalCount > 0) {
            newNotifications.push({
              id: 'stock-critical',
              type: 'info',
              title: 'Stock Crítico',
              message: `Tenés ${criticalCount} producto${criticalCount > 1 ? 's' : ''} sin stock disponible.`,
              link: '/inventory',
              icon: 'inventory_2',
              date: new Date().toISOString()
            });
          }
        }

        // 3. Fetch recent online orders (placed in last 48 hours or status is pending)
        const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
        const { data: ordersData } = await supabase
          .from('orders')
          .select('id, number, status, channel, placed_at')
          .eq('tenant_id', tenantId)
          .eq('channel', 'online')
          .or(`status.eq.pending,placed_at.gte.${fortyEightHoursAgo}`)
          .order('placed_at', { ascending: false })
          .limit(5);

        if (ordersData) {
          ordersData.forEach((order: any) => {
            newNotifications.push({
              id: `order-${order.id}`,
              type: 'success',
              title: `Pedido Web #${order.number}`,
              message: `Pedido de Tienda Online con estado: ${order.status === 'pending' ? 'Pendiente de pago' : order.status}.`,
              link: '/orders',
              icon: 'shopping_bag',
              date: order.placed_at
            });
          });
        }
      } catch (err) {
        console.error('Error fetching notifications:', err);
      }

      setNotifications(newNotifications);
      
      // Filter out notifications that were already marked as read
      const unread = newNotifications.filter(n => !parsedReadIds.includes(n.id)).length;
      setUnreadCount(unread);
    }

    loadNotifications();
  }, [tenant]);

  const markAllAsRead = () => {
    const tenantId = tenant?.id;
    if (!tenantId) return;
    const allIds = notifications.map(n => n.id);
    const updated = Array.from(new Set([...readIds, ...allIds]));
    setReadIds(updated);
    localStorage.setItem(`read_notifications_${tenantId}`, JSON.stringify(updated));
    setUnreadCount(0);
  };

  const handleNotificationClick = (notif: any) => {
    const tenantId = tenant?.id;
    if (tenantId && !readIds.includes(notif.id)) {
      const updated = [...readIds, notif.id];
      setReadIds(updated);
      localStorage.setItem(`read_notifications_${tenantId}`, JSON.stringify(updated));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    setIsOpen(false);
  };

  return (
    <header className={`fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-zinc-950/90 backdrop-blur-md border-b border-white/10 transition-all duration-300 ease-in-out ${
      isSidebarCollapsed ? 'lg:ml-0 lg:w-full' : 'lg:ml-64 lg:w-[calc(100%-16rem)]'
    }`}>
      <div className="flex items-center gap-4 h-full">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="hidden lg:flex items-center justify-center p-2 hover:bg-white/5 rounded-lg transition-colors text-zinc-400 hover:text-white"
            title={isSidebarCollapsed ? "Mostrar Menú" : "Esconder Menú"}
          >
            <span className="material-symbols-outlined text-[20px]">
              {isSidebarCollapsed ? 'menu' : 'menu_open'}
            </span>
          </button>
        )}

        <div className="flex items-center gap-2 lg:hidden">
          <img src="/logo.svg" alt="Obsidiana" className="w-5 h-5 object-contain brightness-110" />
          <span className="text-lg font-black tracking-tight text-white uppercase leading-none">Obsidiana</span>
        </div>
        
        {/* Dynamic Tabs */}
        <nav className="hidden md:flex gap-1 h-full items-center">
          {tabs?.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`px-4 h-full flex items-center text-[11px] font-semibold uppercase tracking-wider transition-all relative group ${
                  isActive ? 'text-secondary' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {tab.label}
                {isActive && (
                  <div className="absolute bottom-0 left-0 w-full h-[2px] bg-secondary shadow-[0_0_15px_rgba(var(--secondary),0.6)]" />
                )}
                {!isActive && (
                  <div className="absolute bottom-0 left-4 right-4 h-[2px] bg-white/0 group-hover:bg-white/10 transition-all" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Centered Store Name */}
      {tenant?.nombre && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10">
          <span className="text-white text-[11px] md:text-[13px] font-bold uppercase tracking-widest bg-zinc-900/90 px-4 py-1.5 rounded-full border border-white/10 shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
            {tenant.nombre}
          </span>
        </div>
      )}

      <div className="flex items-center gap-4">
        {/* Acciones de Caja POS */}
        {pathname.startsWith('/pos') && activeSession && (
          <div className="flex items-center gap-2 mr-2">
            <span className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 text-green-400 bg-green-500/10 rounded-xl text-[9px] font-black uppercase tracking-widest border border-green-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
              {activeSession.name}
            </span>
            <Link 
              href="/pos/history" 
              className="bg-zinc-900 border border-white/5 hover:bg-zinc-800 text-zinc-400 hover:text-white px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors text-center font-bold"
            >
              Historial
            </Link>
            <Link 
              href="/pos/closure" 
              className="bg-red-500/10 border border-red-500/20 hover:bg-red-500/25 text-red-400 px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors text-center font-bold"
            >
              Cerrar Caja (Z)
            </Link>
          </div>
        )}

        {/* Instalar App (PWA) */}
        <button 
          onClick={handleInstallClick}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 hover:bg-white/5 rounded-xl text-zinc-400 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest"
        >
          <span className="material-symbols-outlined text-[18px]">download</span>
          <span>Instalar app</span>
        </button>

        {/* Theme Toggle (Light/Dark Mode) */}
        <ThemeToggle />

        <div className="flex items-center gap-2 text-violet-500 relative">
          <button 
            onClick={() => {
              setIsOpen(!isOpen);
              setIsProfileOpen(false);
            }}
            className="p-2 hover:bg-white/5 rounded-full transition-colors relative"
            title="Notificaciones"
          >
            <span className="material-symbols-outlined text-[22px]">notifications</span>
            {unreadCount > 0 && (
              <div className="absolute top-2 right-2 w-2 h-2 bg-secondary rounded-full border border-zinc-950 flex items-center justify-center">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
              </div>
            )}
          </button>

          {/* User Profile Avatar Trigger */}
          <button 
            onClick={() => {
              setIsProfileOpen(!isProfileOpen);
              setIsOpen(false);
            }}
            className="w-9 h-9 rounded-full bg-violet-600/20 border border-violet-500/30 text-violet-300 flex items-center justify-center text-xs font-black uppercase tracking-wider hover:scale-105 active:scale-95 transition-all relative overflow-hidden"
            title="Cuenta de Usuario"
          >
            {userInitials}
          </button>
          
          {isOpen && (
            <>
              <div 
                className="fixed inset-0 z-40 bg-transparent" 
                onClick={() => setIsOpen(false)}
              />
              <div className="absolute right-0 top-12 w-80 bg-zinc-950/95 border border-white/10 backdrop-blur-md text-white rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] z-50 overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10 bg-zinc-900/50">
                  <span className="font-semibold text-xs text-white uppercase tracking-wider">Notificaciones</span>
                  {unreadCount > 0 && (
                    <button 
                      onClick={markAllAsRead}
                      className="text-[10px] font-semibold text-violet-400 hover:text-white uppercase tracking-wider transition-colors"
                    >
                      Marcar leídas
                    </button>
                  )}
                </div>
                
                {/* List */}
                <div className="max-h-[300px] overflow-y-auto custom-scrollbar flex flex-col">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                      <span className="material-symbols-outlined text-zinc-600 text-3xl mb-2">notifications_off</span>
                      <p className="text-xs text-zinc-500 font-medium">No tenés notificaciones.</p>
                    </div>
                  ) : (
                    notifications.map((notif) => {
                      const isRead = readIds.includes(notif.id);
                      return (
                        <Link
                          key={notif.id}
                          href={notif.link}
                          onClick={() => handleNotificationClick(notif)}
                          className={`flex items-start gap-3 p-3.5 text-left transition-all border-b border-white/5 last:border-0 hover:bg-white/5 ${
                            isRead ? 'opacity-55' : 'bg-violet-500/5'
                          }`}
                        >
                          <div className={`p-2 rounded-xl flex items-center justify-center shrink-0 ${
                            notif.type === 'error' ? 'bg-red-500/10 text-red-400' :
                            notif.type === 'warning' ? 'bg-amber-500/10 text-amber-400' :
                            notif.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' :
                            'bg-blue-500/10 text-blue-400'
                          }`}>
                            <span className="material-symbols-outlined text-[18px]">{notif.icon}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className={`text-xs font-semibold truncate ${isRead ? 'text-zinc-400' : 'text-white'}`}>{notif.title}</p>
                              {!isRead && <div className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0"></div>}
                            </div>
                            <p className="text-[11px] text-zinc-400 font-normal mt-0.5 line-clamp-2">{notif.message}</p>
                            <span className="text-[9px] text-zinc-600 mt-1 block">
                              {new Intl.DateTimeFormat('es-AR', { 
                                day: 'numeric', 
                                month: 'short',
                                hour: '2-digit', 
                                minute: '2-digit' 
                              }).format(new Date(notif.date))}
                            </span>
                          </div>
                        </Link>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}

          {/* Profile Dropdown popover */}
          {isProfileOpen && (
            <>
              <div 
                className="fixed inset-0 z-40 bg-transparent" 
                onClick={() => setIsProfileOpen(false)}
              />
              <div className="absolute right-0 top-12 w-72 bg-zinc-950/95 border border-white/10 backdrop-blur-md text-white rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] z-50 overflow-hidden flex flex-col font-inter">
                {/* User Info Header */}
                <div className="p-4 border-b border-white/10 bg-zinc-900/40 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 flex items-center justify-center text-sm font-black uppercase">
                    {userInitials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-white truncate uppercase tracking-wider">{tenant?.nombre || 'Usuario'}</p>
                    <p className="text-[10px] text-zinc-500 truncate font-semibold">{user?.email || ''}</p>
                  </div>
                </div>

                {/* Menu Options */}
                <div className="py-2 flex flex-col">
                  <Link 
                    href="/settings/business" 
                    onClick={() => setIsProfileOpen(false)}
                    className="px-4 py-2.5 text-xs text-zinc-400 hover:text-white hover:bg-white/5 transition-colors flex items-center justify-between font-bold"
                  >
                    <span>Cuenta</span>
                    <span className="material-symbols-outlined text-[16px] text-zinc-500">open_in_new</span>
                  </Link>

                  <Link 
                    href="/settings/billing" 
                    onClick={() => setIsProfileOpen(false)}
                    className="px-4 py-2.5 text-xs text-zinc-400 hover:text-white hover:bg-white/5 transition-colors flex items-center justify-between font-bold"
                  >
                    <span>Suscripción</span>
                    <span className="material-symbols-outlined text-[16px] text-zinc-500">credit_card</span>
                  </Link>

                  <Link 
                    href="/" 
                    onClick={() => setIsProfileOpen(false)}
                    className="px-4 py-2.5 text-xs text-zinc-400 hover:text-white hover:bg-white/5 transition-colors flex items-center font-bold"
                  >
                    <span>Recientes</span>
                  </Link>

                  <button 
                    onClick={() => {
                      setIsSupportModalOpen(true);
                      setIsProfileOpen(false);
                    }}
                    className="px-4 py-2.5 text-xs text-zinc-400 hover:text-white hover:bg-white/5 transition-colors flex items-center justify-between font-bold text-left w-full"
                  >
                    <span>Asistencia</span>
                    <span className="material-symbols-outlined text-[16px] text-zinc-500">support_agent</span>
                  </button>


                  <Link 
                    href="/settings" 
                    onClick={() => setIsProfileOpen(false)}
                    className="px-4 py-2.5 text-xs text-zinc-400 hover:text-white hover:bg-white/5 transition-colors flex items-center font-bold"
                  >
                    <span>Configuración</span>
                  </Link>

                  <button 
                    onClick={() => {
                      setIsProfileOpen(false);
                      signOut();
                    }}
                    className="px-4 py-2.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-colors flex items-center font-bold text-left border-t border-white/5 mt-1"
                  >
                    <span>Cerrar sesión</span>
                  </button>
                </div>

                {/* Notices Section ("Tus avisos") */}
                <div className="border-t border-white/10 bg-zinc-950 p-4 flex flex-col items-center justify-center text-center">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest self-start mb-3">Tus avisos</p>
                  <span className="material-symbols-outlined text-emerald-400 text-[24px] mb-1">check_circle</span>
                  <p className="text-[11px] font-bold text-white mb-0.5">Estás al día</p>
                  <p className="text-[9px] text-zinc-500 leading-normal max-w-[200px]">En este espacio encontrarás avisos importantes sobre tu cuenta y novedades.</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      {/* Support Modal */}
      {isSupportModalOpen && (
        <>
          <div 
            className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm"
            onClick={() => setIsSupportModalOpen(false)}
          />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md bg-zinc-900 border border-white/10 text-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-50 overflow-hidden flex flex-col font-inter animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/10 bg-zinc-950/40">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-violet-400 text-[22px]">support_agent</span>
                <span className="font-black text-sm uppercase tracking-wider text-white">Centro de Asistencia</span>
              </div>
              <button 
                onClick={() => setIsSupportModalOpen(false)}
                className="p-1 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Body */}
            <div className="p-5 flex flex-col gap-5 overflow-y-auto max-h-[75vh]">
              {/* WhatsApp Option (Immediate Help) */}
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-emerald-400 text-[24px] shrink-0 mt-0.5">chat</span>
                  <div className="flex flex-col gap-0.5">
                    <p className="text-xs font-black text-emerald-400 uppercase tracking-wide">Soporte por WhatsApp</p>
                    <p className="text-[11px] text-zinc-300 leading-normal font-medium">
                      Escribinos directamente para recibir asistencia técnica en tiempo real.
                    </p>
                  </div>
                </div>
                <a 
                  href={`https://wa.me/5491123456789?text=Hola%20equipo%20de%20Obsidiana.%20Necesito%20soporte.%0A%0A*Detalles%20de%20mi%20cuenta*:%0A-%20*Tienda*:%20${encodeURIComponent(tenant?.nombre || '')}%0A-%20*Email*:%20${encodeURIComponent(user?.email || '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-emerald-950/20"
                >
                  <span className="material-symbols-outlined text-[18px]">chat</span>
                  <span>Chatear por WhatsApp</span>
                </a>
              </div>

              {/* Divider */}
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-white/5"></div>
                <span className="flex-shrink mx-3 text-[10px] text-zinc-500 font-black uppercase tracking-widest">O mandanos un correo</span>
                <div className="flex-grow border-t border-white/5"></div>
              </div>

              {/* Email Form */}
              <div className="flex flex-col gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Tipo de Consulta</label>
                  <select 
                    value={supportType}
                    onChange={(e) => setSupportType(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500 transition-colors font-semibold"
                  >
                    <option value="consulta">Duda / Consulta general</option>
                    <option value="problema">Reportar un Problema / Bug</option>
                    <option value="facturacion">Facturación / Plan</option>
                    <option value="sugerencia">Propuesta / Sugerencia</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Detalle de tu mensaje</label>
                  <textarea 
                    value={supportMessage}
                    onChange={(e) => setSupportMessage(e.target.value)}
                    rows={4}
                    placeholder="Contanos brevemente en qué podemos ayudarte..."
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition-colors font-medium resize-none"
                  />
                </div>

                <a 
                  href={`mailto:ayuda@obsidiana.com.ar?subject=${encodeURIComponent(`[Soporte ${supportType.toUpperCase()}] - ${tenant?.nombre || ''}`)}&body=${encodeURIComponent(
                    `Hola equipo de Obsidiana.\n\n` +
                    `Detalle de mi consulta:\n${supportMessage}\n\n` +
                    `----\n` +
                    `Detalles del cliente:\n` +
                    `- Tienda: ${tenant?.nombre || 'N/A'}\n` +
                    `- Email administrador: ${user?.email || 'N/A'}\n` +
                    `- URL del sistema: ${typeof window !== 'undefined' ? window.location.href : 'N/A'}\n`
                  )}`}
                  onClick={() => {
                    setIsSupportModalOpen(false);
                    setSupportMessage('');
                  }}
                  className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                    supportMessage.trim() 
                      ? 'bg-violet-600 hover:bg-violet-500 text-white cursor-pointer active:scale-95' 
                      : 'bg-zinc-800 text-zinc-500 pointer-events-none'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">mail</span>
                  <span>Enviar por Correo</span>
                </a>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 bg-zinc-950 text-center">
              <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">
                Horario de atención: Lunes a Viernes de 9 a 18 hs
              </p>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
