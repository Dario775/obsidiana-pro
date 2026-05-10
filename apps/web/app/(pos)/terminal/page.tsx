'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

import { useTenant } from '@/hooks/use-tenant';

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  img: string;
}

interface CartItem extends Product {
  quantity: number;
}

export default function POSTerminalPage() {
  const { tenant } = useTenant();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchProducts();
  }, [tenant]);

  async function fetchProducts() {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      // Query simplificada: obtener variantes con sus productos e inventario
      const { data: variants, error: variantsError } = await supabase
        .from('product_variants')
        .select(`
          id,
          sku,
          barcode,
          price_ars,
          product_id,
          products (
            title,
            slug,
            images
          )
        `)
        .eq('tenant_id', tenant.id);

      if (variantsError) {
        console.error('Error fetching variants:', variantsError);
        setLoading(false);
        return;
      }

      // Obtener inventario para estas variantes
      const variantIds = variants?.map(v => v.id) || [];
      
      const { data: inventory, error: inventoryError } = await supabase
        .from('inventory_levels')
        .select('variant_id, on_hand, committed, available')
        .eq('tenant_id', tenant.id)
        .in('variant_id', variantIds);

      if (inventoryError) {
        console.error('Error fetching inventory:', inventoryError);
      }

      // Obtener products para saber online_reserved
      const productIds = products?.map(p => p.id).filter(Boolean) || [];
      const { data: productsData } = await supabase
        .from('products')
        .select('id, online_reserved')
        .in('id', productIds);

      const reservedMap: Record<string, number> = {};
      productsData?.forEach((p: any) => {
        reservedMap[p.id] = p.online_reserved || 0;
      });

      // Combinar datos
      const inventoryMap = new Map();
      inventory?.forEach((inv: any) => {
        inventoryMap.set(inv.variant_id, inv);
      });

      const formattedProducts: Product[] = (variants || [])
        .map((variant: any) => {
          const product = variant.products;
          const inv = inventoryMap.get(variant.id);
          const onHand = inv?.on_hand || 0;
          const reserved = reservedMap[variant.product_id] || 0;
          
          // POS disponible = on_hand - reservado_para_web
          const posAvailable = Math.max(0, onHand - reserved);
          
          return {
            id: variant.id,
            name: product?.title || 'Sin nombre',
            sku: variant.sku || 'N/A',
            price: variant.price_ars || 0,
            stock: posAvailable,
            img: product?.images?.[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=400&h=400&auto=format&fit=crop'
          };
        })
        .filter((p: Product) => p.stock > 0); // Solo productos con stock disponible en POS

      setProducts(formattedProducts);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.sku.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, products]);

  const addToCart = (product: Product) => {
    if (product.stock <= 0) return;
    
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const clearCart = () => {
    setCart([]);
  };

  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const iva = subtotal * 0.21;
  const total = subtotal + iva;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(val);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] overflow-hidden">
      {/* POS Top Search Bar */}
      <div className="flex-none px-6 py-4 border-b border-white/10 bg-[#1A1A1A] flex items-center justify-between gap-6 rounded-t-2xl">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative w-full max-w-xl group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-primary transition-colors">search</span>
            <input 
              className="w-full bg-zinc-900 border border-white/5 rounded-xl py-3 pl-12 pr-6 text-sm text-white font-medium focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-zinc-600" 
              placeholder="Buscar por nombre, SKU o Cód. Barras... (Alt+B)" 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button 
            onClick={fetchProducts}
            className="px-5 py-3 rounded-xl border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 flex items-center gap-2 font-black text-[10px] uppercase tracking-widest transition-all shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            Actualizar
          </button>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-emerald-400 font-black text-[10px] uppercase tracking-widest">Online - Caja #04</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Product Grid Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-zinc-950/50">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-600 gap-4">
              <span className="material-symbols-outlined text-6xl animate-spin">refresh</span>
              <p className="font-black text-[10px] uppercase tracking-widest">Cargando productos...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-600 gap-4">
              <span className="material-symbols-outlined text-6xl">inventory_2</span>
              <p className="font-black text-[10px] uppercase tracking-widest">No hay productos con stock disponible</p>
              <button 
                onClick={fetchProducts}
                className="px-6 py-3 bg-primary-container text-white rounded-xl font-black text-sm"
              >
                Recargar Productos
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {filteredProducts.map((product) => (
                <div 
                  key={product.id} 
                  onClick={() => addToCart(product)}
                  className={`bg-[#1A1A1A] rounded-2xl border border-white/5 p-4 flex flex-col gap-4 hover:border-primary/50 transition-all cursor-pointer group active:scale-95 ${product.stock <= 0 ? 'opacity-50 grayscale pointer-events-none' : ''}`}
                >
                  <div className="aspect-square rounded-xl bg-zinc-900 overflow-hidden relative border border-white/5">
                    <img src={product.img} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-80" />
                    <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${product.stock < 5 ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-zinc-950/80 text-white border-white/10'}`}>
                      Stock: {product.stock}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <p className="font-black text-[9px] text-zinc-600 uppercase tracking-widest">SKU: {product.sku}</p>
                    <h3 className="font-bold text-xs text-white line-clamp-2 leading-relaxed min-h-[2.5rem]">{product.name}</h3>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="font-data-tabular text-sm font-black text-primary-container">$ {product.price.toLocaleString()}</span>
                      <button className="w-8 h-8 rounded-lg bg-zinc-800 text-zinc-500 group-hover:bg-primary group-hover:text-white transition-all flex items-center justify-center">
                        <span className="material-symbols-outlined text-lg">add</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Sidebar: Checkout */}
        <div className="w-[400px] bg-[#1A1A1A] border-l border-white/10 flex flex-col shrink-0">
          <div className="p-6 border-b border-white/5 bg-[#1E1E1E]/50 flex items-center justify-between">
            <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-3">
              <span className="material-symbols-outlined text-primary-container">shopping_cart</span>
              Venta Actual
            </h2>
            <button 
              onClick={clearCart}
              className="text-zinc-600 hover:text-red-500 transition-colors p-2 rounded-xl hover:bg-red-500/10"
            >
              <span className="material-symbols-outlined text-xl">delete_sweep</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-600 gap-4">
                <span className="material-symbols-outlined text-6xl">shopping_cart_off</span>
                <p className="font-black text-[10px] uppercase tracking-widest">El carrito está vacío</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="bg-zinc-900/50 rounded-2xl border border-white/5 p-4 flex gap-4 relative group hover:border-white/10 transition-all">
                  <div className="w-16 h-16 rounded-xl bg-zinc-800 shrink-0 overflow-hidden border border-white/5">
                    <img src={item.img} alt={item.name} className="w-full h-full object-cover opacity-80" />
                  </div>
                  <div className="flex flex-col flex-1 min-w-0 py-0.5">
                    <h4 className="font-bold text-[13px] text-white truncate leading-tight">{item.name}</h4>
                    <div className="flex items-center justify-between mt-auto">
                      <div className="flex items-center gap-3 bg-zinc-950 rounded-lg px-2 py-1 border border-white/5">
                        <button 
                          onClick={() => updateQuantity(item.id, -1)}
                          className="text-zinc-600 hover:text-white material-symbols-outlined text-sm font-bold"
                        >
                          remove
                        </button>
                        <span className="font-data-tabular text-xs font-black text-white w-4 text-center">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.id, 1)}
                          className="text-zinc-600 hover:text-white material-symbols-outlined text-sm font-bold"
                        >
                          add
                        </button>
                      </div>
                      <span className="font-data-tabular text-sm font-black text-primary-container">$ {(item.price * item.quantity).toLocaleString()}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => removeFromCart(item.id)}
                    className="absolute -top-2 -right-2 bg-zinc-800 border border-white/10 rounded-full text-zinc-500 hover:text-red-500 w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-xl"
                  >
                    <span className="material-symbols-outlined text-xs font-black">close</span>
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="p-6 bg-zinc-900/80 border-t border-white/10 backdrop-blur-xl space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-zinc-500 font-bold text-[11px] uppercase tracking-widest">
                <span>Subtotal (Neto)</span>
                <span className="font-data-tabular">$ {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-zinc-500 font-bold text-[11px] uppercase tracking-widest">
                <span>IVA (21%)</span>
                <span className="font-data-tabular">$ {iva.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/5">
                <span className="text-sm font-black text-white uppercase tracking-widest">Total ARS</span>
                <span className="font-data-tabular text-3xl font-black text-primary-container tracking-tighter">$ {total.toLocaleString()}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Efectivo', icon: 'payments', color: 'emerald' },
                { label: 'MP', icon: 'qr_code_scanner', color: 'blue' },
                { label: 'Tarjeta', icon: 'credit_card', color: 'orange' },
              ].map((m, i) => (
                <button key={i} className={`bg-zinc-800 hover:bg-zinc-700 border border-white/5 rounded-xl py-4 flex flex-col items-center gap-2 transition-all active:scale-95 group`}>
                  <span className={`material-symbols-outlined text-${m.color}-400 group-hover:scale-110 transition-transform text-xl`}>{m.icon}</span>
                  <span className="font-black text-[9px] text-zinc-500 uppercase tracking-widest group-hover:text-white transition-colors">{m.label}</span>
                </button>
              ))}
            </div>

            <button className="w-full bg-primary-container hover:bg-[#6D28D9] text-white py-5 rounded-2xl font-black text-sm uppercase tracking-[0.3em] flex items-center justify-center gap-3 transition-all shadow-[0_0_40px_rgba(124,58,237,0.3)] active:scale-95 group">
              Confirmar Pago
              <span className="material-symbols-outlined text-xl group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
