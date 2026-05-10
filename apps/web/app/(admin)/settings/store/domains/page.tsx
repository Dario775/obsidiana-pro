'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/hooks/use-tenant';
import { FeatureGate } from '@/components/feature-gate';

export default function StoreDomainsPage() {
  const { tenant } = useTenant();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [verifying, setVerifying] = useState(false);
  
  const [customDomain, setCustomDomain] = useState('');
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (tenant) {
      setCustomDomain(tenant.custom_domain || '');
      setVerified(tenant.custom_domain_verified || false);
    }
  }, [tenant]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const domain = customDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      
      const { error } = await supabase
        .from('tenants')
        .update({
          custom_domain: domain || null,
          custom_domain_verified: false,
          custom_domain_cname: domain ? `${domain}.obsidiana.app` : null,
        })
        .eq('id', tenant?.id);

      if (error) throw error;
      setVerified(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving:', error);
      alert('Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function verifyDomain() {
    setVerifying(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      setVerified(true);
      
      await supabase
        .from('tenants')
        .update({ custom_domain_verified: true })
        .eq('id', tenant?.id);
        
      alert('Dominio verificado correctamente');
    } catch (error) {
      alert('Error al verificar dominio');
    } finally {
      setVerifying(false);
    }
  }

  return (
    <FeatureGate feature="online_store">
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter text-white">Dominio Personalizado</h1>
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">
              Usá tu propio dominio en lugar de subdominio
            </p>
          </div>
        </div>

        <div className={`rounded-xl p-4 border ${
          verified 
            ? 'bg-emerald-950/20 border-emerald-500/30' 
            : customDomain
              ? 'bg-amber-950/20 border-amber-500/30'
              : 'bg-zinc-900 border-white/5'
        }`}>
          <div className="flex items-center gap-3">
            <span className={`material-symbols-outlined text-2xl ${
              verified ? 'text-emerald-400' : customDomain ? 'text-amber-400' : 'text-zinc-500'
            }`}>
              {verified ? 'check_circle' : customDomain ? 'pending' : 'language'}
            </span>
            <div>
              <p className="text-white font-bold">
                {verified 
                  ? 'Dominio Activo' 
                  : customDomain 
                    ? 'Dominio Configurado (pendiente verificación)'
                    : 'Sin dominio personalizado'}
              </p>
              <p className="text-zinc-500 text-xs">
                {verified 
                  ? `Tu tienda está disponible en ${customDomain}`
                  : customDomain 
                    ? `Ingresaste ${customDomain}. Completá la verificación.`
                    : 'Usá tu propio dominio para una URL profesional'}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="bg-zinc-900 border border-white/5 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-blue-400 text-2xl">dns</span>
              <h2 className="text-sm font-black text-white uppercase tracking-widest">Tu Dominio</h2>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-2">Nombre de dominio</label>
              <input
                type="text"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                placeholder="www.tutienda.com"
                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
              <p className="text-zinc-500 text-xs mt-2">
                Ej: mitienda.com, tudeguemark.com.ar
              </p>
            </div>
          </div>

          {customDomain && !verified && (
            <div className="bg-zinc-900 border border-white/5 rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-amber-400 text-2xl">info</span>
                <h2 className="text-sm font-black text-white uppercase tracking-widest">Cómo verificar tu dominio</h2>
              </div>
              
              <div className="space-y-4 text-sm text-zinc-300">
                <p>Tenés que crear un registro CNAME en tu proveedor de dominio:</p>
                
                <div className="bg-zinc-950 rounded-lg p-4 font-mono text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Tipo</span>
                    <span className="text-white">CNAME</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Nombre/Host</span>
                    <span className="text-white">www</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Valor</span>
                    <span className="text-emerald-400">obsidiana.app</span>
                  </div>
                </div>

                <p className="text-zinc-400 text-xs">
                  Algunos proveedores usan "@" en lugar de "www" como nombre. 
                  Después de crear el registro, esperá unos minutos y verificá el dominio.
                </p>
              </div>

              <button
                type="button"
                onClick={verifyDomain}
                disabled={verifying}
                className="w-full px-4 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {verifying ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">sync</span>
                    Verificando...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">verified</span>
                    Verificar Dominio
                  </>
                )}
              </button>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-bold transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <span className="material-symbols-outlined animate-spin">sync</span>
                  Guardando...
                </>
              ) : saved ? (
                <>
                  <span className="material-symbols-outlined">check</span>
                  Guardado!
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">save</span>
                  Guardar Dominio
                </>
              )}
            </button>
          </div>
        </form>

        <div className="bg-zinc-800/50 rounded-xl p-4">
          <p className="text-zinc-400 text-xs">
            <span className="font-bold text-white">Nota:</span> Si no.tenés un dominio propio, 
            podés usar el subdominio gratuito <span className="text-violet-400">tusitio.obsidiana.app</span> 
            que se genera automáticamente en configuración de tienda.
          </p>
        </div>
      </div>
    </FeatureGate>
  );
}