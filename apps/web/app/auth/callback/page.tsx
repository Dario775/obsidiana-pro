'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function MLAuthCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState('Procesando...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    handleCallback();
  }, []);

  async function handleCallback() {
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    const tenantId = searchParams.get('state');

    if (errorParam) {
      setError(errorDescription || 'Permiso denegado por el usuario');
      setStatus('Error');
      return;
    }

    if (!code) {
      setError('No se recibió código de autorización');
      setStatus('Error');
      return;
    }

    if (!tenantId) {
      setError('Falta ID de tienda en el state');
      setStatus('Error');
      return;
    }

    try {
      setStatus('Obteniendo configuración...');

      const { data: configData } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('key', 'ml_app_config')
        .single();

      const config = configData?.value;
      if (!config?.app_client_id || !config?.app_client_secret || !config?.app_redirect_uri) {
        throw new Error('Configuración de ML no disponible. Contacta al administrador.');
      }

      setStatus('Intercambiando código por token...');

      const response = await fetch('https://api.mercadolibre.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: config.app_client_id,
          client_secret: config.app_client_secret,
          code: code,
          redirect_uri: config.app_redirect_uri,
        }),
      });

      if (!response.ok) {
        throw new Error('Error al intercambiar código');
      }

      const data = await response.json();

      setStatus('Guardando tokens en tu tienda...');

      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('id, nombre')
        .eq('id', tenantId)
        .single();

      if (tenantError || !tenantData) {
        throw new Error('Tienda no encontrada. Ingresá desde tu panel de tienda.');
      }

      await supabase
        .from('tenants')
        .update({
          ml_access_token: data.access_token,
          ml_refresh_token: data.refresh_token,
          ml_token_expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
        })
        .eq('id', tenantData.id);

      setStatus('¡Conectado!');
      
      setTimeout(() => router.push('/settings/ml-affiliate'), 2000);

    } catch (err: any) {
      console.error('Callback error:', err);
      setError(err.message || 'Error desconocido');
      setStatus('Error');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="text-center max-w-md mx-6">
        {status === '¡Conectado!' ? (
          <span className="material-symbols-outlined text-6xl text-emerald-400">check_circle</span>
        ) : error ? (
          <span className="material-symbols-outlined text-6xl text-red-400">error</span>
        ) : (
          <span className="material-symbols-outlined text-6xl text-yellow-400 animate-spin">sync</span>
        )}
        
        <h1 className="text-2xl font-black text-white mt-4">Mercado Libre</h1>
        <p className={`text-lg mt-2 ${error ? 'text-red-400' : 'text-zinc-400'}`}>{status}</p>
        
        {error && (
          <p className="text-sm text-red-500 mt-2">{error}</p>
        )}

        {status === '¡Conectado!' && (
          <p className="text-sm text-zinc-500 mt-4">Redireccionando...</p>
        )}
      </div>
    </div>
  );
}

export default function MLAuthCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <span className="material-symbols-outlined text-6xl text-yellow-400 animate-spin">sync</span>
      </div>
    }>
      <MLAuthCallbackContent />
    </Suspense>
  );
}