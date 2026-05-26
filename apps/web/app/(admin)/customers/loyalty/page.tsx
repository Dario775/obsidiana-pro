'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/hooks/use-tenant';

interface Customer {
  id: string;
  email: string;
  nombre: string | null;
  phone: string | null;
  dni_cuit: string | null;
  first_name: string | null;
  last_name: string | null;
  accepts_marketing: boolean;
  credit_limit: number;
  created_at: string;
}

interface LoyaltyConfig {
  pointsPerArsSpent: number; // e.g. 1 point for every X pesos spent
  arsPerPointRedeemed: number; // e.g. 1 point = Y pesos discount
  minPointsToRedeem: number; // e.g. minimum points required to redeem
}

interface PointTransaction {
  id: string;
  customerId: string;
  customerName: string;
  amount: number; // positive for earned, negative for redeemed
  type: 'earn' | 'redeem' | 'adjust';
  reason: string;
  date: string;
}

const DEFAULT_CONFIG: LoyaltyConfig = {
  pointsPerArsSpent: 100,
  arsPerPointRedeemed: 5,
  minPointsToRedeem: 100
};

export default function LoyaltyPage() {
  const { tenant } = useTenant();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Program Config state
  const [config, setConfig] = useState<LoyaltyConfig>(DEFAULT_CONFIG);
  const [isConfigSaving, setIsConfigSaving] = useState(false);
  const [showConfigSuccess, setShowConfigSuccess] = useState(false);
  
  // Real DB-backed points balances
  const [customerPointsMap, setCustomerPointsMap] = useState<Record<string, number>>({});
  
  // Real DB-backed points history
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  
  // Adjustment Modal state
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<number>(100);
  const [adjustType, setAdjustType] = useState<'add' | 'subtract'>('add');
  const [adjustReason, setAdjustReason] = useState('Regalo de Bienvenida / Atención al Cliente');
  const [isSavingAdjustment, setIsSavingAdjustment] = useState(false);

  useEffect(() => {
    if (tenant?.id) {
      fetchCustomersAndLoyaltyData();
    }
  }, [tenant]);

  async function fetchCustomersAndLoyaltyData() {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      // 1. Fetch Customers
      const { data: custData, error: custError } = await supabase
        .from('customers')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: false });

      if (custError) throw custError;
      const customersList = custData || [];
      setCustomers(customersList);

      // 2. Fetch Loyalty Settings
      const { data: configData, error: configError } = await supabase
        .from('loyalty_settings')
        .select('*')
        .eq('tenant_id', tenant.id)
        .maybeSingle();

      if (!configError && configData) {
        setConfig({
          pointsPerArsSpent: Number(configData.points_per_ars_spent),
          arsPerPointRedeemed: Number(configData.ars_per_point_redeemed),
          minPointsToRedeem: Number(configData.min_points_to_redeem)
        });
      } else {
        setConfig(DEFAULT_CONFIG);
      }

      // 3. Fetch Customer Loyalty Balances
      const { data: balData, error: balError } = await supabase
        .from('customer_loyalty_balances')
        .select('*')
        .eq('tenant_id', tenant.id);

      const pointsMap: Record<string, number> = {};
      
      // Initialize everyone to 0 points initially
      customersList.forEach(c => {
        pointsMap[c.id] = 0;
      });

      if (!balError && balData) {
        balData.forEach((row: any) => {
          pointsMap[row.customer_id] = Number(row.points_balance);
        });
      }
      setCustomerPointsMap(pointsMap);

      // 4. Fetch Loyalty Transactions
      const { data: txData, error: txError } = await supabase
        .from('loyalty_transactions')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: false });

      if (!txError && txData) {
        const mappedTxList: PointTransaction[] = txData.map((row: any) => {
          const client = customersList.find(c => c.id === row.customer_id);
          const clientName = client 
            ? `${client.first_name || ''} ${client.last_name || ''}`.trim() || client.nombre || client.email
            : 'Cliente no encontrado';

          return {
            id: row.id,
            customerId: row.customer_id,
            customerName: clientName,
            amount: Number(row.amount),
            type: row.type as PointTransaction['type'],
            reason: row.reason,
            date: row.created_at
          };
        });
        setTransactions(mappedTxList);
      } else {
        setTransactions([]);
      }

    } catch (err) {
      console.error('Error fetching loyalty program data:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant?.id) return;
    setIsConfigSaving(true);
    
    try {
      const { error } = await supabase
        .from('loyalty_settings')
        .upsert({
          tenant_id: tenant.id,
          points_per_ars_spent: config.pointsPerArsSpent,
          ars_per_point_redeemed: config.arsPerPointRedeemed,
          min_points_to_redeem: config.minPointsToRedeem,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      
      setShowConfigSuccess(true);
      setTimeout(() => setShowConfigSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error saving loyalty configuration in DB:', err);
      alert('Error al guardar configuración: ' + err.message);
    } finally {
      setIsConfigSaving(false);
    }
  };

  const handleAdjustPointsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant?.id || !selectedCustomer) return;

    setIsSavingAdjustment(true);
    try {
      const currentPoints = customerPointsMap[selectedCustomer.id] || 0;
      const finalAmount = adjustType === 'add' ? adjustAmount : -adjustAmount;
      const newPoints = Math.max(0, currentPoints + finalAmount);

      // 1. Insert point ledger transaction
      const { error: txError } = await supabase
        .from('loyalty_transactions')
        .insert({
          tenant_id: tenant.id,
          customer_id: selectedCustomer.id,
          amount: finalAmount,
          type: 'adjust',
          reason: adjustReason.trim() || 'Ajuste manual de puntos en cuenta'
        });

      if (txError) throw txError;

      // 2. Upsert customer point balance
      const { error: balError } = await supabase
        .from('customer_loyalty_balances')
        .upsert({
          customer_id: selectedCustomer.id,
          tenant_id: tenant.id,
          points_balance: newPoints,
          updated_at: new Date().toISOString()
        });

      if (balError) throw balError;

      // 3. Refresh display states
      await fetchCustomersAndLoyaltyData();

      setShowAdjustModal(false);
      setSelectedCustomer(null);
      setAdjustReason('Regalo de Bienvenida / Atención al Cliente');
      setAdjustAmount(100);
      alert('Puntos ajustados y guardados en Supabase Cloud.');
    } catch (err: any) {
      console.error('Error executing points adjustment in Supabase:', err);
      alert('Error de persistencia en base de datos: ' + err.message);
    } finally {
      setIsSavingAdjustment(false);
    }
  };

  // Tiers calculation helper
  const getCustomerTier = (points: number) => {
    if (points >= 1500) return { name: 'Diamante', icon: 'diamond', color: 'text-fuchsia-400', badge: 'bg-fuchsia-500/10 border-fuchsia-500/20 text-fuchsia-400' };
    if (points >= 500) return { name: 'Oro', icon: 'military_tech', color: 'text-amber-400', badge: 'bg-amber-500/10 border-amber-500/20 text-amber-400' };
    if (points >= 100) return { name: 'Plata', icon: 'grade', color: 'text-zinc-300', badge: 'bg-zinc-400/10 border-zinc-400/20 text-zinc-300' };
    return { name: 'Bronce', icon: 'star', color: 'text-amber-700', badge: 'bg-amber-800/10 border-amber-800/20 text-amber-600' };
  };

  // Customers Leaderboard list mapped with their loyalty balances
  const customersLeaderboard = useMemo(() => {
    const list = customers.map(c => ({
      ...c,
      points: customerPointsMap[c.id] || 0
    }));

    // Sort by points desc
    list.sort((a, b) => b.points - a.points);

    // Apply search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return list.filter(c => {
        const name = `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase();
        return name.includes(q) || c.email?.toLowerCase()?.includes(q) || c.dni_cuit?.toLowerCase()?.includes(q);
      });
    }

    return list;
  }, [customers, customerPointsMap, searchQuery]);

  // General statistics computation
  const stats = useMemo(() => {
    const issued = transactions.reduce((acc, tx) => acc + (tx.amount > 0 ? tx.amount : 0), 0) + 
      Object.values(customerPointsMap).reduce((a, b) => a + b, 0); // Include balance sum
    
    const redeemed = Math.abs(transactions.reduce((acc, tx) => acc + (tx.amount < 0 ? tx.amount : 0), 0));
    
    const activeMembers = Object.values(customerPointsMap).filter(pts => pts > 0).length;
    const activePct = customers.length > 0 ? Math.round((activeMembers / customers.length) * 100) : 0;
    
    const conversionRate = issued > 0 ? Math.round((redeemed / issued) * 100) : 0;

    return {
      issued,
      redeemed,
      activeMembers,
      activePct,
      conversionRate
    };
  }, [customerPointsMap, transactions, customers]);

  const getInitials = (customer: Customer): string => {
    const first = customer.first_name?.[0] || customer.nombre?.[0] || '';
    const last = customer.last_name?.[0] || '';
    return (first + last).toUpperCase() || customer.email?.[0]?.toUpperCase() || '?';
  };

  return (
    <div className="max-w-[1440px] mx-auto flex flex-col gap-8 pb-32">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-zinc-400 font-label-md text-xs mb-2 uppercase tracking-widest">
            <span className="text-amber-400 font-black">CRM</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span>Programa de Fidelización</span>
          </div>
          <h1 className="font-headline-xl text-3xl font-black text-white mb-1">Fidelización y Puntos</h1>
          <p className="text-zinc-400 font-body-sm text-sm max-w-2xl">
            Incentiva la recurrencia premiando a tus clientes con puntos por cada compra en el POS, canjeables por descuentos en caja.
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-[#1A1A1A] border border-white/10 rounded-xl p-6 flex flex-col justify-between hover:border-amber-500/20 transition-all relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <span className="material-symbols-outlined text-6xl text-amber-500">monetization_on</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-500 mb-4 uppercase tracking-[0.2em] font-black text-[10px]">
            <span className="material-symbols-outlined text-lg text-amber-400 animate-pulse">monetization_on</span>
            Puntos Emitidos
          </div>
          <div>
            <div className="font-data-tabular text-3xl font-black text-white">{stats.issued.toLocaleString()} pts</div>
            <div className="text-[10px] text-zinc-500 mt-2 font-bold uppercase tracking-wider">
              Acumulados en compras del POS
            </div>
          </div>
        </div>

        <div className="bg-[#1A1A1A] border border-white/10 rounded-xl p-6 flex flex-col justify-between hover:border-violet-500/20 transition-all relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <span className="material-symbols-outlined text-6xl text-violet-500">local_mall</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-500 mb-4 uppercase tracking-[0.2em] font-black text-[10px]">
            <span className="material-symbols-outlined text-lg text-violet-400">redeem</span>
            Puntos Canjeados
          </div>
          <div>
            <div className="font-data-tabular text-3xl font-black text-white">{stats.redeemed.toLocaleString()} pts</div>
            <div className="text-[10px] text-emerald-400 mt-2 font-bold uppercase tracking-wider">
              Ahorro total: ${(stats.redeemed * config.arsPerPointRedeemed).toLocaleString('es-AR')}
            </div>
          </div>
        </div>

        <div className="bg-[#1A1A1A] border border-white/10 rounded-xl p-6 flex flex-col justify-between hover:border-emerald-500/20 transition-all relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <span className="material-symbols-outlined text-6xl text-emerald-500">percent</span>
          </div>
          <div className="flex items-center gap-2 text-zinc-500 mb-4 uppercase tracking-[0.2em] font-black text-[10px]">
            <span className="material-symbols-outlined text-lg text-emerald-400">percent</span>
            Tasa de Canje (Redemption)
          </div>
          <div>
            <div className="font-data-tabular text-3xl font-black text-white">{stats.conversionRate}%</div>
            <div className="text-[10px] text-zinc-500 mt-2 font-bold uppercase tracking-wider">
              Puntos redimidos vs. emitidos
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#1A1A1A] to-[#2E1F1A] border border-amber-600/30 rounded-xl p-6 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <span className="material-symbols-outlined text-6xl text-amber-600">workspace_premium</span>
          </div>
          <div className="flex items-center gap-2 text-amber-400 mb-4 uppercase tracking-[0.2em] font-black text-[10px] relative z-10">
            <span className="material-symbols-outlined text-lg">workspace_premium</span>
            Club de Clientes
          </div>
          <div className="relative z-10">
            <div className="font-data-tabular text-3xl font-black text-white">{stats.activePct}%</div>
            <div className="text-[10px] text-zinc-500 font-black uppercase tracking-wider mt-2">
              {stats.activeMembers} de {customers.length} con puntos acumulados
            </div>
          </div>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left column: Leaderboard & Recent Timeline */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Leaderboard Table */}
          <div className="bg-[#1A1A1A] border border-white/10 rounded-xl p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-xs font-black uppercase tracking-wider text-white">🏆 Ranking de Puntos y Categorías</h2>
                <p className="text-[10px] text-zinc-500 font-medium mt-0.5">Cartera de clientes ordenada por puntos con sus categorías de fidelidad.</p>
              </div>

              <div className="flex items-center gap-2 px-3 py-1 bg-zinc-900 rounded-xl border border-white/5 focus-within:border-amber-500/40 transition-all w-full sm:w-64">
                <span className="material-symbols-outlined text-zinc-500 text-[18px]">search</span>
                <input
                  className="bg-transparent border-none outline-none text-xs text-white w-full placeholder:text-zinc-600 focus:ring-0 py-1.5"
                  placeholder="Buscar cliente..."
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="border border-white/5 rounded-xl overflow-hidden bg-zinc-950/40">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-[#1E1E1E]/50">
                    <th className="py-3 px-5 text-[9px] text-zinc-500 uppercase tracking-[0.2em] font-black">Cliente / ID</th>
                    <th className="py-3 px-5 text-[9px] text-zinc-500 uppercase tracking-[0.2em] font-black text-center">Categoría (Tier)</th>
                    <th className="py-3 px-5 text-[9px] text-zinc-500 uppercase tracking-[0.2em] font-black text-center">Puntos Acumulados</th>
                    <th className="py-3 px-5 text-[9px] text-zinc-500 uppercase tracking-[0.2em] font-black text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-data-tabular text-xs text-white">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="py-14 text-center text-zinc-500 font-black uppercase tracking-widest animate-pulse">
                        Cargando ranking de clientes...
                      </td>
                    </tr>
                  ) : customersLeaderboard.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-14 text-center text-zinc-500 font-black uppercase tracking-widest">
                        Ningún cliente encontrado
                      </td>
                    </tr>
                  ) : (
                    customersLeaderboard.map((customer) => {
                      const tier = getCustomerTier(customer.points);
                      return (
                        <tr key={customer.id} className="hover:bg-white/[0.01] transition-colors group">
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-black text-[10px]">
                                {getInitials(customer)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-white font-bold truncate group-hover:text-amber-400 transition-colors">
                                  {customer.first_name || customer.nombre ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() : 'Sin nombre'}
                                </p>
                                <p className="text-zinc-500 text-[9px] truncate font-medium mt-0.5">{customer.email}</p>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-5 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${tier.badge}`}>
                              <span className="material-symbols-outlined text-[12px]">{tier.icon}</span>
                              {tier.name}
                            </span>
                          </td>

                          <td className="py-3.5 px-5 text-center font-black text-sm">
                            <span className={customer.points > 0 ? 'text-amber-400' : 'text-zinc-500'}>
                              {customer.points.toLocaleString()} <span className="text-[10px] font-semibold text-zinc-500">pts</span>
                            </span>
                          </td>

                          <td className="py-3.5 px-5 text-right">
                            <button
                              onClick={() => {
                                setSelectedCustomer(customer);
                                setShowAdjustModal(true);
                              }}
                              className="px-3 py-1.5 bg-zinc-900 hover:bg-white/5 border border-white/10 hover:text-white text-zinc-400 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors active:scale-95"
                            >
                              Ajustar
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Points Ledger timeline */}
          <div className="bg-[#1A1A1A] border border-white/10 rounded-xl p-6 shadow-2xl flex flex-col gap-4">
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-white">📜 Registro Reciente de Movimientos</h2>
              <p className="text-[10px] text-zinc-500 font-medium mt-0.5">Auditoría en tiempo real de puntos emitidos, canjeados y ajustes manuales.</p>
            </div>

            <div className="flex flex-col divide-y divide-white/5 font-inter">
              {transactions.length === 0 ? (
                <div className="py-8 text-center text-zinc-600 font-black uppercase tracking-widest text-[10px]">
                  No se registran transacciones de puntos todavía en Supabase Cloud.
                </div>
              ) : (
                transactions.slice(0, 10).map((tx) => {
                  const isEarn = tx.amount > 0;
                  return (
                    <div key={tx.id} className="py-3 flex items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 flex items-center justify-center ${
                          tx.type === 'earn' ? 'bg-emerald-500/10 text-emerald-400' :
                          tx.type === 'redeem' ? 'bg-rose-500/10 text-rose-400' :
                          'bg-violet-500/10 text-violet-400'
                        }`}>
                          <span className="material-symbols-outlined text-[18px]">
                            {tx.type === 'earn' ? 'add_shopping_cart' :
                             tx.type === 'redeem' ? 'sell' : 'tune'}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white leading-normal">
                            {tx.customerName}
                          </p>
                          <p className="text-[10px] text-zinc-500 font-semibold leading-normal mt-0.5">
                            {tx.reason}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className={`text-xs font-black ${isEarn ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isEarn ? `+${tx.amount.toLocaleString()}` : tx.amount.toLocaleString()} pts
                        </div>
                        <span className="text-[9px] text-zinc-600 font-semibold block mt-0.5 text-right">
                          {new Intl.DateTimeFormat('es-AR', {
                            hour: '2-digit',
                            minute: '2-digit',
                            day: 'numeric',
                            month: 'short'
                          }).format(new Date(tx.date))}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right column: Program Configuration Settings */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="text-xs font-black uppercase tracking-widest text-zinc-500 px-1">
            Parámetros del Programa
          </div>

          <div className="bg-[#1A1A1A] border border-white/10 rounded-xl p-6 shadow-2xl flex flex-col gap-5">
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-white">⚙️ Reglas de Conversión</h2>
              <p className="text-[10px] text-zinc-500 font-medium mt-0.5">Define las equivalencias de acumulación y valor de canje para el POS.</p>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black uppercase tracking-wider text-zinc-400">Regla de Acumulación</label>
                <div className="flex items-center gap-2 px-3 py-1 bg-zinc-900 rounded-xl border border-white/10 focus-within:border-amber-500/40 transition-all">
                  <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">$</span>
                  <input
                    type="number"
                    min="1"
                    className="bg-transparent border-none outline-none text-xs text-white w-full placeholder:text-zinc-600 focus:ring-0 py-2.5 font-bold"
                    value={config.pointsPerArsSpent}
                    onChange={(e) => setConfig({ ...config, pointsPerArsSpent: parseInt(e.target.value) || 1 })}
                  />
                  <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest shrink-0">= 1 Punto</span>
                </div>
                <p className="text-[9px] text-zinc-500 leading-normal font-medium">Ej. Si un cliente gasta $1000 sumará 10 puntos en su saldo.</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black uppercase tracking-wider text-zinc-400">Valor de Canje</label>
                <div className="flex items-center gap-2 px-3 py-1 bg-zinc-900 rounded-xl border border-white/10 focus-within:border-amber-500/40 transition-all">
                  <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest shrink-0">1 Punto =</span>
                  <input
                    type="number"
                    min="1"
                    className="bg-transparent border-none outline-none text-xs text-white w-full placeholder:text-zinc-600 focus:ring-0 py-2.5 font-bold text-right"
                    value={config.arsPerPointRedeemed}
                    onChange={(e) => setConfig({ ...config, arsPerPointRedeemed: parseInt(e.target.value) || 1 })}
                  />
                  <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">$ Descuento</span>
                </div>
                <p className="text-[9px] text-zinc-500 leading-normal font-medium">Equivalencia monetaria para descontar del ticket en el cobro del POS.</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black uppercase tracking-wider text-zinc-400">Canje Mínimo Requerido</label>
                <div className="flex items-center gap-2 px-3 py-1 bg-zinc-900 rounded-xl border border-white/10 focus-within:border-amber-500/40 transition-all">
                  <input
                    type="number"
                    min="0"
                    className="bg-transparent border-none outline-none text-xs text-white w-full placeholder:text-zinc-600 focus:ring-0 py-2.5 font-bold"
                    value={config.minPointsToRedeem}
                    onChange={(e) => setConfig({ ...config, minPointsToRedeem: parseInt(e.target.value) || 0 })}
                  />
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest shrink-0">Puntos</span>
                </div>
                <p className="text-[9px] text-zinc-500 leading-normal font-medium">Límite mínimo de puntos acumulados que debe tener un cliente para poder canjearlos.</p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isConfigSaving}
                  className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-black py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 active:scale-95"
                >
                  {isConfigSaving ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">save</span>
                      Guardar Reglas
                    </>
                  )}
                </button>

                {showConfigSuccess && (
                  <div className="mt-3 text-center text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 py-2 rounded-lg font-black uppercase tracking-wider animate-pulse">
                    ¡Configuración guardada en Supabase Cloud!
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Modal: Ajustar Puntos */}
      {showAdjustModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-[#1A1A1A] border-b border-white/10 p-5 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black text-white uppercase tracking-wider">Ajuste de Puntos de Cliente</h2>
                <p className="text-zinc-500 text-xs mt-0.5">{selectedCustomer.first_name ? `${selectedCustomer.first_name} ${selectedCustomer.last_name || ''}`.trim() : selectedCustomer.email}</p>
              </div>
              <button
                onClick={() => {
                  setShowAdjustModal(false);
                  setSelectedCustomer(null);
                }}
                className="p-1 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleAdjustPointsSubmit} className="p-5 space-y-5">
              
              <div className="bg-zinc-950/40 p-4 border border-white/5 rounded-xl flex items-center justify-between">
                <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Saldo de Puntos Actual:</span>
                <span className="text-sm font-black text-amber-400">{(customerPointsMap[selectedCustomer.id] || 0).toLocaleString()} pts</span>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-2">Acción a realizar</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAdjustType('add')}
                    className={`py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all ${
                      adjustType === 'add'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-zinc-900 border-white/5 text-zinc-500'
                    }`}
                  >
                    Sumar Puntos
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('subtract')}
                    className={`py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all ${
                      adjustType === 'subtract'
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        : 'bg-zinc-900 border-white/5 text-zinc-500'
                    }`}
                  >
                    Restar Puntos
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-2">Cantidad de Puntos *</label>
                <input
                  type="number"
                  required
                  min="1"
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-bold focus:outline-none"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(Math.max(1, parseInt(e.target.value) || 1))}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-2">Motivo o Concepto de Ajuste *</label>
                <input
                  type="text"
                  required
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-semibold focus:outline-none placeholder:text-zinc-600"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Ej. Regalo especial de atención al cliente"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdjustModal(false);
                    setSelectedCustomer(null);
                  }}
                  className="flex-1 py-3 bg-zinc-900 border border-white/10 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all font-bold text-xs uppercase tracking-wider"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingAdjustment}
                  className={`flex-1 py-3 text-black rounded-xl transition-all font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 ${
                    adjustType === 'add' 
                      ? 'bg-emerald-400 hover:bg-emerald-300' 
                      : 'bg-rose-400 hover:bg-rose-300'
                  }`}
                >
                  {isSavingAdjustment ? (
                    <>
                      <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">save</span>
                      Confirmar Ajuste
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
