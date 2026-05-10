'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const DEFAULT_TENANT_ID = '11111111-1111-1111-1111-111111111111';

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
  // Subscription
  plan_started_at: string | null;
  paid_until: string | null;
  subscription_status: string | null;
  // Online store
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
}

export interface Plan {
  id: string;
  nombre: string;
  precio_mensual: number;
  features: Record<string, any>;
  created_at: string;
}

export function useTenant() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTenant() {
      try {
        setLoading(true);

        let tenantIdToFetch = DEFAULT_TENANT_ID;

        // 1. First prioritize the user's auth metadata tenant_id
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.user_metadata?.tenant_id) {
          tenantIdToFetch = user.user_metadata.tenant_id;
        } else if (typeof window !== 'undefined') {
          // 2. Second priority is stored tenantId
          const stored = window.localStorage.getItem('tenantId');
          if (stored) {
            tenantIdToFetch = stored;
          }
        }
        
        // Fetch tenant
        const { data: tenantData, error: tenantError } = await supabase
          .from('tenants')
          .select('*')
          .eq('id', tenantIdToFetch)
          .single();

        if (tenantError) throw tenantError;
        
        if (tenantData) {
          setTenant(tenantData);
          
          // Fetch plan if tenant has one
          if (tenantData.plan_id) {
            const { data: planData, error: planError } = await supabase
              .from('plans')
              .select('*')
              .eq('id', tenantData.plan_id)
              .single();
            
            if (!planError && planData) {
              setPlan(planData);
            }
          }
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchTenant();
  }, []);

  const hasFeature = (featureName: string): boolean => {
    if (!tenant) return false;
    
    // Direct feature flags on tenant
    if (featureName === 'online_store') {
      return tenant.online_store_enabled === true;
    }
    
    // Check plan features
    if (plan?.features && plan.features[featureName] === true) {
      return true;
    }
    
    return false;
  };

  const getPlanName = (): string => {
    if (!plan) return 'Sin Plan';
    return plan.nombre;
  };

  return {
    tenant,
    plan,
    loading,
    error,
    hasFeature,
    getPlanName,
    isOnlineStoreEnabled: tenant?.online_store_enabled === true,
  };
}
