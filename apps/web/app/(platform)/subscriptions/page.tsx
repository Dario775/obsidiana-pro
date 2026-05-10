'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function SubscriptionsPage() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit Subscription modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [planId, setPlanId] = useState('');
  const [saving, setSaving] = useState(false);

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentTenant, setPaymentTenant] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('transferencia');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentStatus, setPaymentStatus] = useState('completed');

  // Plan CRUD modal state
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [planFormData, setPlanFormData] = useState({
    nombre: '',
    precio_mensual: '',
    features: ''
  });

  // Platform payment config
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [platformConfig, setPlatformConfig] = useState({
    bank: '',
    cbu: '',
    alias: '',
    mp_link: ''
  });
  
  // Pending payments
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'expired' | 'pending'>('all');
  const [allPayments, setAllPayments] = useState<any[]>([]);
  const [showPaymentsModal, setShowPaymentsModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [tenantsRes, plansRes, paymentsRes] = await Promise.all([
        supabase.from('tenants').select('*'),
        supabase.from('plans').select('*'),
        supabase.from('subscription_payments').select('*').order('paid_at', { ascending: false })
      ]);
      setTenants(tenantsRes.data || []);
      setPlans(plansRes.data || []);
      if (paymentsRes.data) {
        setPendingPayments(paymentsRes.data.filter((p: any) => p.status === 'pending_confirmation'));
        setAllPayments(paymentsRes.data);
      }
    } catch (err) {
      console.error(err);
      setTenants([]);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }

  const handleOpenEditModal = (t: any) => {
    setSelectedTenant(t);
    setPlanId(t.plan_id || '');
    setShowEditModal(true);
  };

  const handleUpdateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('tenants')
        .update({ plan_id: planId || null })
        .eq('id', selectedTenant.id);

      if (!error) {
        setShowEditModal(false);
        fetchData();
      } else {
        alert('Error al actualizar plan del tenant: ' + error.message);
      }
    } catch (error: any) {
      console.error(error);
      alert('Error: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // PAYMENT HANDLERS
  const handleOpenPaymentModal = (t: any) => {
    setPaymentTenant(t);
    const plan = plans.find(p => p.id === t.plan_id);
    setPaymentAmount(plan?.monthly_price?.toString() || plan?.precio_mensual?.toString() || '0');
    setPaymentMethod('transferencia');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentStatus('completed');
    setShowPaymentModal(true);
  };

  const handleVerifyPayment = async (paymentId: string, approve: boolean) => {
    setVerifyingPayment(true);
    try {
      const payment = pendingPayments.find(p => p.id === paymentId);
      if (!payment) return;

      const newStatus = approve ? 'completed' : 'rejected';
      
      const { error } = await supabase.from('subscription_payments')
        .update({ status: newStatus })
        .eq('id', paymentId);

      if (error) throw error;

      if (approve) {
        const now = new Date();
        const paidUntil = new Date(now);
        paidUntil.setMonth(paidUntil.getMonth() + 1);

        await supabase.from('tenants')
          .update({
            paid_until: paidUntil.toISOString(),
            subscription_status: 'active'
          })
          .eq('id', payment.tenant_id);
      }

      fetchData();
      setShowPendingModal(false);
      alert(approve ? 'Pago verificado y aprobado!' : 'Pago rechazado.');
    } catch (err) {
      console.error(err);
      alert('Error al verificar pago');
    } finally {
      setVerifyingPayment(false);
    }
  };

  const viewPendingPayments = () => {
    setShowPendingModal(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentTenant) return;
    setSaving(true);
    try {
      const amount = parseFloat(paymentAmount) || 0;
      const paymentAmountNum = amount;
      const now = new Date();
      const paidUntil = new Date(now);
      paidUntil.setMonth(paidUntil.getMonth() + 1);

      const { error: paymentError } = await supabase.from('subscription_payments').insert({
        tenant_id: paymentTenant.id,
        plan_id: paymentTenant.plan_id,
        amount: paymentAmountNum,
        currency: 'ARS',
        payment_method: paymentMethod,
        status: paymentStatus,
        paid_at: paymentDate
      });

      if (paymentError) throw paymentError;

      const { error: tenantError } = await supabase.from('tenants')
        .update({
          plan_started_at: now.toISOString(),
          paid_until: paidUntil.toISOString(),
          subscription_status: paymentStatus === 'completed' ? 'active' : 'pending'
        })
        .eq('id', paymentTenant.id);

      if (tenantError) throw tenantError;

      setShowPaymentModal(false);
      fetchData();
      alert('Pago registrado exitosamente!');
    } catch (error: any) {
      console.error(error);
      alert('Error al registrar pago: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSavePlatformConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      localStorage.setItem('platform_payment_config', JSON.stringify(platformConfig));
      setShowConfigModal(false);
      alert('Configuración guardada!');
    } catch (error: any) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getDaysRemaining = (paidUntil: string | null) => {
    if (!paidUntil) return 0;
    const now = new Date();
    const diff = new Date(paidUntil).getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  // PLAN CRUD HANDLERS
  const handleOpenPlanModal = (p: any = null) => {
    if (p) {
      setSelectedPlan(p);
      setPlanFormData({
        nombre: p.nombre,
        precio_mensual: String(p.precio_mensual || p.monthly_price || 0),
        features: p.features ? Object.keys(p.features).join(', ') : ''
      });
    } else {
      setSelectedPlan(null);
      setPlanFormData({
        nombre: '',
        precio_mensual: '',
        features: 'online_store, basic_reports, unlimited_products'
      });
    }
    setShowPlanModal(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planFormData.nombre || !planFormData.precio_mensual) {
      alert('Por favor completa los campos requeridos.');
      return;
    }
    setSaving(true);

    try {
      // Parse features string to boolean object
      const featuresObj: Record<string, boolean> = {};
      if (planFormData.features) {
        planFormData.features.split(',').forEach(f => {
          const key = f.trim();
          if (key) featuresObj[key] = true;
        });
      }

      if (selectedPlan) {
        // Update
        const { error } = await supabase.from('plans')
          .update({
            nombre: planFormData.nombre,
            name: planFormData.nombre,
            precio_mensual: parseInt(planFormData.precio_mensual) || 0,
            monthly_price: parseInt(planFormData.precio_mensual) || 0,
            features: featuresObj
          })
          .eq('id', selectedPlan.id);

        if (error) throw error;
      } else {
        // Create
        const { error } = await supabase.from('plans')
          .insert({
            nombre: planFormData.nombre,
            name: planFormData.nombre,
            precio_mensual: parseInt(planFormData.precio_mensual) || 0,
            monthly_price: parseInt(planFormData.precio_mensual) || 0,
            features: featuresObj
          });

        if (error) throw error;
      }

      setShowPlanModal(false);
      fetchData();
    } catch (error: any) {
      console.error(error);
      alert('Error al guardar el plan: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePlan = async (planIdToDelete: string) => {
    if (!confirm('¿Estás seguro de eliminar este plan? Las tiendas asociadas quedarán sin plan.')) return;
    setSaving(true);
    try {
      // First clear the plan_id for tenants that use it
      await supabase.from('tenants')
        .update({ plan_id: null })
        .eq('plan_id', planIdToDelete);

      // Then delete the plan
      const { error } = await supabase.from('plans')
        .delete()
        .eq('id', planIdToDelete);

      if (error) throw error;
      fetchData();
    } catch (error: any) {
      console.error(error);
      alert('Error al eliminar el plan: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-zinc-500 font-bold uppercase tracking-widest text-xs gap-3">
        <span className="material-symbols-outlined text-4xl animate-spin text-primary">autorenew</span>
        Cargando suscripciones...
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-white">Suscripciones & Planes</h1>
          <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">
            Gestiona los niveles de suscripción de cada Tenant
          </p>
        </div>
        {pendingPayments.length > 0 && (
          <button
            onClick={viewPendingPayments}
            className="px-4 py-2 bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-xl font-bold text-xs uppercase flex items-center gap-2"
          >
            <span className="material-symbols-outlined">pending_actions</span>
            {pendingPayments.length} pago(s) pendiente(s)
          </button>
        )}
      </div>

      {/* METRICS SECTION */}
      {(() => {
        const activeTenants = tenants.filter(t => {
          const status = t.subscription_status;
          if (status === 'active') return true;
          if (status === 'pending_confirmation') return true;
          if (!t.paid_until) return false;
          return new Date(t.paid_until) > new Date();
        });
        
        const expiredTenants = tenants.filter(t => {
          const status = t.subscription_status;
          if (status === 'expired' || status === 'cancelled') return true;
          if (t.paid_until && new Date(t.paid_until) < new Date()) return true;
          return false;
        });
        
        const noPlanTenants = tenants.filter(t => !t.plan_id);
        
        const totalMonthlyRevenue = tenants.reduce((sum, t) => {
          const plan = plans.find(p => p.id === t.plan_id);
          return sum + (plan?.monthly_price || plan?.precio_mensual || 0);
        }, 0);
        
        const totalYearlyRevenue = totalMonthlyRevenue * 12;
        
        const completedPayments = pendingPayments.filter((p: any) => p.status === 'completed');
        const totalReceived = completedPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
        
        const pendingRevenue = pendingPayments.length * 15000;
        
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
            <div className="bg-zinc-900 border border-emerald-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-emerald-400">check_circle</span>
                <span className="text-[10px] text-zinc-500 font-bold uppercase">Activas</span>
              </div>
              <p className="text-2xl font-black text-white">{activeTenants.length}</p>
            </div>
            
            <div className="bg-zinc-900 border border-red-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-red-400">cancel</span>
                <span className="text-[10px] text-zinc-500 font-bold uppercase">Vencidas</span>
              </div>
              <p className="text-2xl font-black text-white">{expiredTenants.length}</p>
            </div>
            
            <div className="bg-zinc-900 border border-amber-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-amber-400">pending</span>
                <span className="text-[10px] text-zinc-500 font-bold uppercase">Pendientes</span>
              </div>
              <p className="text-2xl font-black text-white">{pendingPayments.length}</p>
            </div>
            
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-zinc-400">block</span>
                <span className="text-[10px] text-zinc-500 font-bold uppercase">Sin Plan</span>
              </div>
              <p className="text-2xl font-black text-white">{noPlanTenants.length}</p>
            </div>
            
            <div className="bg-zinc-900 border border-blue-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-blue-400">trending_up</span>
                <span className="text-[10px] text-zinc-500 font-bold uppercase">Ingreso Mensual</span>
              </div>
              <p className="text-xl font-black text-white">${totalMonthlyRevenue.toLocaleString()}</p>
            </div>
            
            <div className="bg-zinc-900 border border-violet-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-violet-400">account_balance</span>
                <span className="text-[10px] text-zinc-500 font-bold uppercase">Total Recibido</span>
              </div>
              <p className="text-xl font-black text-white">${totalReceived.toLocaleString()}</p>
            </div>
          </div>
);
      })()}

      <div className="grid grid-cols-1 gap-8 mb-12">
        {/* SECTION 1: Tenant Subscriptions */}
        <div className="bg-zinc-900 border border-white/5 rounded-xl overflow-hidden shadow-2xl flex flex-col">
          <div className="p-6 border-b border-white/5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-white">Estado de Suscripciones</h3>
              <div className="flex gap-1">
                <button
                  onClick={() => setFilterTab('all')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase ${filterTab === 'all' ? 'bg-violet-500/20 text-violet-400' : 'text-zinc-500 hover:text-white'}`}
                >
                  Todas
                </button>
                <button
                  onClick={() => setFilterTab('active')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase ${filterTab === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-500 hover:text-white'}`}
                >
                  Activas
                </button>
                <button
                  onClick={() => setFilterTab('expired')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase ${filterTab === 'expired' ? 'bg-red-500/20 text-red-400' : 'text-zinc-500 hover:text-white'}`}
                >
                  Vencidas
                </button>
                <button
                  onClick={() => setFilterTab('pending')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase ${filterTab === 'pending' ? 'bg-amber-500/20 text-amber-400' : 'text-zinc-500 hover:text-white'}`}
                >
                  Pendientes
                </button>
              </div>
            </div>
            <button
              onClick={() => setShowPaymentsModal(true)}
              className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-[10px] font-bold uppercase text-zinc-400 flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">history</span>
              Historial
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 bg-white/5">
                  <th className="py-3 px-6 text-[10px] font-black uppercase tracking-widest text-zinc-500">Tenant</th>
                  <th className="py-3 px-6 text-[10px] font-black uppercase tracking-widest text-zinc-500">Plan Actual</th>
                  <th className="py-3 px-6 text-[10px] font-black uppercase tracking-widest text-zinc-500">Precio Mensual</th>
                  <th className="py-3 px-6 text-[10px] font-black uppercase tracking-widest text-zinc-500">Estado del SaaS</th>
                  <th className="py-3 px-6 text-right text-[10px] font-black uppercase tracking-widest text-zinc-500">Acciones</th>
                </tr>
              </thead>
<tbody className="divide-y divide-white/5">
                {(() => {
                  const filteredTenants = tenants.filter(t => {
                    const status = t.subscription_status;
                    const isActive = status === 'active' || status === 'pending_confirmation' || (t.paid_until && new Date(t.paid_until) > new Date());
                    const isExpired = status === 'expired' || status === 'cancelled' || (t.paid_until && new Date(t.paid_until) < new Date());
                    const isPending = status === 'pending_confirmation';
                    
                    switch (filterTab) {
                      case 'active': return isActive && !isPending;
                      case 'expired': return isExpired;
                      case 'pending': return isPending;
                      default: return true;
                    }
                  });
                  
                  if (filteredTenants.length === 0) {
                    return (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-zinc-500 text-xs font-bold uppercase">
                          No hay suscripciones en este filtro
                        </td>
                      </tr>
                    );
                  }
                  
                  return filteredTenants.map((t, i) => {
                    const plan = plans.find(p => p.id === t.plan_id);
                    return (
                      <tr key={t.id || i} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="py-4 px-6">
                          <span className="text-xs font-bold text-white">{t.nombre}</span>
                        </td>
                        <td className="py-4 px-6 text-[10px] font-black text-violet-400 uppercase tracking-widest">{plan ? plan.nombre : 'Sin Plan'}</td>
                        <td className="py-4 px-6 text-xs text-zinc-300">
                          {plan ? `$${(plan.monthly_price || plan.precio_mensual || 0).toLocaleString()}` : '-'}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${t.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'}`}>
                            {t.status || 'active'}
                          </span>
                          {t.paid_until && (
                            <span className="ml-2 text-[9px] text-zinc-500">
                              {getDaysRemaining(t.paid_until)} días
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenPaymentModal(t)}
                              className="p-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-xl transition-all"
                              title="Registrar Pago"
                            >
                              <span className="material-symbols-outlined text-[18px]">payments</span>
                            </button>
                            <button
                              onClick={() => handleOpenEditModal(t)}
                              className="p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                              title="Editar Plan"
                            >
                              <span className="material-symbols-outlined text-[18px]">edit</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 2: System Subscription Plans */}
        <div className="bg-zinc-900 border border-white/5 rounded-xl overflow-hidden shadow-2xl flex flex-col">
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-white">Tipos de Suscripción (Planes)</h3>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">
                Define las opciones de suscripción disponibles para las tiendas
              </p>
            </div>
            <button
              onClick={() => handleOpenPlanModal()}
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Crear Plan
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 bg-white/5">
                  <th className="py-3 px-6 text-[10px] font-black uppercase tracking-widest text-zinc-500">Plan</th>
                  <th className="py-3 px-6 text-[10px] font-black uppercase tracking-widest text-zinc-500">Precio Mensual</th>
                  <th className="py-3 px-6 text-[10px] font-black uppercase tracking-widest text-zinc-500">Funcionalidades</th>
                  <th className="py-3 px-6 text-right text-[10px] font-black uppercase tracking-widest text-zinc-500">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {plans.map((p, i) => (
                  <tr key={p.id || i} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="py-4 px-6">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">{p.nombre}</span>
                    </td>
                    <td className="py-4 px-6 text-xs text-emerald-400 font-black">
                      ${p.precio_mensual.toLocaleString()}
                    </td>
                    <td className="py-4 px-6 text-xs text-zinc-300">
                      <div className="flex flex-wrap gap-1">
                        {p.features && Object.keys(p.features).map((feat, fi) => (
                          <span key={fi} className="px-2 py-0.5 rounded-full text-[9px] bg-white/5 border border-white/10 font-bold uppercase tracking-tighter text-zinc-400">
                            {feat}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenPlanModal(p)}
                        className="p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      <button
                        onClick={() => handleDeletePlan(p.id)}
                        className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Subscription Modal */}
      {showEditModal && selectedTenant && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <form onSubmit={handleUpdateSubscription} className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-md p-6 overflow-hidden shadow-2xl flex flex-col gap-6 relative">
            <button 
              type="button"
              onClick={() => setShowEditModal(false)}
              className="absolute right-4 top-4 p-2 text-zinc-500 hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>

            <div>
              <h3 className="text-lg font-black tracking-wider uppercase text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">payments</span>
                Cambiar Plan
              </h3>
              <p className="text-zinc-500 text-xs font-black uppercase tracking-widest mt-1">
                Asigna un plan de suscripción diferente a {selectedTenant.nombre}
              </p>
            </div>

            <div>
              <label className="block text-zinc-400 text-xs font-black uppercase tracking-widest mb-1">Plan SaaS</label>
              <select
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
              >
                <option value="">Sin Plan</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre} - ${p.precio_mensual.toLocaleString()}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-5 py-3 bg-zinc-900 border border-white/10 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all font-bold text-xs font-black uppercase tracking-wider"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-5 py-3 bg-primary text-white rounded-xl hover:bg-primary-hover transition-all font-bold text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <span className="material-symbols-outlined text-sm animate-spin">autorenew</span>
                ) : (
                  <span className="material-symbols-outlined text-sm">check</span>
                )}
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CREATE OR EDIT PLAN MODAL */}
      {showPlanModal && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <form onSubmit={handleSavePlan} className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-md p-6 overflow-hidden shadow-2xl flex flex-col gap-6 relative">
            <button 
              type="button"
              onClick={() => setShowPlanModal(false)}
              className="absolute right-4 top-4 p-2 text-zinc-500 hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>

            <div>
              <h3 className="text-lg font-black tracking-wider uppercase text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">loyalty</span>
                {selectedPlan ? 'Editar Plan de Suscripción' : 'Nuevo Plan de Suscripción'}
              </h3>
              <p className="text-zinc-500 text-xs font-black uppercase tracking-widest mt-1">
                Define el nombre, precio mensual y funcionalidades del plan
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-zinc-400 text-xs font-black uppercase tracking-widest mb-1">Nombre del Plan *</label>
                <input
                  type="text"
                  required
                  value={planFormData.nombre}
                  onChange={(e) => setPlanFormData({ ...planFormData, nombre: e.target.value })}
                  placeholder="Ej: Plan Enterprise"
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                />
              </div>

              <div>
                <label className="block text-zinc-400 text-xs font-black uppercase tracking-widest mb-1">Precio Mensual ($) *</label>
                <input
                  type="number"
                  required
                  value={planFormData.precio_mensual}
                  onChange={(e) => setPlanFormData({ ...planFormData, precio_mensual: e.target.value })}
                  placeholder="Ej: 99"
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                />
              </div>

              <div>
                <label className="block text-zinc-400 text-xs font-black uppercase tracking-widest mb-1">Funcionalidades (Separadas por coma)</label>
                <input
                  type="text"
                  value={planFormData.features}
                  onChange={(e) => setPlanFormData({ ...planFormData, features: e.target.value })}
                  placeholder="Ej: online_store, basic_reports"
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowPlanModal(false)}
                className="flex-1 px-5 py-3 bg-zinc-900 border border-white/10 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all font-bold text-xs font-black uppercase tracking-wider"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-5 py-3 bg-primary text-white rounded-xl hover:bg-primary-hover transition-all font-bold text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <span className="material-symbols-outlined text-sm animate-spin">autorenew</span>
                ) : (
                  <span className="material-symbols-outlined text-sm">check</span>
                )}
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PAYMENT MODAL */}
      {showPaymentModal && paymentTenant && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <form onSubmit={handleRecordPayment} className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-md p-6 overflow-hidden shadow-2xl flex flex-col gap-6 relative">
            <button 
              type="button"
              onClick={() => setShowPaymentModal(false)}
              className="absolute right-4 top-4 p-2 text-zinc-500 hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>

            <div>
              <h3 className="text-lg font-black tracking-wider uppercase text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-400">payments</span>
                Registrar Pago
              </h3>
              <p className="text-zinc-500 text-xs font-black uppercase tracking-widest mt-1">
                {paymentTenant.nombre}
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-zinc-400 text-xs font-black uppercase tracking-widest mb-1">Monto ($) *</label>
                <input
                  type="number"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Ej: 15000"
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                />
              </div>

              <div>
                <label className="block text-zinc-400 text-xs font-black uppercase tracking-widest mb-1">Método de Pago</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('transferencia')}
                    className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${paymentMethod === 'transferencia' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-zinc-900 border border-white/10 text-zinc-400'}`}
                  >
                    <span className="material-symbols-outlined text-sm mr-1">account_balance</span>
                    Transferencia
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('mp')}
                    className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${paymentMethod === 'mp' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-zinc-900 border border-white/10 text-zinc-400'}`}
                  >
                    <span className="material-symbols-outlined text-sm mr-1">payment</span>
                    MP
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('efectivo')}
                    className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${paymentMethod === 'efectivo' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-zinc-900 border border-white/10 text-zinc-400'}`}
                  >
                    <span className="material-symbols-outlined text-sm mr-1">payments</span>
                    Efectivo
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 text-xs font-black uppercase tracking-widest mb-1">Fecha de Pago</label>
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                />
              </div>

              <div>
                <label className="block text-zinc-400 text-xs font-black uppercase tracking-widest mb-1">Estado</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentStatus('completed')}
                    className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${paymentStatus === 'completed' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-zinc-900 border border-white/10 text-zinc-400'}`}
                  >
                    Completado
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentStatus('pending')}
                    className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${paymentStatus === 'pending' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-zinc-900 border border-white/10 text-zinc-400'}`}
                  >
                    Pendiente
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 px-5 py-3 bg-zinc-900 border border-white/10 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all font-bold text-xs font-black uppercase tracking-wider"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-5 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-400 transition-all font-bold text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <span className="material-symbols-outlined text-sm animate-spin">autorenew</span>
                ) : (
                  <span className="material-symbols-outlined text-sm">check</span>
                )}
                {saving ? 'Guardando...' : 'Registrar'}
</button>
            </div>
          </form>
        </div>
      )}

      {showPaymentsModal && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-lg font-black text-white uppercase flex items-center gap-2">
                <span className="material-symbols-outlined text-violet-400">history</span>
                Historial de Pagos
              </h3>
              <button onClick={() => setShowPaymentsModal(false)} className="p-2 text-zinc-400 hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {allPayments.length === 0 ? (
                <p className="text-zinc-500 text-center py-8">No hay pagos registrados</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="py-3 px-4 text-[10px] font-black uppercase text-zinc-500">Tienda</th>
                        <th className="py-3 px-4 text-[10px] font-black uppercase text-zinc-500">Monto</th>
                        <th className="py-3 px-4 text-[10px] font-black uppercase text-zinc-500">Método</th>
                        <th className="py-3 px-4 text-[10px] font-black uppercase text-zinc-500">Estado</th>
                        <th className="py-3 px-4 text-[10px] font-black uppercase text-zinc-500">Fecha</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {allPayments.map((payment) => {
                        const tenant = tenants.find(t => t.id === payment.tenant_id);
                        return (
                          <tr key={payment.id} className="hover:bg-white/[0.02]">
                            <td className="py-3 px-4 text-xs font-bold text-white">{tenant?.nombre || 'Desconocido'}</td>
                            <td className="py-3 px-4 text-xs text-zinc-300">${payment.amount?.toLocaleString() || 0}</td>
                            <td className="py-3 px-4 text-[10px] font-black uppercase text-zinc-500">{payment.payment_method || 'transferencia'}</td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${payment.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : payment.status === 'rejected' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                {payment.status === 'completed' ? 'Aprobado' : payment.status === 'rejected' ? 'Rechazado' : 'Pendiente'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-[10px] text-zinc-500">
                              {payment.paid_at ? new Date(payment.paid_at).toLocaleDateString('es-AR') : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
