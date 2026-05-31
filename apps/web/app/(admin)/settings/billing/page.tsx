'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/hooks/use-tenant';

export default function BillingPage() {
  const { tenant, loading: tenantLoading } = useTenant();
  const [plans, setPlans] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [productCount, setProductCount] = useState(0);

  // Platform payment config
  const [platformConfig, setPlatformConfig] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState('transferencia');
  const [transferProof, setTransferProof] = useState<File | null>(null);
  const [informPaymentStep, setInformPaymentStep] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    if (!tenantLoading) {
      fetchData();
    }
  }, [tenant, tenantLoading]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const status = params.get('status');
      if (status === 'success') {
        setStatusMessage({
          type: 'success',
          text: '¡Pago aprobado con éxito! Tu plan se actualizará automáticamente en unos instantes.'
        });
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (status === 'failure') {
        setStatusMessage({
          type: 'error',
          text: 'Hubo un inconveniente al procesar tu pago. Por favor, intentá de nuevo.'
        });
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (status === 'pending') {
        setStatusMessage({
          type: 'info',
          text: 'Tu pago está en estado pendiente. Te notificaremos cuando se acredite.'
        });
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  // When platformConfig changes, auto-select the best default payment method
  useEffect(() => {
    if (platformConfig) {
      if (platformConfig.mp_enabled) {
        setPaymentMethod('mp');
      } else if (platformConfig.transfer_enabled) {
        setPaymentMethod('transferencia');
      }
    }
  }, [platformConfig]);

  async function fetchData() {
    if (!tenant?.id) {
      console.warn('[Billing] No tenant.id, skipping fetchData');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [plansRes, paymentsRes, platformConfigData, productsRes] = await Promise.all([
        supabase.from('plans').select('*').order('monthly_price', { ascending: true }),
        supabase.from('subscription_payments').select('*').eq('tenant_id', tenant.id).order('paid_at', { ascending: false }),
        fetch('/api/platform/payment-config').then(res => res.json()).catch(() => null),
        supabase.from('products').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant.id)
      ]);
      setPlans(plansRes.data || []);
      setPayments(paymentsRes.data || []);
      console.log('[Billing] platformConfigData received:', platformConfigData);
      // Only save if response is valid (has mp_enabled or transfer_enabled field, not an error)
      if (platformConfigData && !platformConfigData.error && typeof platformConfigData.mp_enabled === 'boolean') {
        console.log('[Billing] Setting platformConfig:', platformConfigData);
        setPlatformConfig(platformConfigData);
      } else {
        console.warn('[Billing] platformConfigData inválido o con error:', platformConfigData);
      }
      setProductCount(productsRes.count || 0);
    } catch (err) {
      console.error('[Billing] fetchData error:', err);
      setPlans([]);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }

  const handleRenewClick = (plan: any) => {
    setSelectedPlan(plan);
    setShowPaymentModal(true);
  };

  const handlePayment = async () => {
    console.log('handlePayment: Clicked!', {
      tenantId: tenant?.id,
      selectedPlanId: selectedPlan?.id,
      paymentMethod
    });

    if (!tenant?.id || !selectedPlan) {
      console.error('handlePayment: Missing tenant or selectedPlan', {
        tenant,
        selectedPlan
      });
      alert('Error: Los datos del negocio o el plan seleccionado no están completamente cargados en el cliente.');
      return;
    }
    
    setUpdating(true);
    try {
      if (paymentMethod === 'mp') {
        console.log('handlePayment: Fetching /api/platform/checkout/mercadopago...');
        const response = await fetch('/api/platform/checkout/mercadopago', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            planId: selectedPlan.id,
            tenantId: tenant.id
          })
        });

        console.log('handlePayment: Response received, status:', response.status);
        const data = await response.json();
        console.log('handlePayment: Parsed response JSON:', data);

        if (data.init_point) {
          console.log('handlePayment: Redirecting to:', data.init_point);
          window.location.href = data.init_point;
        } else {
          throw new Error(data.error || 'Error al iniciar pago (sin init_point)');
        }
        return;
      }

      // Manual Transfer Logic
      const now = new Date();
      let proofUrl = null;

      if (transferProof) {
        const fileExt = transferProof.name.split('.').pop();
        const fileName = `${tenant.id}/${now.getTime()}.${fileExt}`;
        const filePath = `payment-proofs/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('platform_assets')
          .upload(filePath, transferProof);

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('platform_assets')
            .getPublicUrl(filePath);
          proofUrl = publicUrl;
        }
      }

      const { error: paymentError } = await supabase.from('subscription_payments').insert({
        tenant_id: tenant.id,
        plan_id: selectedPlan.id,
        amount: selectedPlan.monthly_price ?? 0,
        currency: 'ARS',
        payment_method: 'transferencia',
        status: 'pending_confirmation',
        paid_at: now.toISOString(),
        proof_url: proofUrl
      });

      if (paymentError) throw paymentError;

      alert('¡Pago informado! Verificaremos tu transferencia a la brevedad.');
      setShowPaymentModal(false);
      setTransferProof(null);
      setInformPaymentStep(false);
      fetchData();
    } catch (error: any) {
      console.error('handlePayment Exception:', error);
      alert('Error al procesar pago: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const transferConfig = platformConfig?.transfer_enabled ? platformConfig : null;
  const mpConfig = platformConfig?.mp_enabled ? platformConfig : null;

  const currentPlan = plans.find(p => p.id === tenant?.plan_id);
  const planStarted = tenant?.plan_started_at ? new Date(tenant.plan_started_at) : null;
  const paidUntil = tenant?.paid_until ? new Date(tenant.paid_until) : null;
  const subscriptionStatus = tenant?.subscription_status || 'inactive';

  const getDaysRemaining = () => {
    if (!paidUntil) return 0;
    const now = new Date();
    const diff = paidUntil.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const getUsagePercentage = () => {
    if (!planStarted || !paidUntil) return 0;
    const total = paidUntil.getTime() - planStarted.getTime();
    const used = new Date().getTime() - planStarted.getTime();
    return Math.min(100, Math.round((used / total) * 100));
  };

  const formatDate = (date: string | null | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getStatusBadge = (status: string) => {
    const base = "text-[9px] font-black uppercase px-2 py-0.5 rounded-full border";
    switch (status) {
      case 'completed': return `${base} bg-emerald-500/10 text-emerald-400 border-emerald-500/20`;
      case 'pending_confirmation': return `${base} bg-amber-500/10 text-amber-400 border-amber-500/20`;
      case 'rejected': return `${base} bg-red-500/10 text-red-400 border-red-500/20`;
      default: return `${base} bg-zinc-500/10 text-zinc-400 border-zinc-500/20`;
    }
  };

  const formatCurrency = (amount: number | null | undefined) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(amount ?? 0);
  };

  const featureLabels: Record<string, string> = {
    pos: 'Punto de Venta Profesional',
    ml_sync: 'Sincronización Mercado Libre',
    inventory: 'Gestión de Stock Avanzada',
    mercadopago: 'Integración Mercado Pago',
    multi_branch: 'Gestión Multisucursal',
    online_store: 'E-commerce Propio',
    custom_domain: 'Dominio Personalizado',
    reports_basic: 'Analíticas de Ventas',
    reports_advanced: 'Inteligencia de Negocio',
    ai_tools: 'Asistente IA para Productos',
    multi_user: 'Múltiples Accesos Staff',
    customers: 'Gestión de Clientes',
    analytics_basic: 'Estadísticas Básicas',
    analytics_advanced: 'Analíticas de Ventas Avanzadas',
    loyalty: 'Club de Puntos (Fidelización)',
    segments: 'Segmentación de Clientes'
  };

  if (tenantLoading || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] gap-4">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">Sincronizando Facturación...</span>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] gap-4">
        <span className="material-symbols-outlined text-4xl text-red-500">warning</span>
        <p className="text-zinc-500 font-black text-xs uppercase tracking-widest">No se pudo cargar tu tenant</p>
      </div>
    );
  }

  const daysRemaining = getDaysRemaining();
  const usagePercent = getUsagePercentage();

  return (
    <div className="max-w-[1400px] mx-auto p-4 lg:p-10 flex flex-col gap-12 pb-32">
      {/* Page Header */}
      <div className="relative group">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none group-hover:bg-primary/15 transition-all duration-1000"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="px-3 py-1 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 font-black text-[9px] uppercase tracking-widest flex items-center gap-2">
              <span className="material-symbols-outlined text-[12px]">verified</span>
              Módulo de Suscripción
            </span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight uppercase tracking-[-0.02em]">Planes & Facturación</h1>
          <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs mt-2 max-w-2xl">
            Gestioná el crecimiento de tu negocio escalando tu infraestructura SaaS y controlando tus límites operativos.
          </p>
        </div>
      </div>

      {/* Payment returning status alert */}
      {statusMessage && (
         <div className={`p-6 rounded-[2rem] border animate-in fade-in slide-in-from-top-4 duration-500 relative overflow-hidden ${
            statusMessage.type === 'success' 
               ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
               : statusMessage.type === 'error'
                  ? 'bg-red-500/10 border-red-500/20 text-red-400'
                  : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
         }`}>
            <div className="flex items-center gap-4 relative z-10">
               <span className="material-symbols-outlined text-2xl">
                  {statusMessage.type === 'success' ? 'check_circle' : statusMessage.type === 'error' ? 'cancel' : 'pending'}
               </span>
               <div className="flex-1 col">
                  <h4 className="text-[10px] font-black uppercase tracking-wider">Facturación de Plataforma</h4>
                  <p className="text-sm font-bold text-zinc-300 mt-1">{statusMessage.text}</p>
               </div>
               <button onClick={() => setStatusMessage(null)} className="text-zinc-500 hover:text-white transition-colors">
                  <span className="material-symbols-outlined text-lg">close</span>
               </button>
            </div>
         </div>
      )}

      {/* Subscription Status Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 bg-[#121212] border border-white/5 rounded-[3rem] p-10 relative overflow-hidden group shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -mr-32 -mt-32 group-hover:bg-primary/10 transition-all duration-1000"></div>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-10 relative z-10">
             <div className="flex-1">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4">Suscripción Actual</p>
                <div className="flex items-baseline gap-4 mb-4">
                   <h2 className="text-5xl font-black text-white tracking-tighter uppercase">{currentPlan?.name || currentPlan?.nombre || 'Free'}</h2>
                   <span className={`px-4 py-1 rounded-full ${getStatusBadge(subscriptionStatus)}`}>
                      {subscriptionStatus === 'active' ? '● Activa' : 'Expirada'}
                   </span>
                </div>
                <div className="flex items-center gap-6">
                   <div className="flex flex-col">
                      <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Inversión Mensual</span>
                      <span className="text-xl font-black text-white">{formatCurrency(currentPlan?.monthly_price ?? 0)}</span>
                   </div>
                   <div className="w-px h-10 bg-white/10"></div>
                   <div className="flex flex-col">
                      <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Vencimiento</span>
                      <span className="text-xl font-black text-white">{formatDate(tenant?.paid_until)}</span>
                   </div>
                </div>
             </div>

             {/* Days Remaining Ring */}
             <div className="relative w-40 h-40 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90">
                   <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-zinc-900" />
                   <circle 
                      cx="80" cy="80" r="70" 
                      stroke="currentColor" strokeWidth="8" fill="transparent" 
                      strokeDasharray={440}
                      strokeDashoffset={440 - (440 * (100 - usagePercent)) / 100}
                      strokeLinecap="round"
                      className={`transition-all duration-1000 ${daysRemaining <= 5 ? 'text-red-500' : 'text-primary'}`} 
                   />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                   <span className="text-3xl font-black text-white">{daysRemaining}</span>
                   <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Días</span>
                </div>
             </div>
          </div>

          <div className="flex flex-wrap gap-4 mt-12 pt-10 border-t border-white/5 relative z-10">
             <button 
                onClick={() => handleRenewClick(currentPlan)}
                className="px-8 py-4 bg-white text-black hover:bg-zinc-200 transition-all rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95"
             >
                {subscriptionStatus === 'expired' ? 'Renovar Suscripción' : 'Extender Plan'}
             </button>
             <button 
                onClick={() => document.getElementById('available-plans')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-8 py-4 bg-zinc-900 border border-white/10 text-white hover:bg-zinc-800 transition-all rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95"
             >
                Cambiar de Plan
             </button>
          </div>
        </div>

        {/* Resources Usage Bento */}
        <div className="lg:col-span-4">
           <div className="bg-[#121212] border border-white/5 rounded-[2.5rem] p-8 h-full relative overflow-hidden group flex flex-col justify-between">
              <div>
                 <div className="flex items-center justify-between mb-8">
                    <div className="flex flex-col">
                       <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Límite de Catálogo</span>
                       <h3 className="text-xl font-black text-white uppercase">Productos</h3>
                    </div>
                    <span className="material-symbols-outlined text-primary/50 text-3xl">inventory_2</span>
                 </div>
                 <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-baseline font-black">
                       <span className="text-3xl text-white tracking-tighter">{productCount} <span className="text-sm text-zinc-600 font-bold">/ {currentPlan?.max_products || 50}</span></span>
                       <span className="text-xs text-primary">{Math.round((productCount / (currentPlan?.max_products || 50)) * 100)}%</span>
                    </div>
                    <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden p-[2px] border border-white/5">
                       <div 
                          className="h-full bg-primary rounded-full transition-all duration-1000" 
                          style={{ width: `${(productCount / (currentPlan?.max_products || 50)) * 100}%` }}
                       ></div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* Available Plans Section */}
      <div id="available-plans" className="pt-20">
         <div className="text-center mb-16">
            <h3 className="text-xs font-black text-primary uppercase tracking-[0.4em] mb-4">Pricing</h3>
            <h2 className="text-5xl font-black text-white tracking-tighter uppercase leading-[0.9]">Elegí el plan perfecto<br/><span className="text-zinc-700">para tu crecimiento</span></h2>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-5 xl:gap-6">
            {plans.map((p) => {
               const isCurrent = tenant?.plan_id === p.id;
               const isPro = p.id === 'pro';
               
               return (
                  <div 
                     key={p.id}
                     className={`bg-[#121212] rounded-[2rem] p-6 lg:p-8 border ${isCurrent ? 'border-primary/50' : 'border-white/5'} relative overflow-hidden flex flex-col group hover:border-white/20 transition-all duration-500 shadow-2xl h-full`}
                  >
                     {isPro && (
                        <div className="absolute top-0 right-6 bg-primary text-black px-4 py-1.5 rounded-b-xl font-black text-[8px] uppercase tracking-widest shadow-xl">
                           Más Recomendado
                        </div>
                     )}

                     <div className="mb-6">
                        <h3 className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">{isCurrent ? 'Tu Plan Actual' : 'Plan'}</h3>
                        <h4 className="text-2xl lg:text-3xl font-black text-white uppercase tracking-tighter">{p.name || p.nombre}</h4>
                     </div>

                     <div className="mb-6 flex items-baseline gap-1.5">
                        <span className="text-3xl lg:text-4xl font-black text-white tracking-tighter">${(p.monthly_price ?? 0).toLocaleString()}</span>
                        <span className="text-zinc-600 font-bold uppercase text-[9px] tracking-widest">/ Mes</span>
                     </div>

                     <div className="space-y-4 mb-8 flex-1">
                        <p className="text-[8px] font-black text-zinc-700 uppercase tracking-[0.2em] border-b border-white/5 pb-3">Funcionalidades Incluidas</p>
                        <div className="space-y-3">
                           {p.features && typeof p.features === 'object' && Object.entries(p.features)
                              .filter(([_, enabled]) => enabled === true)
                              .slice(0, 8)
                              .map(([feat, _], fi) => (
                                 <div key={fi} className="flex items-center gap-2.5 group/feat">
                                    <div className="w-4 h-4 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center group-hover/feat:bg-primary transition-all">
                                       <span className="material-symbols-outlined text-[11px] text-primary group-hover/feat:text-black">check</span>
                                    </div>
                                    <span className="text-xs font-bold text-zinc-400 group-hover/feat:text-white transition-colors">{featureLabels[feat] || feat}</span>
                                 </div>
                              ))
                           }
                           <div className="flex items-center gap-2.5">
                              <div className="w-4 h-4 rounded-full bg-zinc-800 border border-white/5 flex items-center justify-center">
                                 <span className="material-symbols-outlined text-[11px] text-zinc-500">inventory_2</span>
                              </div>
                              <span className="text-xs font-bold text-zinc-400">Hasta {p.max_products} productos</span>
                           </div>
                        </div>
                     </div>

                     <button 
                        disabled={isCurrent || updating}
                        onClick={() => handleRenewClick(p)}
                        className={`w-full py-3.5 rounded-xl font-black text-[9px] uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 disabled:opacity-50 ${
                           isCurrent 
                              ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-white/5' 
                              : isPro 
                                 ? 'bg-primary text-black hover:bg-emerald-400' 
                                 : 'bg-white text-black hover:bg-zinc-200'
                        }`}
                     >
                        {isCurrent ? 'Plan Activo' : 'Seleccionar Plan'}
                     </button>
                  </div>
               );
            })}
         </div>
      </div>

      {/* Transaction History - Modern Table */}
      <div className="mt-20">
         <div className="flex items-center justify-between mb-10">
            <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Historial de Pagos</h3>
            <button className="text-[10px] font-black text-zinc-500 uppercase tracking-widest hover:text-white transition-colors">Descargar Reporte</button>
         </div>

         <div className="bg-[#121212] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
            <table className="w-full text-left">
               <thead>
                  <tr className="bg-zinc-950/50 border-b border-white/5">
                     <th className="p-6 text-[10px] font-black text-zinc-600 uppercase tracking-widest">Referencia / Fecha</th>
                     <th className="p-6 text-[10px] font-black text-zinc-600 uppercase tracking-widest">Plan Suscrito</th>
                     <th className="p-6 text-[10px] font-black text-zinc-600 uppercase tracking-widest">Inversión</th>
                     <th className="p-6 text-[10px] font-black text-zinc-600 uppercase tracking-widest">Método</th>
                     <th className="p-6 text-[10px] font-black text-zinc-600 uppercase tracking-widest text-right">Estado</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-white/5">
                  {payments.length === 0 ? (
                     <tr><td colSpan={5} className="p-20 text-center text-zinc-600 font-black text-xs uppercase tracking-widest">No hay transacciones registradas</td></tr>
                  ) : payments.map((pay) => {
                     const p = plans.find(pl => pl.id === pay.plan_id);
                     return (
                        <tr key={pay.id} className="hover:bg-white/[0.02] transition-colors group">
                           <td className="p-6">
                              <p className="text-xs font-black text-white mb-1">#{pay.id.slice(0, 8).toUpperCase()}</p>
                              <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">{formatDate(pay.paid_at)}</p>
                           </td>
                           <td className="p-6">
                              <span className="text-xs font-bold text-zinc-300">{p?.name || p?.nombre || 'Suscripción'}</span>
                           </td>
                           <td className="p-6">
                              <span className="text-sm font-black text-white">{formatCurrency(pay.amount)}</span>
                           </td>
                           <td className="p-6">
                              <div className="flex items-center gap-2">
                                 <span className="material-symbols-outlined text-[16px] text-zinc-500">{pay.payment_method === 'mp' ? 'payment' : 'account_balance'}</span>
                                 <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest capitalize">{pay.payment_method}</span>
                              </div>
                           </td>
                           <td className="p-6 text-right">
                              <span className={getStatusBadge(pay.status)}>{pay.status}</span>
                           </td>
                        </tr>
                     );
                  })}
               </tbody>
            </table>
         </div>
      </div>

      {/* Payment Modal Refined */}
      {showPaymentModal && selectedPlan && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-[#121212] border border-t border-x-0 border-b-0 md:border border-white/10 rounded-t-[2.5rem] rounded-b-none md:rounded-[3rem] w-full max-w-full md:max-w-xl overflow-y-auto max-h-[85vh] md:max-h-[95vh] shadow-[0_0_100px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom md:slide-in-from-top-4 duration-300 ease-out">
             {/* Native Grab Handle for Mobile */}
             <div className="w-12 h-1 bg-zinc-800 rounded-full mx-auto mt-4 mb-2 md:hidden" />
             <div className="p-6 md:p-10">
               <div className="flex items-center justify-between mb-10">
                  <div>
                     <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Procesar Suscripción</h3>
                     <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-1">Plan Seleccionado: {selectedPlan.name || selectedPlan.nombre}</p>
                  </div>
                  <button onClick={() => setShowPaymentModal(false)} className="w-10 h-10 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center text-zinc-500 hover:text-white transition-colors">
                     <span className="material-symbols-outlined">close</span>
                  </button>
               </div>

               <p className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4">1. Seleccioná el método de pago</p>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  <button 
                     type="button"
                     onClick={() => setPaymentMethod('transferencia')}
                     className={`p-6 rounded-[2rem] border transition-all text-left relative group/btn ${paymentMethod === 'transferencia' ? 'bg-primary/10 border-primary shadow-[0_0_30px_rgba(124,58,237,0.15)]' : 'bg-zinc-950/40 border-white/5 hover:border-white/10 hover:bg-zinc-950'}`}
                  >
                     <div className="absolute top-6 right-6">
                        {paymentMethod === 'transferencia' ? (
                           <div className="w-5 h-5 rounded-full border-2 border-primary bg-primary flex items-center justify-center">
                              <div className="w-1.5 h-1.5 rounded-full bg-black"></div>
                           </div>
                        ) : (
                           <div className="w-5 h-5 rounded-full border-2 border-zinc-700 bg-transparent"></div>
                        )}
                     </div>
                     <span className={`material-symbols-outlined text-3xl mb-4 transition-colors ${paymentMethod === 'transferencia' ? 'text-primary' : 'text-zinc-600 group-hover/btn:text-white'}`}>account_balance</span>
                     <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Método Directo</p>
                     <h4 className="text-sm font-black uppercase text-white">Transferencia</h4>
                  </button>
                  <button 
                     type="button"
                     onClick={() => setPaymentMethod('mp')}
                     className={`p-6 rounded-[2rem] border transition-all text-left relative group/btn ${paymentMethod === 'mp' ? 'bg-blue-500/10 border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.15)]' : 'bg-zinc-950/40 border-white/5 hover:border-white/10 hover:bg-zinc-950'}`}
                  >
                     <div className="absolute top-6 right-6">
                        {paymentMethod === 'mp' ? (
                           <div className="w-5 h-5 rounded-full border-2 border-blue-500 bg-blue-500 flex items-center justify-center">
                              <div className="w-1.5 h-1.5 rounded-full bg-black"></div>
                           </div>
                        ) : (
                           <div className="w-5 h-5 rounded-full border-2 border-zinc-700 bg-transparent"></div>
                        )}
                     </div>
                     <span className={`material-symbols-outlined text-3xl mb-4 transition-colors ${paymentMethod === 'mp' ? 'text-blue-400' : 'text-zinc-600 group-hover/btn:text-white'}`}>payment</span>
                     <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Automático</p>
                     <h4 className="text-sm font-black uppercase text-white">MercadoPago</h4>
                  </button>
               </div>

               {paymentMethod === 'mp' && (
                  <div className="bg-blue-500/5 rounded-[2rem] border border-blue-500/10 p-6 mb-8 flex items-start gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                     <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                        <span className="material-symbols-outlined text-[20px]">info</span>
                     </div>
                     <div>
                        <h4 className="text-xs font-black text-white uppercase tracking-wider">Pago Automático e Instantáneo</h4>
                        <p className="text-[10px] text-zinc-400 font-bold leading-relaxed mt-1">Serás redirigido a la plataforma oficial de Mercado Pago de forma segura para completar la transacción. Al finalizar, tu plan se activará al instante.</p>
                     </div>
                  </div>
               )}

               {paymentMethod === 'transferencia' && transferConfig && (
                  <div className="bg-zinc-950 rounded-[2rem] border border-white/5 p-8 mb-8 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                     <div className="grid grid-cols-2 gap-6">
                        <div>
                           <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">Entidad Bancaria</p>
                           <p className="text-xs font-bold text-white">{transferConfig.transfer_bank}</p>
                        </div>
                        <div>
                           <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">Titular / Alias</p>
                           <p className="text-xs font-bold text-white">{transferConfig.transfer_alias}</p>
                        </div>
                        <div className="col-span-2">
                           <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">CBU / CVU</p>
                           <div className="flex items-center justify-between bg-black/40 p-3 rounded-xl border border-white/5">
                              <code className="text-[11px] font-bold text-primary tracking-wider">{transferConfig.transfer_cbu}</code>
                              <button onClick={() => navigator.clipboard.writeText(transferConfig.transfer_cbu)} className="material-symbols-outlined text-xs text-zinc-500 hover:text-white transition-colors">content_copy</button>
                           </div>
                        </div>
                     </div>

                     <div className="pt-6 border-t border-white/5">
                        <label className="block text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-3">Adjuntar Comprobante (JPG, PNG, PDF)</label>
                        <div className="relative group/file">
                           <input 
                              type="file" 
                              onChange={(e) => setTransferProof(e.target.files?.[0] || null)}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                           />
                           <div className="bg-zinc-900 border-2 border-dashed border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 group-hover/file:border-primary/30 transition-all">
                              <span className="material-symbols-outlined text-zinc-600">upload_file</span>
                              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{transferProof ? transferProof.name : 'Click para subir archivo'}</span>
                           </div>
                        </div>
                     </div>
                  </div>
               )}

               <div className="flex gap-4 pt-2 border-t border-white/5">
                  <button type="button" onClick={() => setShowPaymentModal(false)} className="flex-1 py-5 rounded-[1.5rem] bg-zinc-950 text-zinc-500 font-black text-[10px] uppercase tracking-widest border border-white/5 hover:text-white transition-all active:scale-95">Cerrar</button>
                  <button 
                     type="button"
                     onClick={handlePayment}
                     disabled={updating || (paymentMethod === 'transferencia' && !transferProof)}
                     className={`flex-1 py-5 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest shadow-xl transition-all active:scale-95 disabled:opacity-50 ${
                        paymentMethod === 'mp' 
                           ? 'bg-blue-600 text-white shadow-blue-600/10 hover:bg-blue-500' 
                           : 'bg-primary text-black shadow-primary/10 hover:bg-emerald-400'
                     }`}
                  >
                     {updating ? 'Procesando...' : paymentMethod === 'transferencia' ? 'Informar Pago' : 'Pagar Ahora con MercadoPago'}
                  </button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}