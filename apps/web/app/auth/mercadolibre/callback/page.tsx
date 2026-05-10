'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

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
    const tenantId = searchParams.get('state');

    if (!code || !tenantId) {
      setError('Información de sesión inválida');
      setStatus('Error');
      return;
    }

    try {
      setStatus('Sincronizando cuenta...');

      const response = await fetch('/api/ml/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, tenant_id: tenantId, code_verifier: localStorage.getItem('ml_code_verifier') || '' }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Error de conexión');

      setStatus('¡Conexión Exitosa!');
      
      // Redirigir usando window.location.href para forzar recarga total de caché
      setTimeout(() => {
        window.location.href = '/settings/ml-affiliate';
      }, 1500);

    } catch (err: any) {
      setError(err.message || 'Error desconocido');
      setStatus('Error');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="text-center">
        <div className={`w-20 h-20 rounded-3xl mx-auto flex items-center justify-center mb-6 ${
          error ? 'bg-red-500/10 text-red-500' : status === '¡Conexión Exitosa!' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500 animate-pulse'
        }`}>
          <span className="material-symbols-outlined text-4xl">
            {error ? 'error' : status === '¡Conexión Exitosa!' ? 'check_circle' : 'sync'}
          </span>
        </div>
        <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Mercado Libre</h1>
        <p className={`mt-2 font-bold ${error ? 'text-red-400' : 'text-zinc-500'}`}>{error || status}</p>
        
        {error && (
          <button
            onClick={() => router.push('/settings/ml-affiliate')}
            className="mt-8 px-8 py-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold text-sm transition-all"
          >
            Reintentar
          </button>
        )}
      </div>
    </div>
  );
}

export default function MLAuthCallback() {
  return (
    <Suspense fallback={null}>
      <MLAuthCallbackContent />
    </Suspense>
  );
}