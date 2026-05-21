'use client';

import { useEffect } from 'react';

export function PWARegistry() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Desactivar Service Worker en modo desarrollo para evitar conflictos de caché y red local
      if (process.env.NODE_ENV === 'development') {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const registration of registrations) {
            registration.unregister();
            console.log('PWA Service Worker removido en entorno de desarrollo.');
          }
        });
        return;
      }

      const registerSW = () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('PWA Service Worker registrado con éxito:', registration.scope);
          })
          .catch((error) => {
            console.error('Error al registrar PWA Service Worker:', error);
          });
      };

      if (document.readyState === 'complete') {
        registerSW();
      } else {
        window.addEventListener('load', registerSW);
        return () => window.removeEventListener('load', registerSW);
      }
    }
  }, []);

  return null;
}
