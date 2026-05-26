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

interface Segment {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: 'violet' | 'emerald' | 'amber' | 'rose' | 'blue';
  rule_type: 'all' | 'vip' | 'debtors' | 'marketing' | 'has_phone' | 'custom';
  custom_rule?: {
    field: 'credit_limit' | 'accepts_marketing' | 'phone';
    operator: 'gt' | 'eq' | 'neq';
    value: any;
  } | null;
  tenant_id?: string;
  created_at?: string;
}

const SYSTEM_SEGMENTS: Segment[] = [
  {
    id: 'sys-all',
    name: 'Todos los Clientes',
    description: 'Toda la cartera de clientes de la tienda sin exclusiones.',
    icon: 'group',
    color: 'blue',
    rule_type: 'all'
  },
  {
    id: 'sys-vip',
    name: 'Clientes VIP',
    description: 'Clientes destacados con límite de crédito asignado mayor o igual a $20,000.',
    icon: 'star',
    color: 'violet',
    rule_type: 'vip'
  },
  {
    id: 'sys-debtors',
    name: 'Cuentas Corrientes Activas',
    description: 'Clientes con cuentas habilitadas para compras a crédito en el POS.',
    icon: 'account_balance',
    color: 'amber',
    rule_type: 'debtors'
  },
  {
    id: 'sys-marketing',
    name: 'Suscritos a Novedades',
    description: 'Clientes que aceptaron recibir campañas y boletines de marketing.',
    icon: 'campaign',
    color: 'emerald',
    rule_type: 'marketing'
  },
  {
    id: 'sys-phone',
    name: 'Contactos por WhatsApp',
    description: 'Clientes con número telefónico registrado para envíos rápidos.',
    icon: 'chat',
    color: 'emerald',
    rule_type: 'has_phone'
  }
];

export default function SegmentsPage() {
  const { tenant } = useTenant();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Custom segments fetched from Supabase
  const [dbSegments, setDbSegments] = useState<Segment[]>([]);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>('sys-all');
  
  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSegmentName, setNewSegmentName] = useState('');
  const [newSegmentDesc, setNewSegmentDesc] = useState('');
  const [newSegmentColor, setNewSegmentColor] = useState<Segment['color']>('violet');
  const [newSegmentIcon, setNewSegmentIcon] = useState('sell');
  const [newSegmentRuleField, setNewSegmentRuleField] = useState<'credit_limit' | 'accepts_marketing' | 'phone'>('accepts_marketing');
  const [newSegmentRuleOperator, setNewSegmentRuleOperator] = useState<'gt' | 'eq' | 'neq'>('eq');
  const [newSegmentRuleValue, setNewSegmentRuleValue] = useState<string>('true');
  const [isSavingSegment, setIsSavingSegment] = useState(false);

  // Combine system-level smart segments and user-defined DB segments
  const allSegments = useMemo(() => {
    return [...SYSTEM_SEGMENTS, ...dbSegments];
  }, [dbSegments]);

  useEffect(() => {
    if (tenant?.id) {
      fetchCustomersAndSegments();
    }
  }, [tenant]);

  async function fetchCustomersAndSegments() {
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
      setCustomers(custData || []);

      // 2. Fetch Customer Segments from Supabase
      const { data: segData, error: segError } = await supabase
        .from('customer_segments')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: true });

      if (segError) {
        console.warn('Customer segments table not loaded or missing. Verify SQL migrations are applied in Supabase dashboard.', segError);
        setDbSegments([]);
      } else {
        setDbSegments((segData || []).map((s: any) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          icon: s.icon || 'sell',
          color: s.color || 'blue',
          rule_type: s.rule_type,
          custom_rule: s.custom_rule,
          tenant_id: s.tenant_id,
          created_at: s.created_at
        })));
      }
    } catch (err) {
      console.error('Error fetching segments data:', err);
    } finally {
      setLoading(false);
    }
  }

  // Filter customers depending on the active segment rules
  const segmentedCustomers = useMemo(() => {
    const activeSegment = allSegments.find(s => s.id === selectedSegmentId);
    if (!activeSegment) return customers;

    return customers.filter(customer => {
      // 1. Apply search query if exists
      if (searchQuery) {
        const search = searchQuery.toLowerCase();
        const fullName = `${customer.first_name || ''} ${customer.last_name || ''}`.toLowerCase();
        const matchesSearch = 
          fullName.includes(search) ||
          customer.email?.toLowerCase()?.includes(search) ||
          customer.phone?.toLowerCase()?.includes(search) ||
          customer.dni_cuit?.toLowerCase()?.includes(search);
        
        if (!matchesSearch) return false;
      }

      // 2. Apply segment rule logic
      switch (activeSegment.rule_type) {
        case 'all':
          return true;
        case 'vip':
          return customer.credit_limit >= 20000;
        case 'debtors':
          return customer.credit_limit > 0;
        case 'marketing':
          return customer.accepts_marketing === true;
        case 'has_phone':
          return !!customer.phone && customer.phone.trim() !== '';
        case 'custom':
          if (!activeSegment.custom_rule) return true;
          const { field, operator, value } = activeSegment.custom_rule;
          
          if (field === 'credit_limit') {
            const numVal = parseFloat(value) || 0;
            if (operator === 'gt') return customer.credit_limit > numVal;
            if (operator === 'eq') return customer.credit_limit === numVal;
            return customer.credit_limit !== numVal;
          }
          
          if (field === 'accepts_marketing') {
            const boolVal = value === 'true';
            return customer.accepts_marketing === boolVal;
          }

          if (field === 'phone') {
            const hasPhone = !!customer.phone && customer.phone.trim() !== '';
            const wantsPhone = value === 'true';
            return hasPhone === wantsPhone;
          }
          return true;
        default:
          return true;
      }
    });
  }, [customers, selectedSegmentId, allSegments, searchQuery]);

  // Helper to count members of any segment
  const getSegmentCount = (segment: Segment) => {
    return customers.filter(customer => {
      switch (segment.rule_type) {
        case 'all':
          return true;
        case 'vip':
          return customer.credit_limit >= 20000;
        case 'debtors':
          return customer.credit_limit > 0;
        case 'marketing':
          return customer.accepts_marketing === true;
        case 'has_phone':
          return !!customer.phone && customer.phone.trim() !== '';
        case 'custom':
          if (!segment.custom_rule) return true;
          const { field, operator, value } = segment.custom_rule;
          if (field === 'credit_limit') {
            const numVal = parseFloat(value) || 0;
            if (operator === 'gt') return customer.credit_limit > numVal;
            if (operator === 'eq') return customer.credit_limit === numVal;
            return customer.credit_limit !== numVal;
          }
          if (field === 'accepts_marketing') {
            return customer.accepts_marketing === (value === 'true');
          }
          if (field === 'phone') {
            return (!!customer.phone) === (value === 'true');
          }
          return true;
        default:
          return true;
      }
    }).length;
  };

  const handleCreateSegment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant?.id || !newSegmentName.trim()) return;

    setIsSavingSegment(true);
    try {
      const { data, error } = await supabase
        .from('customer_segments')
        .insert({
          tenant_id: tenant.id,
          name: newSegmentName.trim(),
          description: newSegmentDesc.trim() || `Segmento dinámico personalizado basado en condiciones de la cuenta.`,
          icon: newSegmentIcon,
          color: newSegmentColor,
          rule_type: 'custom',
          custom_rule: {
            field: newSegmentRuleField,
            operator: newSegmentRuleOperator,
            value: newSegmentRuleValue
          }
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const addedSeg: Segment = {
          id: data.id,
          name: data.name,
          description: data.description,
          icon: data.icon || 'sell',
          color: data.color as Segment['color'] || 'violet',
          rule_type: 'custom',
          custom_rule: data.custom_rule,
          tenant_id: data.tenant_id,
          created_at: data.created_at
        };

        setDbSegments(prev => [...prev, addedSeg]);
        setSelectedSegmentId(data.id);
      }

      // Reset Form
      setNewSegmentName('');
      setNewSegmentDesc('');
      setNewSegmentColor('violet');
      setNewSegmentIcon('sell');
      setShowCreateModal(false);
      alert('Segmento creado exitosamente en base de datos');
    } catch (err: any) {
      console.error('Error creating custom segment in DB:', err);
      alert('Error de persistencia: Asegúrate de aplicar la migración SQL en Supabase Cloud. Detalles: ' + err.message);
    } finally {
      setIsSavingSegment(false);
    }
  };

  const handleDeleteSegment = async (segmentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!tenant?.id) return;
    if (segmentId.startsWith('sys-')) {
      alert('Los segmentos inteligentes del sistema no se pueden eliminar.');
      return;
    }

    if (!confirm('¿Estás seguro de eliminar este segmento personalizado en Supabase?')) return;

    try {
      const { error } = await supabase
        .from('customer_segments')
        .delete()
        .eq('id', segmentId)
        .eq('tenant_id', tenant.id);

      if (error) throw error;

      setDbSegments(prev => prev.filter(s => s.id !== segmentId));
      if (selectedSegmentId === segmentId) {
        setSelectedSegmentId('sys-all');
      }
      alert('Segmento eliminado exitosamente');
    } catch (err: any) {
      console.error('Error deleting segment:', err);
      alert('Error al eliminar: ' + err.message);
    }
  };

  const exportSegmentCSV = () => {
    const activeSeg = allSegments.find(s => s.id === selectedSegmentId);
    if (!activeSeg || segmentedCustomers.length === 0) {
      alert('No hay clientes en este segmento para exportar.');
      return;
    }

    const headers = ['Nombre', 'Apellido', 'Email', 'Telefono', 'DNI_CUIT', 'Acepta Marketing', 'Limite Credito'];
    const rows = segmentedCustomers.map(c => [
      c.first_name || '',
      c.last_name || '',
      c.email || '',
      c.phone || '',
      c.dni_cuit || '',
      c.accepts_marketing ? 'Si' : 'No',
      c.credit_limit
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `segmento_${activeSeg.name.toLowerCase().replace(/\s+/g, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getColorClasses = (color: Segment['color'], active: boolean) => {
    const map = {
      violet: {
        bg: active ? 'bg-violet-500/10 border-violet-500/30' : 'bg-zinc-900 border-white/5 hover:border-violet-500/20',
        text: 'text-violet-400',
        badge: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
        glow: 'shadow-[0_0_15px_rgba(139,92,246,0.15)]'
      },
      emerald: {
        bg: active ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-zinc-900 border-white/5 hover:border-emerald-500/20',
        text: 'text-emerald-400',
        badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        glow: 'shadow-[0_0_15px_rgba(16,185,129,0.15)]'
      },
      amber: {
        bg: active ? 'bg-amber-500/10 border-amber-500/30' : 'bg-zinc-900 border-white/5 hover:border-amber-500/20',
        text: 'text-amber-400',
        badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        glow: 'shadow-[0_0_15px_rgba(245,158,11,0.15)]'
      },
      rose: {
        bg: active ? 'bg-rose-500/10 border-rose-500/30' : 'bg-zinc-900 border-white/5 hover:border-rose-500/20',
        text: 'text-rose-400',
        badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
        glow: 'shadow-[0_0_15px_rgba(244,63,94,0.15)]'
      },
      blue: {
        bg: active ? 'bg-blue-500/10 border-blue-500/30' : 'bg-zinc-900 border-white/5 hover:border-blue-500/20',
        text: 'text-blue-400',
        badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        glow: 'shadow-[0_0_15px_rgba(59,130,246,0.15)]'
      }
    };
    return map[color] || map.blue;
  };

  const getInitials = (customer: Customer): string => {
    const first = customer.first_name?.[0] || customer.nombre?.[0] || '';
    const last = customer.last_name?.[0] || '';
    return (first + last).toUpperCase() || customer.email?.[0]?.toUpperCase() || '?';
  };

  const getFullName = (customer: Customer): string => {
    return customer.nombre || `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Sin nombre';
  };

  const activeSegmentObj = allSegments.find(s => s.id === selectedSegmentId);
  const totalCustomersCount = customers.length;
  const coveragePercentage = totalCustomersCount > 0 
    ? Math.round((segmentedCustomers.length / totalCustomersCount) * 100) 
    : 0;

  return (
    <div className="max-w-[1440px] mx-auto flex flex-col gap-8 pb-32">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-zinc-400 font-label-md text-xs mb-2 uppercase tracking-widest">
            <span className="text-violet-400 font-black">CRM</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span>Segmentación Avanzada</span>
          </div>
          <h1 className="font-headline-xl text-3xl font-black text-white mb-1">Segmentos de Clientes</h1>
          <p className="text-zinc-400 font-body-sm text-sm max-w-2xl">
            Clasifica tu cartera de clientes según sus hábitos de consumo y límite de crédito para lanzar promociones y controlar riesgos en el POS.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button 
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-[#6D28D9] text-white transition-all font-label-md text-xs uppercase font-bold tracking-wider flex items-center gap-2 shadow-[0_0_15px_rgba(124,58,237,0.35)] active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            Crear Segmento
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#1A1A1A] border border-white/10 rounded-xl p-6 flex flex-col justify-between hover:border-violet-500/20 transition-all">
          <div className="flex items-center gap-2 text-zinc-500 mb-4 uppercase tracking-[0.2em] font-black text-[10px]">
            <span className="material-symbols-outlined text-lg text-violet-400">category</span>
            Segmentos Totales
          </div>
          <div>
            <div className="font-data-tabular text-3xl font-black text-white">{allSegments.length}</div>
            <div className="text-[10px] text-zinc-500 mt-2 font-bold uppercase tracking-wider">
              {dbSegments.length} personalizados persistidos
            </div>
          </div>
        </div>

        <div className="bg-[#1A1A1A] border border-white/10 rounded-xl p-6 flex flex-col justify-between hover:border-emerald-500/20 transition-all">
          <div className="flex items-center gap-2 text-zinc-500 mb-4 uppercase tracking-[0.2em] font-black text-[10px]">
            <span className="material-symbols-outlined text-lg text-emerald-400">group_work</span>
            Clientes en Segmento Activo
          </div>
          <div>
            <div className="font-data-tabular text-3xl font-black text-white">{segmentedCustomers.length}</div>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-1.5 py-0.5 rounded font-black">
                {coveragePercentage}%
              </span>
              <span className="text-[10px] text-zinc-500 font-medium tracking-tighter uppercase">cobertura total</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#1A1A1A] to-[#201530] border border-violet-500/20 rounded-xl p-6 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <span className="material-symbols-outlined text-7xl text-violet-500">campaign</span>
          </div>
          <div className="flex items-center gap-2 text-violet-400 mb-4 uppercase tracking-[0.2em] font-black text-[10px] relative z-10">
            <span className="material-symbols-outlined text-lg">trending_up</span>
            Alcance del Segmento
          </div>
          <div className="relative z-10">
            <div className="font-data-tabular text-3xl font-black text-white">
              {segmentedCustomers.filter(c => c.accepts_marketing).length}
            </div>
            <div className="text-[10px] text-zinc-500 font-black uppercase tracking-wider mt-2">
              Miembros aptos para recibir marketing
            </div>
          </div>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Segments List */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="text-xs font-black uppercase tracking-widest text-zinc-500 px-1">
            Segmentos Disponibles
          </div>
          
          <div className="flex flex-col gap-3 font-inter">
            {allSegments.map((segment) => {
              const isActive = selectedSegmentId === segment.id;
              const style = getColorClasses(segment.color, isActive);
              const count = getSegmentCount(segment);
              const isSystemSegment = segment.id.startsWith('sys-');

              return (
                <div
                  key={segment.id}
                  onClick={() => setSelectedSegmentId(segment.id)}
                  className={`border rounded-xl p-4 cursor-pointer transition-all flex flex-col gap-2.5 ${style.bg} ${isActive ? style.glow : ''}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-lg flex items-center justify-center ${isActive ? 'bg-white/10' : 'bg-zinc-950/40'} ${style.text}`}>
                        <span className="material-symbols-outlined text-[20px]">{segment.icon}</span>
                      </div>
                      <span className="text-xs font-black text-white uppercase tracking-wider">{segment.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${style.badge}`}>
                        {count} {count === 1 ? 'cliente' : 'clientes'}
                      </span>
                      
                      {!isSystemSegment && (
                        <button
                          onClick={(e) => handleDeleteSegment(segment.id, e)}
                          className="p-1 hover:bg-red-500/10 rounded-lg text-zinc-500 hover:text-red-400 transition-colors animate-pulse"
                          title="Eliminar de Supabase"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-[11px] text-zinc-400 font-medium leading-relaxed">
                    {segment.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Customers in Selected Segment */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="bg-[#1A1A1A] border border-white/10 rounded-xl p-5 shadow-xl flex flex-col gap-4">
            {/* Table Header / Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full bg-${activeSegmentObj?.color || 'blue'}-500`}></span>
                  <span className="text-xs font-black uppercase text-white tracking-widest">
                    Miembros de: {activeSegmentObj?.name}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-500 font-medium mt-1">
                  Se muestran los clientes reales que coinciden con los criterios de este segmento en tiempo real.
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                <button
                  onClick={exportSegmentCSV}
                  disabled={segmentedCustomers.length === 0}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-zinc-900 border border-white/10 hover:bg-white/5 text-zinc-400 hover:text-white px-3.5 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50 disabled:pointer-events-none"
                >
                  <span className="material-symbols-outlined text-[16px]">download</span> Exportar Lista
                </button>
              </div>
            </div>

            {/* Search filter in segment */}
            <div className="flex items-center gap-2 px-3 py-1 bg-zinc-900 rounded-xl border border-white/5 focus-within:border-violet-500/40 transition-all">
              <span className="material-symbols-outlined text-zinc-500 text-lg">search</span>
              <input
                className="bg-transparent border-none outline-none text-xs text-white w-full placeholder:text-zinc-600 focus:ring-0 py-2.5"
                placeholder="Filtrar por nombre, email o DNI dentro de este segmento..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-zinc-500 hover:text-white">
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              )}
            </div>

            {/* Customer list table */}
            <div className="border border-white/5 rounded-xl overflow-hidden bg-zinc-950/40">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-[#1E1E1E]/50">
                    <th className="py-3 px-5 text-[9px] text-zinc-500 uppercase tracking-[0.2em] font-black">Cliente / Contacto</th>
                    <th className="py-3 px-5 text-[9px] text-zinc-500 uppercase tracking-[0.2em] font-black">Teléfono / DNI</th>
                    <th className="py-3 px-5 text-[9px] text-zinc-500 uppercase tracking-[0.2em] font-black text-center">Crédito Máx</th>
                    <th className="py-3 px-5 text-[9px] text-zinc-500 uppercase tracking-[0.2em] font-black text-right">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-data-tabular text-xs text-white">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="py-14 text-center text-zinc-500 font-black uppercase tracking-widest animate-pulse">
                        Cargando miembros...
                      </td>
                    </tr>
                  ) : segmentedCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-14 text-center text-zinc-500 font-black uppercase tracking-widest">
                        Ningún cliente coincide con los criterios
                      </td>
                    </tr>
                  ) : (
                    segmentedCustomers.map((customer) => (
                      <tr 
                        key={customer.id} 
                        className="hover:bg-white/[0.01] transition-colors group cursor-pointer"
                        onClick={() => window.location.href = `/customers/${customer.id}`}
                      >
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-violet-600/10 border border-violet-500/20 text-violet-400 flex items-center justify-center font-black text-[10px]">
                              {getInitials(customer)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-white font-bold truncate group-hover:text-violet-400 transition-colors">
                                {getFullName(customer)}
                              </p>
                              <p className="text-zinc-500 text-[9px] truncate font-medium mt-0.5">{customer.email}</p>
                            </div>
                          </div>
                        </td>
                        
                        <td className="py-3.5 px-5">
                          <div className="text-zinc-300 font-semibold">{customer.phone || '—'}</div>
                          <div className="text-zinc-600 text-[9px] font-black tracking-widest mt-0.5">{customer.dni_cuit || '—'}</div>
                        </td>

                        <td className="py-3.5 px-5 text-center font-bold">
                          {customer.credit_limit > 0 ? (
                            <span className="text-emerald-400">${customer.credit_limit.toLocaleString('es-AR')}</span>
                          ) : (
                            <span className="text-zinc-500">—</span>
                          )}
                        </td>

                        <td className="py-3.5 px-5 text-right">
                          <span className="material-symbols-outlined text-[18px] text-zinc-600 group-hover:text-white transition-colors">
                            arrow_right_alt
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Crear Segmento */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-[#1A1A1A] border-b border-white/10 p-6 flex items-center justify-between z-10">
              <div>
                <h2 className="text-lg font-black text-white uppercase tracking-wider">Crear Segmento en Supabase</h2>
                <p className="text-zinc-500 text-xs mt-1">Define reglas automáticas persistidas en tu base de datos cloud.</p>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-white/5 rounded-xl transition-colors text-zinc-400 hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateSegment} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-2">Nombre del Segmento *</label>
                <input
                  type="text"
                  required
                  value={newSegmentName}
                  onChange={(e) => setNewSegmentName(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  placeholder="Ej. Clientes con Celular"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-2">Descripción</label>
                <textarea
                  value={newSegmentDesc}
                  onChange={(e) => setNewSegmentDesc(e.target.value)}
                  rows={2}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none"
                  placeholder="Breve explicación de las condiciones de este segmento..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-2">Color Temático</label>
                  <select
                    value={newSegmentColor}
                    onChange={(e) => setNewSegmentColor(e.target.value as Segment['color'])}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-violet-500 font-bold"
                  >
                    <option value="violet">Violeta (Premium)</option>
                    <option value="emerald">Esmeralda (Activo)</option>
                    <option value="amber">Ámbar (Alerta/Crédito)</option>
                    <option value="rose">Rosa (Fuga/Inactivo)</option>
                    <option value="blue">Azul (Informativo)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-2">Icono Visual</label>
                  <select
                    value={newSegmentIcon}
                    onChange={(e) => setNewSegmentIcon(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-violet-500 font-bold"
                  >
                    <option value="sell">Etiqueta</option>
                    <option value="star">Estrella (VIP)</option>
                    <option value="account_balance">Balanza (Finanzas)</option>
                    <option value="campaign">Megáfono (Marketing)</option>
                    <option value="chat">Chat (Mensajes)</option>
                    <option value="group">Grupo</option>
                  </select>
                </div>
              </div>

              <div className="border border-white/5 rounded-xl p-4 bg-zinc-950/50 space-y-4">
                <div className="text-[10px] font-black uppercase tracking-widest text-violet-400">
                  Condición de Regla Automática
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-wider text-zinc-500 mb-1">Campo</label>
                    <select
                      value={newSegmentRuleField}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        setNewSegmentRuleField(val);
                        if (val === 'credit_limit') {
                          setNewSegmentRuleOperator('gt');
                          setNewSegmentRuleValue('10000');
                        } else {
                          setNewSegmentRuleOperator('eq');
                          setNewSegmentRuleValue('true');
                        }
                      }}
                      className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2.5 text-[11px] text-white font-bold focus:outline-none"
                    >
                      <option value="accepts_marketing">Acepta Marketing</option>
                      <option value="phone">Tiene Teléfono</option>
                      <option value="credit_limit">Límite Crédito</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-wider text-zinc-500 mb-1">Operador</label>
                    {newSegmentRuleField === 'credit_limit' ? (
                      <select
                        value={newSegmentRuleOperator}
                        onChange={(e) => setNewSegmentRuleOperator(e.target.value as any)}
                        className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2.5 text-[11px] text-white font-bold focus:outline-none"
                      >
                        <option value="gt">Mayor que</option>
                        <option value="eq">Igual a</option>
                      </select>
                    ) : (
                      <select
                        value={newSegmentRuleOperator}
                        disabled
                        className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2.5 text-[11px] text-zinc-500 font-bold focus:outline-none opacity-50"
                      >
                        <option value="eq">Es igual a</option>
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-wider text-zinc-500 mb-1">Valor</label>
                    {newSegmentRuleField === 'credit_limit' ? (
                      <input
                        type="number"
                        value={newSegmentRuleValue}
                        onChange={(e) => setNewSegmentRuleValue(e.target.value)}
                        className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 text-[11px] text-white font-bold focus:outline-none"
                        placeholder="10000"
                      />
                    ) : (
                      <select
                        value={newSegmentRuleValue}
                        onChange={(e) => setNewSegmentRuleValue(e.target.value)}
                        className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2.5 text-[11px] text-white font-bold focus:outline-none"
                      >
                        <option value="true">Sí (Verdadero)</option>
                        <option value="false">No (Falso)</option>
                      </select>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3 bg-zinc-900 border border-white/10 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all font-bold text-xs uppercase tracking-wider"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingSegment}
                  className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl transition-all font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(124,58,237,0.2)] disabled:opacity-50"
                >
                  {isSavingSegment ? (
                    <>
                      <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">save</span>
                      Guardar en DB
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
