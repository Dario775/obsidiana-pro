'use client';

import React, { useEffect, useState } from 'react';

export function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstruction, setShowIOSInstruction] = useState(false);

  useEffect(() => {
    // 1. Check if already running in standalone mode (installed app)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                         (navigator as any).standalone === true;
    
    if (isStandalone) return;

    // 2. Check if user dismissed the prompt recently
    const dismissedTime = localStorage.getItem('obsidiana_pwa_dismissed');
    if (dismissedTime) {
      const oneWeek = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - parseInt(dismissedTime) < oneWeek) {
        return; // Don't show if dismissed within the last week
      }
    }

    // 3. Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(iosDevice);

    if (iosDevice) {
      // For iOS, show the custom Safari install guide after 5 seconds
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      // 4. For Android/Chrome, listen to beforeinstallprompt
      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
        // Delay showing the prompt to not disrupt initial load
        setTimeout(() => {
          setShowPrompt(true);
        }, 3000);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSInstruction(true);
      return;
    }

    if (!deferredPrompt) return;

    // Trigger Chrome/Android install dialog
    deferredPrompt.prompt();
    
    // Wait for the user response
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    
    // Clear deferred prompt
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('obsidiana_pwa_dismissed', Date.now().toString());
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <>
      {/* Floating Install Prompt Banner */}
      <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-96 z-[90] p-4 bg-zinc-900/90 backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex flex-col gap-3 transition-all duration-300 animate-slide-in">
        <div className="flex gap-3 items-start">
          <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center shadow-lg flex-shrink-0">
            <img src="/logo.png" alt="Obsidiana" className="w-6 h-6 object-contain brightness-110" />
          </div>
          <div className="flex-1">
            <h4 className="text-[13px] font-black text-white leading-tight">Instalar Obsidiana App</h4>
            <p className="text-[11px] text-zinc-400 font-semibold mt-1">
              Descargá la aplicación en tu pantalla de inicio para una experiencia más rápida y sin barras.
            </p>
          </div>
          <button 
            onClick={handleDismiss} 
            className="text-zinc-500 hover:text-white p-1 rounded-lg hover:bg-white/5 active:bg-white/10"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="flex gap-2 justify-end mt-1">
          <button 
            onClick={handleDismiss}
            className="px-3.5 py-1.5 rounded-xl bg-white/5 text-zinc-400 text-[11px] font-bold active:bg-white/10 transition-colors"
          >
            Más tarde
          </button>
          <button 
            onClick={handleInstallClick}
            className="px-4 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-[11px] font-black shadow-md shadow-violet-600/20 active:scale-95 transition-all"
          >
            Instalar
          </button>
        </div>
      </div>

      {/* iOS Safari Instruction Modal */}
      {showIOSInstruction && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            onClick={() => setShowIOSInstruction(false)}
          />
          <div className="relative z-10 w-full max-w-sm p-6 bg-zinc-900 border border-white/10 rounded-2xl shadow-[0_10px_35px_rgba(0,0,0,0.6)] flex flex-col gap-4 animate-slide-up">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black text-white">Añadir a Pantalla de Inicio</h3>
              <button 
                onClick={() => setShowIOSInstruction(false)}
                className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-zinc-400"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>

            <div className="space-y-4 font-inter">
              <p className="text-[12px] text-zinc-400 font-semibold leading-relaxed">
                Safari en iOS requiere instalar PWAs manualmente desde el menú Compartir. Seguí estos pasos sencillos:
              </p>
              
              <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white">
                  <span className="material-symbols-outlined text-[20px]">ios_share</span>
                </div>
                <div className="text-[11px] text-zinc-300 font-semibold">
                  1. Presioná el botón de <span className="text-violet-400 font-bold">Compartir</span> en la barra inferior de Safari.
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white">
                  <span className="material-symbols-outlined text-[20px]">add_box</span>
                </div>
                <div className="text-[11px] text-zinc-300 font-semibold">
                  2. Deslizá hacia abajo y seleccioná <span className="text-violet-400 font-bold">"Añadir a pantalla de inicio"</span>.
                </div>
              </div>
            </div>

            <button 
              onClick={() => {
                setShowIOSInstruction(false);
                handleDismiss();
              }}
              className="mt-2 w-full py-2.5 rounded-xl bg-violet-600 text-white text-[12px] font-black shadow-lg"
            >
              ¡Entendido!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
