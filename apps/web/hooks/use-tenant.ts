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
