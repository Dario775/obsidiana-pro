'use client';

import React from 'react';

export default function OrdersAnalyticsPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white uppercase tracking-tighter">Analíticas de Pedidos</h1>
      <p className="text-zinc-500 mt-2">Módulo en desarrollo. Aquí verás las métricas de tus ventas online.</p>
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 bg-zinc-900 border border-white/5 rounded-2xl animate-pulse" />
        ))}
      </div>
    </div>
  );
}
