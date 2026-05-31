'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/hooks/use-tenant';
import { FeatureGate } from '@/components/feature-gate';

interface PaymentMethod {
  id: string;
  name: string;
  enabled: boolean;
  icon: string;
  description?: string;
  config?: Record<string, string>;
}

const METHOD_DESCRIPTIONS: {[key: string]: string} = {
  cash: 'Pago en efectivo al retirar o recibir el pedido',
  transfer: 'Datos bancarios para transferir',
  mp: 'Pago con MercadoPago (link de pago)',
  card: 'Tarjeta física en el local',
  cobroexpress: 'Pago por CobroExpress',
  cod: 'Pagas cuando recibís el producto',
};

const AVAILABLE_METHODS: PaymentMethod[] = [
  { id: 'cash', name: 'Efectivo', enabled: true, icon: 'payments' },
  { id: 'transfer', name: 'Transferencia', enabled: true, icon: 'account_balance' },
  { id: 'mp', name: 'MercadoPago', enabled: false, icon: 'payment' },
  { id: 'card', name: 'Débito/Crédito', enabled: false, icon: 'credit_card' },
  { id: 'cobroexpress', name: 'CobroExpress', enabled: false, icon: 'point_of_sale' },
  { id: 'cod', name: 'Contra reembolso', enabled: false, icon: 'money' },
];

const DEFAULT_METHODS: PaymentMethod[] = [
  { id: 'cash', name: 'Efectivo', enabled: true, icon: 'payments' },
  { id: 'transfer', name: 'Transferencia', enabled: true, icon: 'account_balance' },
  { id: 'mp', name: 'MercadoPago', enabled: false, icon: 'payment' },
];

export default function StorePaymentsPage() {
  const { tenant } = useTenant();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [transferConfig, setTransferConfig] = useState({
    bank: '',
    account: '',
    cbu: '',
    alias: '',
    holder: '',
  });
  const [mpConfig, setMpConfig] = useState({
    link: '',
    clientId: '',
    clientSecret: '',
    publicKey: '',
    webhookUrl: '',
  });

  useEffect(() => {
    if (tenant?.store_payment_methods && Array.isArray(tenant.store_payment_methods)) {
      setMethods(tenant.store_payment_methods as unknown as PaymentMethod[]);
    } else {
      setMethods(DEFAULT_METHODS);
    }
  }, [tenant]);

  useEffect(() => {
    const mpMethod = methods.find(m => m.id === 'mp');
    if (mpMethod?.config || tenant?.store_mp_access_token) {
      setMpConfig({
        link: mpMethod?.config?.link || '',
        clientId: mpMethod?.config?.clientId || '',
        clientSecret: mpMethod?.config?.clientSecret || tenant?.store_mp_access_token || '',
        publicKey: mpMethod?.config?.publicKey || tenant?.store_mp_public_key || '',
        webhookUrl: mpMethod?.config?.webhookUrl || '',
      });
    }
  }, [methods, tenant]);

  function toggleMethod(methodId: string) {
    setMethods(prev => prev.map(m => 
      m.id === methodId ? { ...m, enabled: !m.enabled } : m
    ));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const updatedMethods = methods.map(m => {
        if (m.id === 'transfer') {
          return { ...m, config: transferConfig };
        }
        if (m.id === 'mp') {
          return { ...m, config: mpConfig };
        }
        return m;
      });

      const { error } = await supabase
        .from('tenants')
        .update({
          store_payment_methods: updatedMethods,
          store_mp_access_token: mpConfig.clientSecret || null,
          store_mp_public_key: mpConfig.publicKey || null,
        })
        .eq('id', tenant?.id);

      if (error) throw error;
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving:', error);
      alert('Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <FeatureGate feature="online_store">
      <div className="space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter text-white">Métodos de Pago</h1>
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">
              Configurá cómo cobrás en tu tienda online
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Payment Methods */}
          <div className="bg-zinc-900 border border-white/5 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-emerald-400 text-2xl">payments</span>
              <h2 className="text-sm font-black text-white uppercase tracking-widest">Métodos Disponibles</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {AVAILABLE_METHODS.map((method) => {
                const isEnabled = methods.some(m => m.id === method.id && m.enabled);
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => toggleMethod(method.id)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      isEnabled
                        ? 'border-emerald-500/50 bg-emerald-500/10'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className={`material-symbols-outlined text-2xl ${
                        isEnabled ? 'text-emerald-400' : 'text-zinc-500'
                      }`}>
                        {method.icon}
                      </span>
                      <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        isEnabled
                          ? 'bg-emerald-500 border-emerald-500'
                          : 'border-zinc-600'
                      }`}>
                        {isEnabled && (
                          <span className="material-symbols-outlined text-white text-[14px]">check</span>
                        )}
                      </span>
                    </div>
                    <p className="text-white font-bold">{method.name}</p>
                    <p className="text-zinc-500 text-xs mt-1">{METHOD_DESCRIPTIONS[method.id]}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Transfer Config */}
          {methods.some(m => m.id === 'transfer' && m.enabled) && (
            <div className="bg-zinc-900 border border-white/5 rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-blue-400 text-2xl">account_balance</span>
                <h2 className="text-sm font-black text-white uppercase tracking-widest">Datos de Transferencia</h2>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-2">Banco</label>
                  <input
                    type="text"
                    value={transferConfig.bank}
                    onChange={(e) => setTransferConfig({ ...transferConfig, bank: e.target.value })}
                    placeholder="Banco Patagonia"
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-2">Titular de la Cuenta</label>
                  <input
                    type="text"
                    value={transferConfig.holder}
                    onChange={(e) => setTransferConfig({ ...transferConfig, holder: e.target.value })}
                    placeholder="Juan Pérez"
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-2">Número de Cuenta</label>
                  <input
                    type="text"
                    value={transferConfig.account}
                    onChange={(e) => setTransferConfig({ ...transferConfig, account: e.target.value })}
                    placeholder="1234567890"
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-2">CBU</label>
                  <input
                    type="text"
                    value={transferConfig.cbu}
                    onChange={(e) => setTransferConfig({ ...transferConfig, cbu: e.target.value })}
                    placeholder="1234567890123456789012"
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-zinc-400 mb-2">Alias</label>
                  <input
                    type="text"
                    value={transferConfig.alias}
                    onChange={(e) => setTransferConfig({ ...transferConfig, alias: e.target.value })}
                    placeholder="JUAN.PEREZ"
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
              </div>
            </div>
          )}

          {/* MercadoPago Config */}
          {methods.some(m => m.id === 'mp' && m.enabled) && (
            <div className="bg-zinc-900 border border-white/5 rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-violet-400 text-2xl">payment</span>
                <h2 className="text-sm font-black text-white uppercase tracking-widest">MercadoPago</h2>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-zinc-400 mb-2">Link de Pago (Simple)</label>
                  <input
                    type="text"
                    value={mpConfig.link}
                    onChange={(e) => setMpConfig({ ...mpConfig, link: e.target.value })}
                    placeholder="https://mpago.la/xxxxxx"
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  />
                </div>
                <div className="sm:col-span-2 p-4 bg-violet-950/20 rounded-lg border border-violet-500/20">
                  <p className="text-violet-300 text-xs mb-3">Configuración avanzada (API REST) - Opcional</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-2">Client ID</label>
                      <input
                        type="text"
                        value={mpConfig.clientId}
                        onChange={(e) => setMpConfig({ ...mpConfig, clientId: e.target.value })}
                        placeholder="1234567890123456"
                        className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-2">Access Token</label>
                      <input
                        type="password"
                        value={mpConfig.clientSecret}
                        onChange={(e) => setMpConfig({ ...mpConfig, clientSecret: e.target.value })}
                        placeholder="APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                        className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-2">Public Key</label>
                      <input
                        type="text"
                        value={mpConfig.publicKey}
                        onChange={(e) => setMpConfig({ ...mpConfig, publicKey: e.target.value })}
                        placeholder="APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx-xxxx"
                        className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-2">Webhook URL</label>
                      <input
                        type="text"
                        value={mpConfig.webhookUrl}
                        onChange={(e) => setMpConfig({ ...mpConfig, webhookUrl: e.target.value })}
                        placeholder="https://tu-tienda.obsidiana.app/api/webhooks/mp"
                        className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                      />
                    </div>
                  </div>
                  <p className="text-zinc-500 text-xs mt-3">
                    Obtené tus credenciales en <a href="https://www.mercadopago.com.ar/developers/panel" target="_blank" className="text-violet-400 hover:underline">MercadoPago Developers</a>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
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
                  Guardar Cambios
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </FeatureGate>
  );
}