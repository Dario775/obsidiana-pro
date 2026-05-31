'use client';

import React, { useState, useEffect, useContext, createContext, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';

export interface Tenant {
  id: string;
  slug: string;
  nombre: string;
  cuit: string | null;
  condicion_iva: string | null;
  status: string;
  plan_id: string | null;
  online_store_enabled: boolean;
  settings: Record<string, any>;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  credit_limit: number;
  created_at: string;
  plan_started_at: string | null;
  paid_until: string | null;
  subscription_status: string | null;
  store_name: string | null;
  store_description: string | null;
  store_theme: string;
  store_domain: string | null;
  store_logo_url: string | null;
  store_banner_url: string | null;
  store_banners: string[];
  store_tagline: string | null;
  store_social_instagram: string | null;
  store_social_facebook: string | null;
  store_social_whatsapp: string | null;
  store_currency: string;
  store_min_order_amount: number;
  store_shipping_enabled: boolean;
  store_shipping_free_threshold: number | null;
  store_shipping_cost: number;
  store_active: boolean;
  store_payment_methods: Array<{
    id: string;
    name: string;
    enabled: boolean;
    icon?: string;
    config?: Record<string, any>;
  }>;
  custom_domain: string | null;
  custom_domain_verified: boolean;
  custom_domain_cname: string | null;
  store_template: string;
  is_platform_admin: boolean;
  ml_affiliate_id?: string | null;
  ml_affiliate_word?: string | null;
  ml_access_token?: string | null;
  ml_refresh_token?: string | null;
  ml_token_expires_at?: string | null;
  ml_user_id?: string | null;
  store_mp_access_token?: string | null;
  store_mp_public_key?: string | null;
}

export interface Plan {
  id: string;
  name: string;
  nombre?: string;
  precio_mensual?: number;
  monthly_price: number;
  yearly_price: number;
  max_products: number;
  max_branches: number;
  max_users: number;
  online_store?: boolean;
  pos?: boolean;
  features: Record<string, any>;
  description?: string | null;
  created_at: string;
}

interface TenantContextValue {
  tenant: Tenant | null;
  plan: Plan | null;
  loading: boolean;
  error: string | null;
  hasFeature: (featureName: string) => boolean;
  getPlanName: () => string;
  isOnlineStoreEnabled: boolean;
}

const TenantContext = createContext<TenantContextValue | null>(null);

/**
 * Shared function to fetch tenant and plan data.
 * Used by both TenantProvider and useTenantStandalone to avoid duplication.
 */
async function fetchTenantData(): Promise<{ tenant: Tenant | null; plan: Plan | null; error: string | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { tenant: null, plan: null, error: 'No hay sesión activa' };
    }

    let tenantId = user.user_metadata?.tenant_id;

    const SUPER_ADMIN_EMAIL = 'dary775@gmail.com';
    const PLATFORM_TENANT_ID = process.env.NEXT_PUBLIC_PLATFORM_TENANT_ID || '51605ab9-958d-4e81-8360-8007fe842c85';

    // DEFINITIVE: Super Admin detection by email — always takes priority
    if (user.email === SUPER_ADMIN_EMAIL) {
      tenantId = PLATFORM_TENANT_ID;
    }

    // Fallback: Detectar super admin por is_platform_admin en user_metadata
    if (!tenantId && user.user_metadata?.is_platform_admin === true) {
      tenantId = PLATFORM_TENANT_ID;
    }


    if (!tenantId) {
      const { data: memberData } = await supabase
        .from('tenant_members')
        .select('tenant_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      
      if (memberData) {
        tenantId = memberData.tenant_id;
      }
    }

    if (!tenantId) {
      return { tenant: null, plan: null, error: 'Tu cuenta no tiene un negocio asignado. Contactá al administrador.' };
    }
    
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single();

    if (tenantError) throw tenantError;
    
    let planData: Plan | null = null;
    if (tenantData?.plan_id) {
      const { data: pData, error: planError } = await supabase
        .from('plans')
        .select('*')
        .eq('id', tenantData.plan_id)
        .single();
      
      if (!planError && pData) {
        planData = pData;
      }
    }

    return { tenant: tenantData || null, plan: planData, error: null };
  } catch (err: any) {
    return { tenant: null, plan: null, error: err.message };
  }
}

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const result = await fetchTenantData();
      if (!cancelled) {
        setTenant(result.tenant);
        setPlan(result.plan);
        setError(result.error);
        setLoading(false);
      }
    }

    load();

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (tenant && tenant.status !== 'active' && tenant.is_platform_admin !== true) {
      const timer = setTimeout(async () => {
        await supabase.auth.signOut();
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem('tenantId');
          window.location.href = '/login?error=Tu cuenta está suspendida. Contactá al soporte.';
        }
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [tenant]);

  const hasFeature = useCallback((featureName: string): boolean => {
    if (!tenant || !plan) return false;

    // online_store: el plan DEBE permitirlo Y el tenant debe tener la tienda habilitada
    if (featureName === 'online_store') {
      const planAllows = plan.online_store === true || plan.features?.['online_store'] === true;
      return !!(planAllows && tenant.online_store_enabled);
    }

    // pos: verificar en plan
    if (featureName === 'pos') return plan.pos === true;

    // resto de features en el JSONB del plan
    if (plan.features && plan.features[featureName] === true) return true;

    return false;
  }, [tenant, plan]);

  const getPlanName = useCallback((): string => {
    if (!plan) return 'Sin Plan';
    return plan.name || plan.nombre || 'Sin Nombre';
  }, [plan]);

  const value = useMemo<TenantContextValue>(() => ({
    tenant, plan, loading, error, hasFeature, getPlanName,
    isOnlineStoreEnabled: tenant?.online_store_enabled === true,
  }), [tenant, plan, loading, error, hasFeature, getPlanName]);

  if (!loading && tenant && tenant.status !== 'active' && tenant.is_platform_admin !== true) {
    return React.createElement('div', { className: 'min-h-screen flex items-center justify-center bg-zinc-950 p-6 relative overflow-hidden' },
      React.createElement('div', { className: 'absolute inset-0 pointer-events-none' },
        React.createElement('div', { className: 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[120px]' }),
        React.createElement('div', { className: 'absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:4rem_4rem]' })
      ),
      React.createElement('div', { className: 'relative z-10 text-center space-y-6 max-w-md w-full p-8 rounded-3xl bg-zinc-900/40 border border-white/5 backdrop-blur-md shadow-2xl animate-in fade-in zoom-in duration-300' },
        React.createElement('div', { className: 'w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto shadow-inner' },
          React.createElement('span', { className: 'material-symbols-outlined text-red-400 text-3xl' }, 'block')
        ),
        React.createElement('div', { className: 'space-y-3' },
          React.createElement('h2', { className: 'text-2xl font-black text-white tracking-tight' }, 'Tienda Suspendida'),
          React.createElement('p', { className: 'text-sm text-zinc-300 font-medium leading-relaxed' }, 
            'El acceso a ',
            React.createElement('span', { className: 'text-red-400 font-bold' }, tenant.nombre || tenant.store_name || 'tu tienda'),
            ' ha sido suspendido temporalmente.'
          ),
          React.createElement('p', { className: 'text-xs text-zinc-500 leading-relaxed' }, 
            'Por favor, ponte en contacto con soporte técnico o con la administración de la plataforma para resolver tu estado de cuenta.'
          )
        ),
        React.createElement('div', { className: 'pt-4 border-t border-white/5' },
          React.createElement('button', {
            onClick: async () => {
              await supabase.auth.signOut();
              if (typeof window !== 'undefined') {
                window.localStorage.removeItem('tenantId');
                window.location.href = '/login';
              }
            },
            className: 'w-full bg-zinc-900 hover:bg-zinc-800 text-white py-3 px-6 rounded-xl font-bold text-sm border border-white/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2'
          }, 
            React.createElement('span', { className: 'material-symbols-outlined text-[18px]' }, 'logout'),
            'Cerrar Sesión'
          )
        )
      )
    );
  }

  return React.createElement(TenantContext.Provider, { value }, children);
}

export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantContext);
  if (!ctx) {
    return useTenantStandalone();
  }
  return ctx;
}

/**
 * Standalone fallback — only used when there's no TenantProvider in the tree.
 */
function useTenantStandalone(): TenantContextValue {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const result = await fetchTenantData();
      if (!cancelled) {
        setTenant(result.tenant);
        setPlan(result.plan);
        setError(result.error);
        setLoading(false);
      }
    }

    load();

    return () => { cancelled = true; };
  }, []);

  const hasFeature = useCallback((featureName: string): boolean => {
    if (!tenant || !plan) return false;

    // online_store: el plan DEBE permitirlo Y el tenant debe tener la tienda habilitada
    if (featureName === 'online_store') {
      const planAllows = plan.online_store === true || plan.features?.['online_store'] === true;
      return !!(planAllows && tenant.online_store_enabled);
    }

    // pos: verificar en plan
    if (featureName === 'pos') return plan.pos === true;

    // resto de features en el JSONB del plan
    if (plan.features && plan.features[featureName] === true) return true;

    return false;
  }, [tenant, plan]);

  const getPlanName = useCallback((): string => {
    if (!plan) return 'Sin Plan';
    return plan.name || plan.nombre || 'Sin Nombre';
  }, [plan]);

  return {
    tenant, plan, loading, error, hasFeature, getPlanName,
    isOnlineStoreEnabled: tenant?.online_store_enabled === true,
  };
}
