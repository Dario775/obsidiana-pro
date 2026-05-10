import React from 'react';

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry: () => void;
  title?: string;
  message?: string;
}

export function ErrorModal({ 
  isOpen, 
  onClose, 
  onRetry, 
  title = "Error al guardar los cambios", 
  message = "No se pudo establecer conexión con la base de datos principal. Por favor, verifica tu estado de red o contacta a soporte si el problema persiste." 
}: ErrorModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Dimming Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-[2px] transition-opacity" 
        onClick={onClose}
      />
      
      {/* Error Modal Card */}
      <div className="relative bg-[#1A1A1A] border border-white/10 rounded-3xl w-full max-w-md p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col items-center text-center transform transition-all animate-in fade-in zoom-in duration-300">
        {/* Icon container with warning accent */}
        <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(239,68,68,0.1)]">
          <span className="material-symbols-outlined text-red-500 text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>cloud_off</span>
        </div>
        
        {/* Error Messaging */}
        <h2 className="text-xl font-black text-white mb-3 tracking-tight">{title}</h2>
        <p className="text-sm font-medium text-zinc-500 mb-8 px-4 leading-relaxed">
          {message}
        </p>
        
        {/* Actions */}
        <div className="w-full flex flex-col gap-3">
          <button 
            onClick={onRetry}
            className="w-full py-4 px-4 bg-primary-container text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all hover:bg-primary-container/80 hover:shadow-[0_0_20px_rgba(124,58,237,0.3)] active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-lg">refresh</span>
            Reintentar
          </button>
          <button 
            onClick={onClose}
            className="w-full py-4 px-4 bg-zinc-900 border border-white/5 text-zinc-500 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all hover:bg-zinc-800 hover:text-white active:scale-[0.98]"
          >
            Descartar cambios
          </button>
        </div>
      </div>
    </div>
  );
}
