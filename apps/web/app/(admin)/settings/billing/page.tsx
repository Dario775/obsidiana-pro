'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/hooks/use-tenant';

export default function BillingPage() {
  const { tenant } = useTenant();
  const [plans, setPlans] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Platform payment config
  const [platformConfig, setPlatformConfig] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState('transferencia');
  const [transferProof, setTransferProof] = useState<File | null>(null);
  const [informPaymentStep, setInformPaymentStep] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [plansRes, paymentsRes, platformRes] = await Promise.all([
        supabase.from('plans').select('*'),
        tenant ? supabase.from('subscription_payments').select('*').eq('tenant_id', tenant.id).order('paid_at', { ascending: false }) : Promise.resolve({ data: [] }),
        supabase.from('platform_config').select('*').eq('key', 'payment_config').limit(1).maybeSingle()
      ]);
      if (plansRes.data) setPlans(plansRes.data);
      if (paymentsRes.data) setPayments(paymentsRes.data);
      if (platformRes.data) setPlatformConfig(platformRes.data.value);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleRenewClick = (plan: any) => {
    setSelectedPlan(plan);
    setShowPaymentModal(true);
  };

  const handlePayment = async () => {
    if (!tenant?.id || !selectedPlan) return;
    
    setUpdating(true);
    try {
      const now = new Date();
      const paidUntil = new Date(now);
      paidUntil.setMonth(paidUntil.getMonth() + 1);

      let proofUrl = '';
      
      if (transferProof && paymentMethod === 'transferencia') {
        const reader = new FileReader();
        proofUrl = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(transferProof);
        });
      }

      const { error: paymentError } = await supabase.from('subscription_payments').insert({
        tenant_id: tenant.id,
        plan_id: selectedPlan.id,
        amount: selectedPlan.precio_mensual,
        currency: 'ARS',
        payment_method: paymentMethod,
        status: paymentMethod === 'transferencia' ? 'pending_confirmation' : 'completed',
        paid_at: now.toISOString(),
        proof_image: proofUrl || null
      });

      if (paymentError) throw paymentError;

      const newStatus = paymentMethod === 'transferencia' ? 'pending_confirmation' : 'active';
      const { error: tenantError } = await supabase.from('tenants')
        .update({ 
          plan_id: selectedPlan.id,
          plan_started_at: now.toISOString(),
          paid_until: paidUntil.toISOString(),
          subscription_status: newStatus
        })
        .eq('id', tenant.id);

      if (tenantError) throw tenantError;

      setShowPaymentModal(false);
      
      if (paymentMethod === 'transferencia') {
        alert('¡Pago informado! Tu suscripción será activada una vez que el administrador verifique el comprobante.');
      } else {
        alert('¡Pago registrado! Tu suscripción está activa.');
      }
      window.location.reload();
    } catch (error: any) {
      console.error(error);
      alert('Error al procesar pago: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const transferConfig = platformConfig?.transfer_enabled ? platformConfig : null;
  const mpConfig = platformConfig?.mp_enabled ? platformConfig : null;

  const handleChangePlan = async (planId: string) => {
    if (!tenant?.id) return;
    if (!confirm('¿Estás seguro de que querés cambiar de plan?')) return;

    setUpdating(true);
    try {
      const now = new Date();
      const paidUntil = new Date(now);
      paidUntil.setMonth(paidUntil.getMonth() + 1);

      const { error } = await supabase.from('tenants')
        .update({ 
          plan_id: planId,
          plan_started_at: now.toISOString(),
          paid_until: paidUntil.toISOString(),
          subscription_status: 'active'
        })
        .eq('id', tenant.id);

      if (error) throw error;
      alert('¡Plan actualizado con éxito!');
      window.location.reload();
    } catch (error: any) {
      console.error(error);
      alert('Error al cambiar plan: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'pending': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'expired': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-zinc-500 font-bold uppercase tracking-widest text-xs gap-3">
        <span className="material-symbols-outlined text-4xl animate-spin text-primary">autorenew</span>
        Cargando...
      </div>
    );
  }

  const daysRemaining = getDaysRemaining();
  const usagePercent = getUsagePercentage();

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-10">
        <h1 className="text-3xl font-black uppercase tracking-tighter text-white">Planes y Facturación</h1>
        <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">
          Gestioná tu plan de suscripción y verificate el tiempo restante
        </p>
      </div>

      {/* Current Subscription Status */}
      <div className="bg-zinc-900/50 border border-white/5 p-6 rounded-2xl mb-8">
        <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
          <div className="flex-1">
            <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest block mb-2">Tu Plan Actual</span>
            <h2 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2 mb-2">
              {currentPlan?.nombre || 'Sin Plan'}
              {subscriptionStatus === 'active' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Activo
                </span>
              )}
              {subscriptionStatus === 'expired' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-red-500/10 text-red-400 border border-red-500/20">
                  Vencido
                </span>
              )}
            </h2>
            <div className="text-2xl font-black text-white">
              {currentPlan ? formatCurrency(currentPlan.precio_mensual) : 'Gratis'}
              <span className="text-zinc-500 text-sm font-normal">/mes</span>
            </div>
          </div>

          {/* Subscription Timer */}
          {subscriptionStatus === 'active' && paidUntil && (
            <div className="bg-zinc-800/50 p-4 rounded-xl min-w-[200px]">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-zinc-500 font-bold uppercase">Tiempo restante</span>
                <span className={`text-xs font-black uppercase ${daysRemaining <= 7 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {daysRemaining} días
                </span>
              </div>
              <div className="w-full h-2 bg-zinc-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all ${daysRemaining <= 7 ? 'bg-red-500' : 'bg-emerald-500'}`}
                  style={{ width: `${100 - usagePercent}%` }}
                />
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-[10px] text-zinc-500">{formatDate(tenant?.plan_started_at)}</span>
                <span className="text-[10px] text-zinc-500">{formatDate(tenant?.paid_until)}</span>
              </div>
            </div>
          )}

          {subscriptionStatus === 'expired' && (
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl">
              <div className="flex items-center gap-2 text-red-400">
                <span className="material-symbols-outlined">error</span>
                <span className="text-sm font-bold">Suscripción vencida</span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">Renová tu plan para continuar</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-white/5">
          {(subscriptionStatus === 'expired' || daysRemaining <= 7) && currentPlan && (
            <button 
              onClick={() => handleRenewClick(currentPlan)}
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold uppercase rounded-lg"
            >
              Renovar Ahora
            </button>
          )}
          {(subscriptionStatus !== 'expired' && daysRemaining > 7) && currentPlan && (
            <button 
              onClick={() => handleRenewClick(currentPlan)}
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold uppercase rounded-lg"
            >
              Cambiar Plan
            </button>
          )}
          <button className="px-4 py-2 border border-white/10 text-white text-xs font-bold uppercase rounded-lg hover:bg-white/5">
            Ver Historial
          </button>
        </div>
      </div>

      {/* Payment History */}
      {payments.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-black uppercase tracking-wider text-zinc-400 mb-4">Historial de Pagos</h3>
          <div className="bg-zinc-900/30 border border-white/5 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left text-[10px] text-zinc-500 font-black uppercase tracking-widest p-4">Fecha</th>
                  <th className="text-left text-[10px] text-zinc-500 font-black uppercase tracking-widest p-4">Plan</th>
                  <th className="text-left text-[10px] text-zinc-500 font-black uppercase tracking-widest p-4">Monto</th>
                  <th className="text-left text-[10px] text-zinc-500 font-black uppercase tracking-widest p-4">Método</th>
                  <th className="text-left text-[10px] text-zinc-500 font-black uppercase tracking-widest p-4">Estado</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => {
                  const plan = plans.find(p => p.id === payment.plan_id);
                  return (
                    <tr key={payment.id} className="border-b border-white/5 last:border-0">
                      <td className="p-4 text-sm text-zinc-300">{formatDate(payment.paid_at)}</td>
                      <td className="p-4 text-sm text-white font-bold">{plan?.nombre || '-'}</td>
                      <td className="p-4 text-sm text-white">{formatCurrency(payment.amount)}</td>
                      <td className="p-4 text-sm text-zinc-400 capitalize">{payment.payment_method || '-'}</td>
                      <td className="p-4">
                        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${getStatusColor(payment.status)}`}>
                          {payment.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Available Plans */}
      <div>
        <h3 className="text-sm font-black uppercase tracking-wider text-zinc-400 mb-4">Planes Disponibles</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((p) => {
            const isCurrentPlan = tenant?.plan_id === p.id;
            return (
              <div
                key={p.id}
                className={`bg-zinc-900 border ${isCurrentPlan ? 'border-primary/50 ring-2 ring-primary/20' : 'border-white/5'} hover:border-white/10 p-6 rounded-2xl transition-all shadow-xl flex flex-col justify-between gap-6 relative overflow-hidden h-full group`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-black uppercase tracking-wider text-white">{p.nombre}</h3>
                    {isCurrentPlan && (
                      <span className="text-[9px] font-black uppercase bg-primary text-white px-2 py-0.5 rounded-full">
                        Actual
                      </span>
                    )}
                  </div>

                  <div className="mb-6">
                    <span className="text-3xl font-black text-white">${p.precio_mensual.toLocaleString()}</span>
                    <span className="text-zinc-500 text-xs font-bold lowercase tracking-normal">/mes</span>
                  </div>

                  <div className="flex flex-col gap-3 mb-6">
                    <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest border-b border-white/5 pb-2">
                      Funcionalidades
                    </p>
                    {p.features && Object.keys(p.features).map((feat, fi) => (
                      <div key={fi} className="flex items-center gap-2 text-xs text-zinc-300">
                        <span className="material-symbols-outlined text-emerald-400 text-base">check_circle</span>
                        <span className="font-bold text-zinc-300 capitalize">{String(feat).replace('_', ' ')}</span>
                      </div>
                    ))}
                    {(!p.features || Object.keys(p.features).length === 0) && (
                      <span className="text-zinc-500 text-xs italic">Sin funciones extra</span>
                    )}
                  </div>
                </div>

                <button
                  disabled={isCurrentPlan || updating}
                  onClick={() => handleRenewClick(p)}
                  className={`w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${isCurrentPlan ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' : 'bg-primary hover:bg-primary-hover text-white shadow-lg'}`}
                >
                  {updating ? (
                    <span className="material-symbols-outlined text-sm animate-spin">autorenew</span>
                  ) : isCurrentPlan ? (
                    'Plan Actual'
                  ) : (
                    'Cambiar Plan'
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-black text-white uppercase mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-400">payment</span>
              Completar Pago
            </h3>
            
            <div className="space-y-4 mb-6">
              <div className="bg-zinc-800 p-4 rounded-xl">
                <p className="text-xs text-zinc-500">Plan seleccionado</p>
                <p className="text-lg font-bold text-white">{selectedPlan.nombre}</p>
                <p className="text-emerald-400 font-bold">{formatCurrency(selectedPlan.precio_mensual)}/mes</p>
              </div>

              <div>
                <p className="text-xs text-zinc-500 mb-2">Método de pago</p>
                <div className="space-y-2">
                  {transferConfig && (
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('transferencia')}
                      className={`w-full p-3 rounded-xl text-left ${paymentMethod === 'transferencia' ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-zinc-800 border border-white/10'}`}
                    >
                      <span className="material-symbols-outlined text-emerald-400 mr-2">account_balance</span>
                      <span className="text-white">Transferencia</span>
                      <p className="text-xs text-zinc-500">
                        Banco: {transferConfig.transfer_bank} • Alias: {transferConfig.transfer_alias}
                      </p>
                    </button>
                  )}
                  
                  {mpConfig && (
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('mp')}
                      className={`w-full p-3 rounded-xl text-left ${paymentMethod === 'mp' ? 'bg-blue-500/20 border border-blue-500/30' : 'bg-zinc-800 border border-white/10'}`}
                    >
                      <span className="material-symbols-outlined text-blue-400 mr-2">payment</span>
                      <span className="text-white">MercadoPago</span>
                    </button>
                  )}
                </div>
              </div>

              {paymentMethod === 'transferencia' && transferConfig && (
                <div className="bg-zinc-800 p-4 rounded-xl text-xs">
                  <p className="text-zinc-500 mb-2">Datos para transferir:</p>
                  <p className="text-white font-bold">Banco: {transferConfig.transfer_bank}</p>
                  <p className="text-white">CBU: {transferConfig.transfer_cbu}</p>
                  <p className="text-white">Alias: {transferConfig.transfer_alias}</p>
                  <p className="text-emerald-400 font-bold mt-2">Total: {formatCurrency(selectedPlan.precio_mensual)}</p>
                  
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <p className="text-zinc-400 mb-2">Adjuntá el comprobante de transferencia:</p>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => setTransferProof(e.target.files?.[0] || null)}
                      className="w-full text-zinc-400 text-xs"
                    />
                    {transferProof && (
                      <p className="text-emerald-400 mt-2">✓ {transferProof.name}</p>
                    )}
                  </div>
                </div>
              )}

              {paymentMethod === 'mp' && mpConfig && (
                <div className="bg-zinc-800 p-4 rounded-xl">
                  <p className="text-zinc-500 text-xs mb-2">Serás redirigido a MercadoPago para completar el pago</p>
                  <p className="text-white font-bold">Total: {formatCurrency(selectedPlan.precio_mensual)}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 py-3 bg-zinc-800 text-zinc-400 rounded-xl font-bold"
              >
                Cancelar
              </button>
              <button
                onClick={handlePayment}
                disabled={updating || (paymentMethod === 'transferencia' && informPaymentStep)}
                className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-bold disabled:opacity-50"
              >
                {updating ? 'Procesando...' : paymentMethod === 'transferencia' ? 'Informar Pago' : 'Pagar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}