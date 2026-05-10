import React from 'react';
import Link from 'next/link';

export function BottomNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-3 pb-safe bg-zinc-950/95 border-t border-white/10 shadow-[0_-4px_10px_rgba(0,0,0,0.5)]">
      <Link href="/" className="flex flex-col items-center justify-center text-violet-500 scale-110 active:bg-violet-500/20 p-2 rounded-lg transition-all">
        <span className="material-symbols-outlined">storefront</span>
        <span className="font-inter text-[10px] uppercase font-bold mt-1">Shop</span>
      </Link>
      <Link href="/categories" className="flex flex-col items-center justify-center text-zinc-500 active:bg-violet-500/20 p-2 rounded-lg transition-all">
        <span className="material-symbols-outlined">category</span>
        <span className="font-inter text-[10px] uppercase font-bold mt-1">Categories</span>
      </Link>
      <Link href="/cart" className="flex flex-col items-center justify-center text-zinc-500 active:bg-violet-500/20 p-2 rounded-lg transition-all relative">
        <span className="material-symbols-outlined">shopping_cart</span>
        <span className="font-inter text-[10px] uppercase font-bold mt-1">Cart</span>
        <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full"></span>
      </Link>
      <Link href="/account" className="flex flex-col items-center justify-center text-zinc-500 active:bg-violet-500/20 p-2 rounded-lg transition-all">
        <span className="material-symbols-outlined">account_circle</span>
        <span className="font-inter text-[10px] uppercase font-bold mt-1">Account</span>
      </Link>
    </nav>
  );
}
