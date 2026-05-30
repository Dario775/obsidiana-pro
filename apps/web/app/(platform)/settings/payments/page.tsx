'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface PlatformPaymentConfig {
  id: string;
  transfer_bank: string;
  transfer_cbu: string;
  transfer_alias: string;
  mp_client_id: string;
  mp_client_secret: string;
  mp_link: string;
  mp_enabled: boolean;
  transfer_enabled: boolean;
}

export default function PlatformPaymentSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  
  const [config, setConfig] = useState<PlatformPaymentConfig>({
    id: '',
    transfer_bank: '',
    transfer_cbu: '',
    transfer_alias: '',
    mp_client_id: '',
    mp_client_secret: '',
    mp_link: '',
    mp_enabled: false,
    transfer_enabled: true,
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  async function fetchConfig() {
    console.log('fetchConfig: Iniciando carga de configuración...');
    setLoading(true);
    try {
      console.log('fetchConfig: Llamando a Supabase para platform_config...');
      const { data, error } = await supabase
        .from('platform_config')
        .select('*')
        .eq('key', 'payment_config')
        .maybeSingle();

      console.log('fetchConfig: Respuesta de Supabase recibida:', { data, error });

      if (error) {
        console.error('fetchConfig: Error detectado en la respuesta:', error);
        throw error;
      }

      if (data) {
        console.log('fetchConfig: Configuración encontrada, actualizando estado:', data.value);
        setConfig({
          id: data.id || '',
          transfer_bank: data.value?.transfer_bank || '',
          transfer_cbu: data.value?.transfer_cbu || '',
          transfer_alias: data.value?.transfer_alias || '',
          mp_client_id: data.value?.mp_client_id || '',
          mp_client_secret: data.value?.mp_client_secret || '',
          mp_link: data.value?.mp_link || '',
          mp_enabled: data.value?.mp_enabled || false,
          transfer_enabled: data.value?.transfer_enabled !== false,
        });
      } else {
        console.warn('fetchConfig: No se encontró ningún registro para payment_config');
      }
    } catch (err: any) {
      console.error('fetchConfig: Excepción capturada:', err);
    } finally {
      console.log('fetchConfig: Finalizando carga, setLoading(false)');
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const value = {
        transfer_bank: config.transfer_bank,
        transfer_cbu: config.transfer_cbu,
        transfer_alias: config.transfer_alias,
        mp_client_id: config.mp_client_id,
        mp_client_secret: config.mp_client_secret,
        mp_link: config.mp_link,
        mp_enabled: config.mp_enabled,
        transfer_enabled: config.transfer_enabled,
      };

      // Usar upsert basado en la 'key' para evitar errores de ID undefined
      const { error } = await supabase
        .from('platform_config')
        .upsert(
          { 
            key: 'payment_config', 
            value 
          }, 
          { onConflict: 'key' }
        );

      if (error) throw error;
      
      setSaved(true);
      fetchConfig();
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      console.error('Error saving config:', err);
      alert('Error al guardar: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function generateMpLink(amount: number) {
    if (!config.mp_client_id || !config.mp_client_secret) {
      alert('Primero configurá las credenciales de MercadoPago');
      return;
    }
    
    setSaving(true);
    try {
      const response = await fetch('/api/platform/settings/payments/generate-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          mp_client_secret: config.mp_client_secret,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setConfig({ ...config, mp_link: data.init_point });
        alert('Link generado: ' + data.init_point);
      } else {
        const errData = await response.json().catch(() => ({}));
        alert('Error al generar link: ' + (errData.error || 'Verificá las credenciales.'));
      }
    } catch (err) {
      console.error(err);
      alert('Error al conectar con MercadoPago');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-zinc-500 font-bold uppercase tracking-widest text-xs gap-3">
        <span className="material-symbols-outlined text-4xl animate-spin text-primary">autorenew</span>
        Cargando configuración...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-black uppercase tracking-tighter text-white">Configuración de Pagos</h1>
        <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">
          Configurá los métodos de cobro para las suscripciones de las tiendas
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* Transferencia Bancaria */}
        <div className="bg-zinc-900 border border-white/5 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-2xl text-emerald-400">account_balance</span>
              <div>
                <h2 className="text-sm font-black text-white uppercase">Transferencia Bancaria</h2>
                <p className="text-[10px] text-zinc-500">Datos para que las tiendas transfieran</p>
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.transfer_enabled}
                onChange={(e) => setConfig({ ...config, transfer_enabled: e.target.checked })}
                className="w-5 h-5 rounded border-white/20 bg-zinc-800 text-emerald-500 focus:ring-emerald-500"
              />
              <span className="text-xs text-zinc-400 font-bold uppercase">Habilitado</span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-400 text-xs font-black uppercase tracking-widest mb-2">Banco *</label>
              <input
                type="text"
                required={config.transfer_enabled}
                value={config.transfer_bank}
                onChange={(e) => setConfig({ ...config, transfer_bank: e.target.value })}
                placeholder="Banco Santander, BBVA, etc."
                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
            <div>
              <label className="block text-zinc-400 text-xs font-black uppercase tracking-widest mb-2">CBU / Cuenta *</label>
              <input
                type="text"
                required={config.transfer_enabled}
                value={config.transfer_cbu}
                onChange={(e) => setConfig({ ...config, transfer_cbu: e.target.value })}
                placeholder="1234567890123456789012"
                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-zinc-400 text-xs font-black uppercase tracking-widest mb-2">Alias *</label>
              <input
                type="text"
                required={config.transfer_enabled}
                value={config.transfer_alias}
                onChange={(e) => setConfig({ ...config, transfer_alias: e.target.value })}
                placeholder="OBSIDIANA.PRO"
                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
          </div>
        </div>

        {/* MercadoPago */}
        <div className="bg-zinc-900 border border-white/5 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-2xl text-blue-400">payment</span>
              <div>
                <h2 className="text-sm font-black text-white uppercase">MercadoPago</h2>
                <p className="text-[10px] text-zinc-500">Pagos automáticos con link</p>
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.mp_enabled}
                onChange={(e) => setConfig({ ...config, mp_enabled: e.target.checked })}
                className="w-5 h-5 rounded border-white/20 bg-zinc-800 text-blue-500 focus:ring-blue-500"
              />
              <span className="text-xs text-zinc-400 font-bold uppercase">Habilitado</span>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-400 text-xs font-black uppercase tracking-widest mb-2">Client ID</label>
              <input
                type="text"
                value={config.mp_client_id}
                onChange={(e) => setConfig({ ...config, mp_client_id: e.target.value })}
                placeholder="Tu Client ID de MercadoPago"
                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
            <div>
              <label className="block text-zinc-400 text-xs font-black uppercase tracking-widest mb-2">Client Secret</label>
              <input
                type="password"
                value={config.mp_client_secret}
                onChange={(e) => setConfig({ ...config, mp_client_secret: e.target.value })}
                placeholder="Tu Client Secret"
                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-zinc-400 text-xs font-black uppercase tracking-widest mb-2">Link de Pago Generated</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={config.mp_link}
                  placeholder="El link se genera automáticamente"
                  className="flex-1 w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-3 text-zinc-400"
                />
                <button
                  type="button"
                  onClick={() => generateMpLink(15000)}
                  disabled={!config.mp_enabled || !config.mp_client_id || !config.mp_client_secret || saving}
                  className="px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs uppercase disabled:opacity-50"
                >
                  Generar Link
                </button>
              </div>
              <p className="text-[10px] text-zinc-500 mt-1">
                Click en "Generar Link" para crear un link de pago de prueba con $15.000
              </p>
            </div>
          </div>
        </div>

        {/* Preview de cómo se verá */}
        <div className="bg-zinc-900 border border-white/5 rounded-2xl p-6">
          <h2 className="text-sm font-black text-white uppercase mb-4">Vista Previa - Modal de Pago</h2>
          <div className="bg-zinc-950 border border-white/10 rounded-xl p-4 space-y-3">
            <p className="text-xs text-zinc-400"> così los landlords elegirán al pagar su suscripción:</p>
            
            {config.transfer_enabled && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900 border border-emerald-500/20">
                <span className="material-symbols-outlined text-emerald-400">account_balance</span>
                <span className="text-sm text-white">Transferencia ({config.transfer_bank || 'Banco'})</span>
              </div>
            )}
            
            {config.mp_enabled && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900 border border-blue-500/20">
                <span className="material-symbols-outlined text-blue-400">payment</span>
                <span className="text-sm text-white">MercadoPago</span>
              </div>
            )}
            
            <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900 border border-white/10">
              <span className="material-symbols-outlined text-zinc-400">payments</span>
              <span className="text-sm text-white">Efectivo</span>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-8 py-4 bg-primary hover:bg-primary-hover text-white rounded-xl font-black uppercase tracking-wider flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <span className="material-symbols-outlined animate-spin">autorenew</span>
            ) : saved ? (
              <span className="material-symbols-outlined">check</span>
            ) : (
              <span className="material-symbols-outlined">save</span>
            )}
            {saving ? 'Guardando...' : saved ? 'Guardado!' : 'Guardar Configuración'}
          </button>
        </div>
      </form>
    </div>
  );
}