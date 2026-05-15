'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

/**
 * OAuth Callback for Mercado Libre.
 * 
 * The authorization code is exchanged for tokens SERVER-SIDE via /api/ml/auth.
 * The client_secret NEVER reaches the browser.
 */
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
      setStatus('Intercambiando código por token...');

      // Exchange code for tokens SERVER-SIDE — client_secret stays on the server
      const response = await fetch('/api/ml/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code,
          tenant_id: tenantId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al intercambiar código');
      }

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

        {error && (
          <button
            onClick={() => router.push('/settings/ml-affiliate')}
            className="mt-6 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold text-sm"
          >
            Volver a Configuración
          </button>
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