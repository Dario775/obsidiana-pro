'use client';

import React from 'react';
import { useTheme } from './theme-provider';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 hover:bg-white/5 rounded-full transition-all duration-300 relative group flex items-center justify-center overflow-hidden active:scale-95"
      title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      aria-label="Cambiar tema"
    >
      <div className="relative w-6 h-6 flex items-center justify-center">
        {/* Sun Icon (Light Mode) */}
        <span className={`material-symbols-outlined absolute text-[22px] transition-all duration-500 ease-out transform ${
          theme === 'dark' 
            ? 'rotate-[90deg] scale-0 opacity-0 text-amber-400' 
            : 'rotate-0 scale-100 opacity-100 text-amber-500'
        }`}>
          light_mode
        </span>
        
        {/* Moon Icon (Dark Mode) */}
        <span className={`material-symbols-outlined absolute text-[22px] transition-all duration-500 ease-out transform ${
          theme === 'dark' 
            ? 'rotate-0 scale-100 opacity-100 text-violet-400' 
            : 'rotate-[-90deg] scale-0 opacity-0 text-violet-500'
        }`}>
          dark_mode
        </span>
      </div>
    </button>
  );
}
