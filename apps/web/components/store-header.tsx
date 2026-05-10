import React from 'react';
import Link from 'next/link';

export function Header() {
  return (
    <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-zinc-950/90 backdrop-blur-md border-b border-white/10">
      <div className="flex items-center gap-8">
        <span className="text-xl font-black tracking-tighter text-white uppercase font-headline-xl">Obsidiana</span>
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/" className="text-violet-500 border-b-2 border-violet-500 pb-1 font-inter text-sm font-medium tracking-tight transition-all font-label-md uppercase text-[11px] font-black">Shop</Link>
          <Link href="/categories" className="text-zinc-400 hover:text-white transition-colors hover:bg-white/5 font-inter text-sm font-medium tracking-tight transition-all font-label-md uppercase text-[11px] font-black">Categories</Link>
          <Link href="/offers" className="text-zinc-400 hover:text-white transition-colors hover:bg-white/5 font-inter text-sm font-medium tracking-tight transition-all font-label-md uppercase text-[11px] font-black">Offers</Link>
        </nav>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative hidden md:block">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-sm">search</span>
          <input 
            className="bg-surface-container-high border border-outline-variant rounded-lg pl-9 pr-4 py-1.5 text-body-sm text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary w-64 transition-colors outline-none" 
            placeholder="Search products..." 
            type="text" 
          />
        </div>
        <div className="flex items-center gap-3">
          <button className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-full transition-colors active:scale-95">
            <span className="material-symbols-outlined">search</span>
          </button>
          <button className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-full transition-colors active:scale-95 relative">
            <span className="material-symbols-outlined">shopping_cart</span>
            <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full"></span>
          </button>
          <button className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-full transition-colors active:scale-95">
            <span className="material-symbols-outlined">account_circle</span>
          </button>
        </div>
      </div>
    </header>
  );
}
