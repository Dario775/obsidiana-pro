'use client';

import React from 'react';
import Link from 'next/link';
import { useTenant } from '../hooks/use-tenant';

interface FeatureGateProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  const { hasFeature, loading } = useTenant();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return <LockedState feature={feature} />;
}

function LockedState({ feature }: { feature: string }) {
  const featureLabels: Record<string, { title: string; description: string }> = {
    online_store: {
      title: 'Tienda Online Bloqueada',
      description: 'Necesitás contratar un plan que incluya tienda online para acceder a esta función.',
    },
    orders: {
      title: 'Pedidos Web Bloqueados',
      description: 'Los pedidos online están disponibles solo en planes superiores.',
    },
    catalog: {
      title: 'Catálogo Web Bloqueado',
      description: 'El catálogo online requiere un plan con tienda habilitada.',
    },
    loyalty: {
      title: 'Club de Puntos Bloqueado',
      description: 'El programa de fidelidad y acumulación de puntos para incentivar clientes requiere un plan superior.',
    },
    segments: {
      title: 'Segmentación de Clientes Bloqueada',
      description: 'La creación de segmentos avanzados y filtros automatizados de clientes requiere un plan Pro o superior.',
    },
    multi_branch: {
      title: 'Gestión de Sucursales Bloqueada',
      description: 'El control multisucursal y gestión de múltiples inventarios físicos requiere un plan Premium.',
    },
  };

  const labels = featureLabels[feature] || { title: 'Módulo de Suscripción Premium', description: 'Esta función requiere un plan superior. Contactá a soporte para actualizar tu suscripción.' };

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6">
        <span className="material-symbols-outlined text-4xl text-amber-400">lock</span>
      </div>
      <h2 className="text-2xl font-black text-white text-center mb-3">{labels.title}</h2>
      <p className="text-zinc-400 text-center max-w-md mb-8">{labels.description}</p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/settings/billing"
          className="bg-violet-500 hover:bg-violet-600 text-white px-6 py-3 rounded-xl font-bold text-sm transition-colors text-center"
        >
          Ver Planes Disponibles
        </Link>
        <Link
          href="/dashboard"
          className="bg-white/5 hover:bg-white/10 text-white px-6 py-3 rounded-xl font-bold text-sm transition-colors border border-white/10 text-center"
        >
          Volver al Panel
        </Link>
      </div>
      <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full">
        {[
          { icon: 'shopping_bag', label: 'Pedidos Web', desc: 'Gestión de compras online' },
          { icon: 'grid_view', label: 'Catálogo Web', desc: 'Mostrá tus productos al mundo' },
          { icon: 'language', label: 'Personalización', desc: 'Tu marca, tu estilo' },
        ].map((item) => (
          <div
            key={item.label}
            className="bg-zinc-900 border border-white/5 rounded-xl p-4 opacity-50"
          >
            <span className="material-symbols-outlined text-zinc-600 mb-2">{item.icon}</span>
            <p className="text-sm font-bold text-zinc-500">{item.label}</p>
            <p className="text-xs text-zinc-600">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
