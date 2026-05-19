'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/hooks/use-tenant';

interface Product {
  id: string;           // variant_id
  productId: string;    // product_id (for stock reservation lookup)
  name: string;
  sku: string;
  price: number;
  stock: number;
  img: string;
}

interface CartItem extends Product {
  quantity: number;
}

type PaymentMethod = 'efectivo' | 'mercadopago' | 'tarjeta';

export default function POSTerminalPage() {
  const { tenant } = useTenant();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>('efectivo');
  const [processing, setProcessing] = useState(false);
  const [lastOrderNumber, setLastOrderNumber] = useState<number | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Cash Session States
  const [activeSession, setActiveSession] = useState<any>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionName, setSessionName] = useState('Caja #01');
  const [initialAmount, setInitialAmount] = useState('0.00');
  const [user, setUser] = useState<any>(null);
  const [openingSession, setOpeningSession] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  useEffect(() => {
    if (tenant?.id) {
      checkActiveSession();
      fetchProducts();
    }
  }, [tenant]);

  async function checkActiveSession() {
    setSessionLoading(true);
    try {
      const { data, error } = await supabase
        .from('cash_sessions')
        .select('*')
        .eq('tenant_id', tenant!.id)
        .eq('status', 'open')
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setActiveSession(data);
    } catch (err) {
      console.error('Error checking active session:', err);
    } finally {
      setSessionLoading(false);
    }
  }

  async function handleOpenSession(e: React.FormEvent) {
    e.preventDefault();
    if (!tenant?.id || !user?.id) {
      alert('Error: Inquilino o usuario no autenticado');
      return;
    }

    const amt = parseFloat(initialAmount) || 0;
    if (amt < 0) {
      alert('El monto inicial no puede ser negativo');
      return;
    }

    setOpeningSession(true);
    try {
      const { data, error } = await supabase
        .from('cash_sessions')
        .insert({
          tenant_id: tenant.id,
          user_id: user.id,
          name: sessionName || 'Caja #01',
          status: 'open',
          initial_amount: amt,
          expected_amount: amt,
          opened_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      setActiveSession(data);
    } catch (err: any) {
      console.error('Error opening session:', err);
      alert('Error al abrir la caja: ' + err.message);
    } finally {
      setOpeningSession(false);
    }
  }


  async function fetchProducts() {
    if (!tenant?.id) return;
    setLoading(true);
    try {
      // Get variants with their products and inventory levels in a single query
      const { data: variants, error: variantsError } = await supabase
        .from('product_variants')
        .select(`
          id,
          sku,
          price_ars,
          product_id,
          variant_options,
          products!inner (
            id,
            nombre,
            title,
            images,
            online_reserved,
            tenant_id
          ),
          inventory_levels (
            on_hand,
            committed
          )
        `)
        .eq('products.tenant_id', tenant.id);

      if (variantsError) {
        console.error('Error fetching variants:', variantsError.message, variantsError.details, variantsError.code);
        setLoading(false);
        return;
      }

      // Combine data
      const formattedProducts: Product[] = (variants || [])
        .filter((v: any) => !(v.sku || '').startsWith('ML-'))
        .map((variant: any) => {
          const product = variant.products;
          const invs = variant.inventory_levels || [];
          
          // Sum stock across branches (if multiple)
          const onHand = Array.isArray(invs)
            ? invs.reduce((sum: number, inv: any) => sum + (inv.on_hand || 0), 0)
            : 0;
          const reserved = product?.online_reserved || 0;
          
          return {
            id: variant.id,
            productId: variant.product_id,
            name: (() => {
              const baseName = product?.nombre || product?.title || 'Sin nombre';
              if (variant.variant_options && typeof variant.variant_options === 'object') {
                const optsStr = Object.entries(variant.variant_options)
                  .map(([k, v]) => `${k.toUpperCase()}: ${v}`)
                  .join(' | ');
                return optsStr ? `${baseName} (${optsStr})` : baseName;
              }
              return baseName;
            })(),
            sku: variant.sku || 'N/A',
            price: variant.price_ars || 0,
            stock: Math.max(0, onHand - reserved),
            img: product?.images?.[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=400&h=400&auto=format&fit=crop'
          };
        })
        .filter((p: Product) => p.stock > 0);

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
        // Don't allow adding more than stock
        if (existing.quantity >= product.stock) return prev;
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
        // Don't exceed stock
        const maxQty = Math.min(newQty, item.stock);
        return { ...item, quantity: maxQty };
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

  /**
   * CONFIRM PAYMENT — Creates order, order_items, and decrements stock
   */
  async function confirmPayment() {
    if (cart.length === 0 || !tenant?.id || processing) return;

    setProcessing(true);
    try {
      // 1. Get next order number for this tenant
      const { data: lastOrder } = await supabase
        .from('orders')
        .select('number')
        .eq('tenant_id', tenant.id)
        .order('number', { ascending: false })
        .limit(1)
        .maybeSingle();

      const orderNumber = (lastOrder?.number || 0) + 1;

      // 2. Create the order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          tenant_id: tenant.id,
          number: orderNumber,
          status: 'paid',
          financial_status: 'paid',
          fulfillment_status: 'fulfilled',
          channel: 'pos',
          payment_method: selectedPayment,
          subtotal_ars: Math.round(subtotal * 100) / 100,
          tax_ars: Math.round(iva * 100) / 100,
          total_ars: Math.round(total * 100) / 100,
          currency: 'ARS',
          customer_name: 'Consumidor Final',
          notes: `Venta POS - ${selectedPayment.toUpperCase()}`,
          placed_at: new Date().toISOString(),
        })
        .select('id, number')
        .single();

      if (orderError) throw orderError;

      // 3. Create order_items for each cart item
      const orderItems = cart.map(item => ({
        order_id: order.id,
        variant_id: item.id,
        title_snapshot: item.name,
        sku_snapshot: item.sku,
        quantity: item.quantity,
        unit_price_ars: item.price,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error('Error creating order items:', itemsError);
        // Order was created, items failed — log but don't block
      }

      // 4. Decrement stock (on_hand) for each variant
      for (const item of cart) {
        const { error: stockError } = await supabase.rpc('decrement_stock', {
          p_tenant_id: tenant.id,
          p_variant_id: item.id,
          p_quantity: item.quantity,
        });

        // If the RPC doesn't exist, fall back to manual update
        if (stockError) {
          console.warn('RPC decrement_stock not found, using manual update:', stockError.message);
          
          // Get current on_hand
          const { data: currentInv } = await supabase
            .from('inventory_levels')
            .select('on_hand')
            .eq('tenant_id', tenant.id)
            .eq('variant_id', item.id)
            .single();

          if (currentInv) {
            const newOnHand = Math.max(0, (currentInv.on_hand || 0) - item.quantity);
            await supabase
              .from('inventory_levels')
              .update({ on_hand: newOnHand })
              .eq('tenant_id', tenant.id)
              .eq('variant_id', item.id);
          }
        }
      }

      // 5. Success!
      setLastOrderNumber(order.number);
      setShowSuccess(true);
      setCart([]);
      
      // Refresh products to reflect new stock
      await fetchProducts();

      // Auto-hide success after 4 seconds
      setTimeout(() => setShowSuccess(false), 4000);

    } catch (error: any) {
      console.error('Error al procesar pago:', error);
      alert('Error al procesar la venta: ' + (error.message || 'Error desconocido'));
    } finally {
      setProcessing(false);
    }
  }

  const paymentMethods = [
    { key: 'efectivo' as PaymentMethod, label: 'Efectivo', icon: 'payments', color: 'emerald' },
    { key: 'mercadopago' as PaymentMethod, label: 'MP', icon: 'qr_code_scanner', color: 'blue' },
    { key: 'tarjeta' as PaymentMethod, label: 'Tarjeta', icon: 'credit_card', color: 'orange' },
  ];

  if (sessionLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center text-zinc-400 bg-[#121212] gap-4 w-full">
        <div className="w-12 h-12 rounded-full border-4 border-violet-500 border-t-transparent animate-spin"></div>
        <p className="font-black text-xs uppercase tracking-[0.2em] animate-pulse text-zinc-500">Verificando estado de caja...</p>
      </div>
    );
  }

  if (!activeSession) {
    return (
      <div className="flex-1 p-6 lg:p-8 flex items-center justify-center w-full min-h-[calc(100vh-140px)] overflow-y-auto bg-zinc-950/20">
        <div className="w-full max-w-lg bg-[#1A1A1A] border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-600/5 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col gap-6">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 mb-2 shadow-[0_0_20px_rgba(124,58,237,0.2)]">
                <span className="material-symbols-outlined text-3xl">lock_open</span>
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight uppercase">Apertura de Caja</h2>
              <p className="text-sm text-zinc-400 max-w-xs">
                Iniciá un nuevo turno para poder registrar operaciones en el Punto de Venta (POS) de Obsidiana.
              </p>
            </div>

            <form onSubmit={handleOpenSession} className="flex flex-col gap-5 mt-2">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Nombre de Caja / Terminal</label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-violet-400 transition-colors text-lg">point_of_sale</span>
                  <input
                    type="text"
                    required
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-sm text-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition-all placeholder:text-zinc-600"
                    placeholder="Ej. Caja #01"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Monto Inicial de Efectivo (Arqueo Inicial)</label>
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-violet-400 font-bold">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={initialAmount}
                    onChange={(e) => setInitialAmount(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-sm text-white font-data-tabular focus:border-violet-500 focus:ring-1 focus:ring-violet-500 outline-none transition-all"
                    placeholder="0.00"
                  />
                </div>
                <p className="text-[10px] text-zinc-500">Monto de efectivo que se encuentra físicamente en el cajón.</p>
              </div>

              <button
                type="submit"
                disabled={openingSession}
                className="w-full bg-primary-container hover:bg-[#6D28D9] text-white py-4 rounded-xl font-black text-sm uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 mt-2 shadow-[0_0_20px_rgba(124,58,237,0.2)] active:scale-95 disabled:opacity-50"
              >
                {openingSession ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-lg">autorenew</span>
                    Abriendo...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">key</span>
                    Abrir Caja e Iniciar Turno
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] overflow-hidden">
      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed top-6 right-6 z-[100] bg-emerald-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-[slideIn_0.3s_ease-out]">
          <span className="material-symbols-outlined text-2xl">check_circle</span>
          <div>
            <p className="font-black text-sm">¡Venta registrada!</p>
            <p className="text-emerald-100 text-xs">Orden #{lastOrderNumber} — Stock actualizado</p>
          </div>
        </div>
      )}

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
            <span className="text-emerald-400 font-black text-[10px] uppercase tracking-widest">
              Online - {activeSession ? activeSession.name : 'Caja Cerrada'}
            </span>
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
                    {product.img ? (
                      <img src={product.img} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-80" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-4xl text-zinc-700">inventory_2</span>
                      </div>
                    )}
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
              {cart.length > 0 && (
                <span className="bg-primary-container text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                  {cart.reduce((a, i) => a + i.quantity, 0)}
                </span>
              )}
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
                    {item.img ? (
                      <img src={item.img} alt={item.name} className="w-full h-full object-cover opacity-80" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-zinc-600">inventory_2</span>
                      </div>
                    )}
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

            {/* Payment Method Selection */}
            <div className="grid grid-cols-3 gap-3">
              {paymentMethods.map((m) => (
                <button 
                  key={m.key} 
                  onClick={() => setSelectedPayment(m.key)}
                  className={`border rounded-xl py-4 flex flex-col items-center gap-2 transition-all active:scale-95 group ${
                    selectedPayment === m.key 
                      ? `bg-${m.color}-500/20 border-${m.color}-500/50 ring-1 ring-${m.color}-500/30` 
                      : 'bg-zinc-800 hover:bg-zinc-700 border-white/5'
                  }`}
                >
                  <span className={`material-symbols-outlined text-${m.color}-400 group-hover:scale-110 transition-transform text-xl`}>{m.icon}</span>
                  <span className={`font-black text-[9px] uppercase tracking-widest transition-colors ${
                    selectedPayment === m.key ? `text-${m.color}-400` : 'text-zinc-500 group-hover:text-white'
                  }`}>{m.label}</span>
                </button>
              ))}
            </div>

            <button 
              onClick={confirmPayment}
              disabled={cart.length === 0 || processing}
              className="w-full bg-primary-container hover:bg-[#6D28D9] text-white py-5 rounded-2xl font-black text-sm uppercase tracking-[0.3em] flex items-center justify-center gap-3 transition-all shadow-[0_0_40px_rgba(124,58,237,0.3)] active:scale-95 group disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              {processing ? (
                <>
                  <span className="material-symbols-outlined text-xl animate-spin">autorenew</span>
                  Procesando...
                </>
              ) : (
                <>
                  Confirmar Pago
                  <span className="material-symbols-outlined text-xl group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
