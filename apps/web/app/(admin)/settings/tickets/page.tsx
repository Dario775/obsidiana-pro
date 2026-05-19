'use client';

import React, { useState, useEffect } from 'react';
import { useTenant } from '@/hooks/use-tenant';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface TicketConfig {
  format: '58mm' | '80mm';
  show_logo: boolean;
  address: string;
  phone: string;
  email: string;
  footer_msg: string;
  show_fiscal: boolean;
  // Printer configs
  ticket_method: 'system' | 'usb' | 'network';
  report_method: 'system' | 'same_as_ticket';
  network_ip: string;
  network_port: string;
  usb_vendor_id: string;
  usb_product_id: string;
  usb_device_name: string;
}

const DEFAULT_CONFIG: TicketConfig = {
  format: '80mm',
  show_logo: true,
  address: '',
  phone: '',
  email: '',
  footer_msg: '¡Gracias por elegirnos!',
  show_fiscal: true,
  ticket_method: 'system',
  report_method: 'system',
  network_ip: '192.168.1.100',
  network_port: '9100',
  usb_vendor_id: '',
  usb_product_id: '',
  usb_device_name: '',
};

export default function TicketSettingsPage() {
  const { tenant } = useTenant();
  const [config, setConfig] = useState<TicketConfig>(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [usbStatus, setUsbStatus] = useState<string>('');

  useEffect(() => {
    if (tenant) {
      const dbConfig = tenant.settings?.ticket_config || {};
      setConfig({
        format: dbConfig.format || '80mm',
        show_logo: dbConfig.show_logo !== false,
        address: dbConfig.address || tenant.address || '',
        phone: dbConfig.phone || tenant.phone || '',
        email: dbConfig.email || tenant.email || '',
        footer_msg: dbConfig.footer_msg || '¡Gracias por elegirnos!',
        show_fiscal: dbConfig.show_fiscal !== false,
        ticket_method: dbConfig.ticket_method || 'system',
        report_method: dbConfig.report_method || 'system',
        network_ip: dbConfig.network_ip || '192.168.1.100',
        network_port: dbConfig.network_port || '9100',
        usb_vendor_id: dbConfig.usb_vendor_id || '',
        usb_product_id: dbConfig.usb_product_id || '',
        usb_device_name: dbConfig.usb_device_name || '',
      });
    }
  }, [tenant]);

  // Request WebUSB device pairing from user browser
  const handleRequestUsbDevice = async () => {
    setUsbStatus('Buscando dispositivos...');
    try {
      const navAny = navigator as any;
      if (!navAny.usb) {
        setUsbStatus('WebUSB no es soportado por este navegador.');
        return;
      }

      // Prompt standard thermal printer class or generic usb pairing
      const device = await navAny.usb.requestDevice({ filters: [] });
      if (device) {
        const vendorIdHex = '0x' + device.vendorId.toString(16).padStart(4, '0').toUpperCase();
        const productIdHex = '0x' + device.productId.toString(16).padStart(4, '0').toUpperCase();
        const name = device.productName || `Dispositivo USB (${vendorIdHex}:${productIdHex})`;

        setConfig(prev => ({
          ...prev,
          usb_vendor_id: vendorIdHex,
          usb_product_id: productIdHex,
          usb_device_name: name
        }));
        setUsbStatus(`Vinculado con éxito: ${name}`);
      }
    } catch (err: any) {
      console.error(err);
      if (err.name === 'NotFoundError') {
        setUsbStatus('No se seleccionó ningún dispositivo.');
      } else {
        setUsbStatus(`Error de conexión: ${err.message}`);
      }
    }
  };

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!tenant?.id) return;

    setSaving(true);
    try {
      const currentSettings = tenant.settings || {};
      const updatedSettings = {
        ...currentSettings,
        ticket_config: config,
      };

      const { error } = await supabase
        .from('tenants')
        .update({
          settings: updatedSettings,
        })
        .eq('id', tenant.id);

      if (error) throw error;
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Error saving ticket settings:', err);
      alert('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-[1440px] mx-auto flex flex-col gap-8 pb-32">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-zinc-500 font-label-md text-[10px] uppercase tracking-widest mb-2 font-black">
            <span className="material-symbols-outlined text-[14px]">settings</span>
            Ajustes
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary font-black">Tickets e Impresoras</span>
          </div>
          <h1 className="font-headline-xl text-3xl font-black text-white mb-1">Configuración de Tickets e Impresoras</h1>
          <p className="text-zinc-400 font-body-sm text-sm max-w-2xl">
            Gestioná el formato de impresión, impresoras USB o de red local para tus tickets y reportes fiscales o de cierre.
          </p>
        </div>
        <div className="shrink-0">
          <Link
            href="/settings"
            className="px-4 py-2 rounded-xl bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 transition-all font-label-md text-xs uppercase font-bold tracking-wider flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Volver a Ajustes
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Settings Form */}
        <form onSubmit={handleSave} className="lg:col-span-7 flex flex-col gap-6">
          
          {/* 1. SECCION: AJUSTES DE IMPRESORAS */}
          <div className="bg-zinc-900 border border-white/5 rounded-2xl p-6 flex flex-col gap-6">
            <div className="flex items-center gap-3 border-b border-white/5 pb-4">
              <span className="material-symbols-outlined text-violet-400 text-xl">print</span>
              <h2 className="text-sm font-black text-white uppercase tracking-widest">Métodos de Impresión</h2>
            </div>

            {/* Impresora de Tickets */}
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-2">Impresora para Tickets Térmicos</label>
                <select
                  value={config.ticket_method}
                  onChange={(e) => setConfig({ ...config, ticket_method: e.target.value as any })}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                >
                  <option value="system">Diálogo del Sistema (Driver del Sistema Operativo)</option>
                  <option value="usb">Conexión Directa USB (WebUSB / ESC-POS Directo)</option>
                  <option value="network">Impresora de Red Local (TCP/IP / Ethernet en Puerto 9100)</option>
                </select>
                <p className="text-[10px] text-zinc-500 mt-1.5">
                  Elegí cómo enviar los tickets. La conexión directa USB/Red envía comandos ESC/POS sin abrir ventanas del navegador.
                </p>
              </div>

              {/* Impresora de Reportes */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-2">Impresora para Reportes (Cierres de Caja, Auditorías, A4)</label>
                <select
                  value={config.report_method}
                  onChange={(e) => setConfig({ ...config, report_method: e.target.value as any })}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                >
                  <option value="system">Diálogo del Sistema (Recomendado para hojas A4 / Carta)</option>
                  <option value="same_as_ticket">Misma impresora que los tickets</option>
                </select>
                <p className="text-[10px] text-zinc-500 mt-1.5">
                  Los reportes detallados y cierres X/Z se formatean para impresión estándar o A4 usando este canal.
                </p>
              </div>
            </div>

            {/* CONDITIONAL SUBSECTION: USB Direct connection settings */}
            {config.ticket_method === 'usb' && (
              <div className="bg-zinc-950 border border-white/5 rounded-xl p-4 flex flex-col gap-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Impresora USB Vinculada</span>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-violet-500/10 text-violet-400 border border-violet-500/20">USB RAW</span>
                </div>
                
                {config.usb_device_name ? (
                  <div className="p-3 bg-zinc-900 border border-white/5 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm text-white">{config.usb_device_name}</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">VENDOR: {config.usb_vendor_id} | PRODUCT: {config.usb_product_id}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setConfig(prev => ({ ...prev, usb_vendor_id: '', usb_product_id: '', usb_device_name: '' }))}
                      className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors material-symbols-outlined"
                      title="Quitar impresora"
                    >
                      delete
                    </button>
                  </div>
                ) : (
                  <div className="text-center p-6 bg-zinc-900/50 rounded-xl border border-dashed border-white/10 flex flex-col items-center gap-3">
                    <span className="material-symbols-outlined text-3xl text-zinc-600">usb</span>
                    <p className="text-xs text-zinc-400 font-bold">No hay ninguna impresora USB emparejada</p>
                    <button
                      type="button"
                      onClick={handleRequestUsbDevice}
                      className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                    >
                      Vincular Impresora USB
                    </button>
                  </div>
                )}
                {usbStatus && <p className="text-[10px] font-bold text-zinc-500 mt-1">{usbStatus}</p>}
              </div>
            )}

            {/* CONDITIONAL SUBSECTION: Network settings */}
            {config.ticket_method === 'network' && (
              <div className="bg-zinc-950 border border-white/5 rounded-xl p-4 flex flex-col gap-4 animate-fade-in">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Configuración de Red Local (IP)</span>
                
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-[9px] font-bold text-zinc-400 mb-1.5 uppercase">Dirección IP del Dispositivo</label>
                    <input
                      type="text"
                      value={config.network_ip}
                      onChange={(e) => setConfig({ ...config, network_ip: e.target.value })}
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                      placeholder="Ej: 192.168.1.100"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-zinc-400 mb-1.5 uppercase">Puerto TCP</label>
                    <input
                      type="text"
                      value={config.network_port}
                      onChange={(e) => setConfig({ ...config, network_port: e.target.value })}
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                      placeholder="9100"
                    />
                  </div>
                </div>
                <p className="text-[9px] text-zinc-500">
                  La impresora térmica debe estar conectada al router o red local y tener configurada una IP estática en el mismo segmento.
                </p>
              </div>
            )}
          </div>

          {/* 2. SECCION: DISEÑO Y DATOS */}
          <div className="bg-zinc-900 border border-white/5 rounded-2xl p-6 flex flex-col gap-6">
            <div className="flex items-center gap-3 border-b border-white/5 pb-4">
              <span className="material-symbols-outlined text-violet-400 text-xl">receipt_long</span>
              <h2 className="text-sm font-black text-white uppercase tracking-widest">Ajustes de Diseño del Ticket</h2>
            </div>

            {/* Impresora formato */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-2">Formato de Papel</label>
                <select
                  value={config.format}
                  onChange={(e) => setConfig({ ...config, format: e.target.value as any })}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                >
                  <option value="80mm">80mm (Estándar Térmico)</option>
                  <option value="58mm">58mm (Térmico Chico)</option>
                </select>
                <p className="text-[10px] text-zinc-500 mt-1.5">
                  Ancho de corte para acomodar el ticket en rollos estándar.
                </p>
              </div>

              <div className="flex flex-col justify-end gap-3 pb-1">
                <label className="flex items-center gap-3 cursor-pointer text-sm text-zinc-300">
                  <input
                    type="checkbox"
                    checked={config.show_logo}
                    onChange={(e) => setConfig({ ...config, show_logo: e.target.checked })}
                    className="w-4 h-4 rounded border-white/10 bg-zinc-950 text-violet-600 focus:ring-0 focus:ring-offset-0"
                  />
                  <span>Mostrar Logo del Negocio</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer text-sm text-zinc-300">
                  <input
                    type="checkbox"
                    checked={config.show_fiscal}
                    onChange={(e) => setConfig({ ...config, show_fiscal: e.target.checked })}
                    className="w-4 h-4 rounded border-white/10 bg-zinc-950 text-violet-600 focus:ring-0 focus:ring-offset-0"
                  />
                  <span>Incluir datos fiscales (CUIT, IVA)</span>
                </label>
              </div>
            </div>

            {/* Datos de Encabezado */}
            <div className="flex flex-col gap-4 border-t border-white/5 pt-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">Información del Negocio</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 mb-1.5 uppercase">Dirección Física</label>
                  <input
                    type="text"
                    value={config.address}
                    onChange={(e) => setConfig({ ...config, address: e.target.value })}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                    placeholder="Calle 123, Ciudad"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 mb-1.5 uppercase">Teléfono de contacto</label>
                  <input
                    type="text"
                    value={config.phone}
                    onChange={(e) => setConfig({ ...config, phone: e.target.value })}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                    placeholder="+54 11 1234-5678"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-zinc-400 mb-1.5 uppercase">Email de contacto</label>
                  <input
                    type="email"
                    value={config.email}
                    onChange={(e) => setConfig({ ...config, email: e.target.value })}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                    placeholder="contacto@tunegocio.com"
                  />
                </div>
              </div>
            </div>

            {/* Mensaje de pie de página */}
            <div className="flex flex-col gap-4 border-t border-white/5 pt-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-2">Mensaje del Pie de Página</label>
                <textarea
                  value={config.footer_msg}
                  onChange={(e) => setConfig({ ...config, footer_msg: e.target.value })}
                  rows={2}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none"
                  placeholder="¡Gracias por su compra! Vuelva pronto..."
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-4 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(124,58,237,0.2)] font-black uppercase tracking-wider"
          >
            {saving ? (
              <>
                <span className="material-symbols-outlined animate-spin">sync</span>
                Guardando configuración...
              </>
            ) : saved ? (
              <>
                <span className="material-symbols-outlined">check</span>
                ¡Ajustes Guardados con Éxito!
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">save</span>
                Guardar Ajustes e Impresoras
              </>
            )}
          </button>
        </form>

        {/* Live Ticket Preview */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <span className="text-xs font-black uppercase tracking-widest text-zinc-500 text-center lg:text-left">
            Vista Previa de Impresión ({config.format})
          </span>

          <div className="flex justify-center bg-zinc-950/40 border border-white/5 rounded-3xl p-8 relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-violet-500/5 rounded-full blur-[80px] pointer-events-none"></div>

            {/* Thermal Ticket */}
            <div
              className="bg-white text-black shadow-2xl transition-all duration-300 font-mono text-[10px] leading-relaxed p-6 flex flex-col gap-4 border border-zinc-200"
              style={{
                width: config.format === '80mm' ? '300px' : '230px',
              }}
            >
              {/* Encabezado */}
              <div className="text-center flex flex-col gap-1">
                {config.show_logo && (
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <img src="/logo.svg" alt="Logo" className="w-4 h-4 object-contain" />
                    <span className="text-sm font-black tracking-tighter uppercase">{tenant?.nombre || 'MI NEGOCIO'}</span>
                  </div>
                )}
                {!config.show_logo && (
                  <span className="text-sm font-black tracking-tighter uppercase">{tenant?.nombre || 'MI NEGOCIO'}</span>
                )}
                
                {config.address && <p>{config.address}</p>}
                {config.phone && <p>TEL: {config.phone}</p>}
                {config.email && <p>{config.email}</p>}
                
                {config.show_fiscal && tenant?.cuit && (
                  <div className="text-[9px] text-zinc-600 border-t border-b border-zinc-200 border-dashed py-1.5 my-1">
                    <p>CUIT: {tenant.cuit}</p>
                    <p className="uppercase">IVA: {tenant.condicion_iva?.replace('_', ' ') || 'RESP. INSCRIPTO'}</p>
                  </div>
                )}
              </div>

              {/* Info de Transacción */}
              <div className="flex flex-col gap-0.5 border-b border-zinc-200 border-dashed pb-2 text-[9px] text-zinc-600">
                <div className="flex justify-between">
                  <span>TICKET NRO:</span>
                  <span>0001-00000042</span>
                </div>
                <div className="flex justify-between">
                  <span>FECHA:</span>
                  <span>{new Date().toLocaleString()}</span>
                </div>
              </div>

              {/* Items */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between font-black border-b border-zinc-200 pb-1">
                  <span>CANT/DESCRIPCIÓN</span>
                  <span>TOTAL</span>
                </div>

                <div className="flex flex-col">
                  <div className="flex justify-between">
                    <span>1.00 x PRODUCTO DE PRUEBA A</span>
                    <span>$ 1.500,00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>2.00 x PRODUCTO DE PRUEBA B</span>
                    <span>$ 3.000,00</span>
                  </div>
                </div>
              </div>

              {/* Totales */}
              <div className="border-t-2 border-black pt-2 flex flex-col gap-1">
                <div className="flex justify-between">
                  <span>SUBTOTAL</span>
                  <span>$ 4.500,00</span>
                </div>
                {config.show_fiscal && (
                  <div className="flex justify-between text-[9px] text-zinc-600">
                    <span>IVA (21%)</span>
                    <span>$ 945,00</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-xs border-t border-black pt-1.5 mt-1">
                  <span>TOTAL</span>
                  <span>$ 4.500,00</span>
                </div>
              </div>

              {/* Pie de Página */}
              <div className="text-center flex flex-col items-center gap-2 border-t border-zinc-200 border-dashed pt-3 mt-1">
                {config.footer_msg && (
                  <p className="text-[9px] whitespace-pre-line text-zinc-700">{config.footer_msg}</p>
                )}
                <p className="text-[8px] text-zinc-500 uppercase tracking-wider">Desarrollado por Obsidiana</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
