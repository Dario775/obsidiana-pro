'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTenant } from '@/hooks/use-tenant';
import { supabase } from '@/lib/supabase';

export default function FiscalTicketPage() {
  const params = useParams();
  const router = useRouter();
  const { tenant } = useTenant();
  const id = params.id as string;

  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tenant?.id && id) {
      const fetchOrderDetails = async () => {
        setLoading(true);
        try {
          // Fetch order
          const { data: orderData, error: orderError } = await supabase
            .from('orders')
            .select(`
              *,
              customers (
                nombre,
                dni_cuit,
                phone,
                email
              )
            `)
            .eq('id', id)
            .eq('tenant_id', tenant.id)
            .single();

          if (orderError) throw orderError;
          setOrder(orderData);

          // Fetch order items
          const { data: itemsData, error: itemsError } = await supabase
            .from('order_items')
            .select('*')
            .eq('order_id', id)
            .eq('tenant_id', tenant.id);

          if (itemsError) throw itemsError;
          setItems(itemsData || []);
        } catch (err) {
          console.error('Error fetching order for ticket:', err);
        } finally {
          setLoading(false);
        }
      };
      fetchOrderDetails();
    }
  }, [tenant?.id, id]);

  const ticketConfig = tenant?.settings?.ticket_config || {
    format: '80mm',
    show_logo: true,
    address: tenant?.address || '',
    phone: tenant?.phone || '',
    email: tenant?.email || '',
    footer_msg: '¡Gracias por elegirnos!',
    show_fiscal: true,
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-400 gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-violet-500 border-t-transparent animate-spin"></div>
        <p className="font-black text-xs uppercase tracking-[0.2em] animate-pulse">Cargando comprobante...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-400 gap-4">
        <span className="material-symbols-outlined text-4xl text-red-500">error</span>
        <p className="font-black text-xs uppercase tracking-[0.2em]">Comprobante no encontrado</p>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-zinc-900 border border-white/10 text-white rounded-xl text-xs uppercase tracking-wider font-bold"
        >
          Volver
        </button>
      </div>
    );
  }

  const subtotal = Number(order.subtotal_ars || 0);
  const tax = Number(order.tax_ars || 0);
  const total = Number(order.total_ars || order.total || 0);
  const discount = 0; // Calculated if discount was registered

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col pt-24 pb-32 print-container">
      {/* Dynamic CSS styles injecting printer media rules based on config */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body, html {
            background: white !important;
            color: black !important;
            font-family: monospace !important;
          }
          .print-hide {
            display: none !important;
          }
          .print-paper {
            width: ${ticketConfig.format === '80mm' ? '80mm' : '58mm'} !important;
            max-width: ${ticketConfig.format === '80mm' ? '80mm' : '58mm'} !important;
            box-shadow: none !important;
            border: none !important;
            padding: 8px !important;
            margin: 0 auto !important;
            color: black !important;
            background: white !important;
          }
          /* Hide all NextJS chrome, sidebars, and actions */
          header, footer, nav, aside, .fixed, .print-hide-btn {
            display: none !important;
          }
          main {
            margin: 0 !important;
            padding: 0 !important;
            margin-left: 0 !important;
          }
          @page {
            margin: 0;
          }
        }
      ` }} />

      {/* Top Header Actions */}
      <div className="fixed top-0 left-0 right-0 h-20 bg-zinc-900/50 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-10 z-50 print-hide">
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-3 text-zinc-500 hover:text-white transition-all font-black text-[10px] uppercase tracking-widest group"
        >
          <span className="material-symbols-outlined text-lg group-hover:-translate-x-1 transition-transform">arrow_back</span>
          Volver
        </button>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={handlePrint}
            className="px-6 py-3 rounded-xl bg-violet-600 text-white hover:bg-violet-500 transition-all font-black text-[10px] uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(124,58,237,0.3)] flex items-center gap-2 active:scale-95"
          >
            <span className="material-symbols-outlined text-lg">print</span>
            Reimprimir Ticket
          </button>
        </div>
      </div>

      {/* Ticket Container */}
      <div className="flex-1 flex items-center justify-center p-8 relative print-container">
        {/* Visual Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[700px] bg-primary/5 rounded-full blur-[120px] pointer-events-none print-hide"></div>

        <div 
          className="relative w-full group transition-all duration-700 hover:scale-[1.02] print-paper flex justify-center"
          style={{
            maxWidth: ticketConfig.format === '80mm' ? '380px' : '290px',
          }}
        >
          {/* Thermal Paper Shadow */}
          <div className="absolute -inset-4 bg-black/40 blur-3xl rounded-[3rem] transition-opacity duration-700 opacity-50 group-hover:opacity-100 print-hide"></div>

          {/* Ticket Body */}
          <div className="relative bg-white text-zinc-900 shadow-2xl overflow-hidden flex flex-col font-mono text-[11px] leading-relaxed w-full border border-zinc-200 print:border-none print:shadow-none">
            {/* Ragged Edges Top */}
            <div className="flex justify-around bg-zinc-950 h-2 w-full print-hide">
               {Array.from({ length: 40 }).map((_, i) => (
                 <div key={i} className="w-2 h-2 bg-white rounded-full -mt-1"></div>
               ))}
            </div>

            <div className="p-6 sm:p-10 flex flex-col gap-6 print:p-2">
              {/* Header Store Info */}
              <div className="text-center flex flex-col gap-1.5">
                {ticketConfig.show_logo && (
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <img src="/logo.svg" alt="Logo" className="w-5 h-5 object-contain" />
                    <span className="text-xl font-black tracking-tighter uppercase">{tenant?.nombre || 'OBSIDIANA'}</span>
                  </div>
                )}
                {!ticketConfig.show_logo && (
                  <span className="text-xl font-black tracking-tighter uppercase mb-1">{tenant?.nombre || 'OBSIDIANA'}</span>
                )}
                
                <p className="font-black text-[10px] uppercase tracking-widest text-zinc-500">PUNTO DE VENTA</p>
                <div className="flex flex-col gap-0.5 text-zinc-600 font-bold text-[10px]">
                  {ticketConfig.address && <p>{ticketConfig.address}</p>}
                  {ticketConfig.phone && <p>TEL: {ticketConfig.phone}</p>}
                  {ticketConfig.email && <p>{ticketConfig.email}</p>}
                  
                  {ticketConfig.show_fiscal && tenant?.cuit && (
                    <div className="border-t border-b border-zinc-200 border-dashed py-1.5 my-1.5 text-[9px]">
                      <p>CUIT: {tenant.cuit}</p>
                      <p className="uppercase">IVA: {tenant.condicion_iva?.replace('_', ' ') || 'RESPONSABLE INSCRIPTO'}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-zinc-200 border-dashed"></div>

              {/* Document Info */}
              <div className="flex flex-col items-center gap-3">
                <div className="border-2 border-zinc-900 px-4 py-1 text-sm font-black tracking-[0.2em] uppercase">
                  {order.financial_status === 'pending' ? 'PRE-TICKET' : 'TICKET COMPROBANTE'}
                </div>
                <div className="w-full flex flex-col gap-1 text-zinc-500 font-bold text-[10px]">
                  <div className="flex justify-between">
                    <span>NRO TICKET:</span>
                    <span className="text-zinc-900">0001-{String(order.number || 0).padStart(8, '0')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>FECHA:</span>
                    <span className="text-zinc-900">{new Date(order.placed_at || order.created_at).toLocaleString()}</span>
                  </div>
                  
                  {order.customers && (
                    <div className="border-t border-zinc-100 pt-2 mt-1">
                      <div className="flex justify-between">
                        <span>CLIENTE:</span>
                        <span className="text-zinc-900 uppercase">{order.customers.nombre}</span>
                      </div>
                      {order.customers.dni_cuit && (
                        <div className="flex justify-between">
                          <span>DNI/CUIT:</span>
                          <span className="text-zinc-900">{order.customers.dni_cuit}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-zinc-200 border-dashed"></div>

              {/* Items Table */}
              <div className="flex flex-col gap-3">
                <div className="flex justify-between font-black border-b border-zinc-200 pb-1.5 text-[10px]">
                  <span className="w-10">CANT</span>
                  <span className="flex-1 px-2">DESCRIPCIÓN</span>
                  <span className="w-16 text-right">TOTAL</span>
                </div>
                
                {items.map((item, i) => (
                  <div key={i} className="flex flex-col gap-0.5 text-[10px]">
                    <div className="flex justify-between font-bold">
                      <span className="w-10">{Number(item.quantity).toFixed(2)}</span>
                      <span className="flex-1 px-2 uppercase truncate">{item.title_snapshot || 'Producto'}</span>
                      <span className="w-16 text-right">$ {Number(item.unit_price_ars * item.quantity).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t-2 border-zinc-900 pt-3 mt-1 flex flex-col gap-1.5 text-[10px]">
                <div className="flex justify-between font-bold text-zinc-500">
                  <span>SUBTOTAL</span>
                  <span>$ {subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                </div>
                {ticketConfig.show_fiscal && tax > 0 && (
                  <div className="flex justify-between font-bold text-zinc-500">
                    <span>IVA (21%)</span>
                    <span>$ {tax.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-xs border-t border-zinc-900 pt-3 mt-1">
                  <span>TOTAL</span>
                  <span>$ {total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="border-t border-zinc-200 border-dashed"></div>

              {/* QR and Auth Footer */}
              <div className="flex flex-col items-center gap-4">
                 {/* QR Mock */}
                 <div className="w-24 h-24 bg-zinc-50 p-1.5 border border-zinc-200 print-hide">
                    <div className="w-full h-full bg-zinc-900 grid grid-cols-8 grid-rows-8 gap-[1px] p-[1px]">
                       {Array.from({ length: 64 }).map((_, i) => (
                         <div key={i} className={`${Math.random() > 0.5 ? 'bg-white' : 'bg-zinc-900'}`}></div>
                       ))}
                    </div>
                 </div>

                 <div className="w-full flex flex-col gap-0.5 text-center font-bold text-zinc-500 text-[9px]">
                    <p className="text-zinc-900 font-black mb-1 uppercase tracking-widest text-[10px]">Comprobante Comercial</p>
                    <p>Canal de Venta: POS / Terminal de Caja</p>
                 </div>

                 {ticketConfig.footer_msg && (
                   <p className="text-[10px] font-bold text-zinc-700 text-center whitespace-pre-line border-t border-dashed border-zinc-200 pt-3 w-full">
                     {ticketConfig.footer_msg}
                   </p>
                 )}
              </div>
            </div>

            {/* Ragged Edges Bottom */}
            <div className="flex justify-around bg-zinc-950 h-2 w-full mt-auto print-hide">
               {Array.from({ length: 40 }).map((_, i) => (
                 <div key={i} className="w-2 h-2 bg-white rounded-full mt-1"></div>
               ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
