'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/hooks/use-tenant';

export default function BusinessSettingsPage() {
  const { tenant } = useTenant();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  
  const [businessName, setBusinessName] = useState('');
  const [cuit, setCuit] = useState('');
  const [ivaCondition, setIvaCondition] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');

  useEffect(() => {
    if (tenant) {
      setBusinessName(tenant.nombre || '');
      setCuit(tenant.cuit || '');
      setIvaCondition(tenant.condicion_iva || '');
      setAddress(tenant.address || '');
      setPhone(tenant.phone || '');
      setEmail(tenant.email || '');
      setWebsite(tenant.website || '');
    }
  }, [tenant]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase
        .from('tenants')
        .update({
          nombre: businessName,
          cuit: cuit,
          condicion_iva: ivaCondition,
          address: address,
          phone: phone,
          email: email,
          website: website,
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
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-white">Datos del Negocio</h1>
          <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">
            Razón social, CUIT, condición IVA y datos fiscales
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Business Info */}
        <div className="bg-zinc-900 border border-white/5 rounded-xl p-6 space-y-6">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-violet-400 text-2xl">business</span>
            <h2 className="text-sm font-black text-white uppercase tracking-widest">Información Legal</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-2">Nombre / Razón Social</label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                placeholder="Nombre de tu negocio o razón social"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-2">CUIT</label>
              <input
                type="text"
                value={cuit}
                onChange={(e) => setCuit(e.target.value)}
                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                placeholder="XX-XXXXXXXX-X"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-2">Condición ante IVA</label>
              <select
                value={ivaCondition}
                onChange={(e) => setIvaCondition(e.target.value)}
                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              >
                <option value="">Seleccionar...</option>
                <option value="responsable_inscripto">Responsable Inscripto</option>
                <option value="monotributista">Monotributista</option>
                <option value="consumidor_final">Consumidor Final</option>
                <option value="exento">Exento</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-2">Crédito Máximo</label>
              <input
                type="number"
                defaultValue={tenant?.credit_limit || 0}
                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                placeholder="0"
              />
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-zinc-900 border border-white/5 rounded-xl p-6 space-y-6">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-blue-400 text-2xl">contact_phone</span>
            <h2 className="text-sm font-black text-white uppercase tracking-widest">Datos de Contacto</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-2">Dirección</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                placeholder="Dirección de tu negocio"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-2">Teléfono</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                placeholder="+54 9 11 XXXX-XXXX"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                placeholder=" contacto@tucomercio.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-2">Sitio Web</label>
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                placeholder="www.tucomercio.com"
              />
            </div>
          </div>
        </div>

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
  );
}