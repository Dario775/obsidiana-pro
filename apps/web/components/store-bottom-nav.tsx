'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function BottomNav() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  const navClasses = (path: string) => {
    const active = isActive(path);
    return `flex flex-col items-center justify-center p-2 rounded-xl transition-all btn-native-active ${
      active ? 'text-violet-500 scale-105' : 'text-zinc-500'
    }`;
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-3 pb-safe bg-zinc-950/95 border-t border-white/10 shadow-[0_-4px_10px_rgba(0,0,0,0.5)]">
      <Link href="/" className={navClasses('/')}>
        <span className="material-symbols-outlined">storefront</span>
        <span className="font-inter text-[9px] uppercase font-black mt-0.5">Shop</span>
      </Link>
      <Link href="/categories" className={navClasses('/categories')}>
        <span className="material-symbols-outlined">category</span>
        <span className="font-inter text-[9px] uppercase font-black mt-0.5">Categories</span>
      </Link>
      <Link href="/cart" className={`${navClasses('/cart')} relative`}>
        <span className="material-symbols-outlined">shopping_cart</span>
        <span className="font-inter text-[9px] uppercase font-black mt-0.5">Cart</span>
        <span className="absolute top-2 right-4 w-2 h-2 bg-primary rounded-full"></span>
      </Link>
      <Link href="/account" className={navClasses('/account')}>
        <span className="material-symbols-outlined">account_circle</span>
        <span className="font-inter text-[9px] uppercase font-black mt-0.5">Account</span>
      </Link>
    </nav>
  );
}
