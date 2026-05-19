'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { buildPosCheckoutPayload } from '@/lib/pos-checkout';
import Link from 'next/link';

import { useTenant } from '@/hooks/use-tenant';
import { FeatureGate } from '@/components/feature-gate';

interface Product {
  id: string;
  nombre: string;
  precio: number;
  sku: string;
  barcode?: string;
  available: number;
  img?: string;
  product_id?: string;
  variant_options?: Record<string, string>;
}

interface CartItem extends Product {
  quantity: number;
}

interface Customer {
  id: string;
  nombre: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string;
  dni_cuit: string | null;
  document_number: string | null;
  credit_limit: number;
  phone: string | null;
}

type PaymentMethod = 'efectivo' | 'tarjeta' | 'mp' | null;

export default function POSPage() {
  const { tenant } = useTenant();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null);
  const [cashReceived, setCashReceived] = useState('');
  const prevAutoCashRef = useRef<string | null>(null);
  const [discount, setDiscount] = useState(0);
  const [processingSale, setProcessingSale] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Venta a crédito
  const [isCreditSale, setIsCreditSale] = useState(false);
  const [selectedParentProduct, setSelectedParentProduct] = useState<{ productId: string; nombre: string; img?: string; variants: Product[] } | null>(null);
  
  // Cliente seleccionado
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const DEFAULT_CUSTOMER_ID = '54573d5c-23c0-44f3-83e8-78fecdbcb049'; // Consumidor Final

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

  const dataFetchedRef = useRef(false);

  useEffect(() => {
    if (tenant?.id) {
      checkActiveSession();
    }
  }, [tenant?.id]);

  useEffect(() => {
    if (tenant?.id && activeSession && !dataFetchedRef.current) {
      dataFetchedRef.current = true;
      fetchProducts();
      fetchCustomers();
    }
    // Reset the ref when session changes to null (e.g. closed)
    if (!activeSession) {
      dataFetchedRef.current = false;
    }
  }, [tenant?.id, activeSession]);

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

  // Keyboard shortcut: Alt+B to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'b') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // Enter in search adds first product
      if (e.key === 'Enter' && document.activeElement === searchInputRef.current) {
        e.preventDefault();
        const firstProduct = filteredProducts[0];
        if (firstProduct && firstProduct.available > 0) {
          addToCart(firstProduct);
          setSearch('');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [search, products]);

  // Cerrar dropdown de clientes al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (!target.closest('.customer-dropdown-container')) {
        setShowCustomerDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function fetchProducts() {
    if (!tenant?.id) return;
    setLoading(true);
    try {
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
            tenant_id
          )
        `)
        .eq('products.tenant_id', tenant.id);

      if (variantsError) {
        console.error('Error fetching variants:', variantsError.message, variantsError.details, variantsError.code);
        setLoading(false);
        return;
      }

      const variantIds = variants?.map(v => v.id) || [];
      const { data: inventory, error: inventoryError } = await supabase
        .from('inventory_levels')
        .select('variant_id, on_hand, committed')
        .eq('tenant_id', tenant.id)
        .in('variant_id', variantIds);

      if (inventoryError) {
        console.error('Error fetching inventory:', inventoryError);
      }

      const inventoryMap = new Map();
      inventory?.forEach((inv: any) => {
        inventoryMap.set(inv.variant_id, inv);
      });

       const formattedProducts = (variants || []).filter((v: any) => !(v.sku || '').startsWith('ML-')).map((variant: any) => {
        const product = variant.products;
        const inv = inventoryMap.get(variant.id);
        
        return {
          id: variant.id,
          nombre: product?.nombre || product?.title || 'Sin nombre',
          precio: variant.price_ars || 0,
          sku: variant.sku || 'N/A',
          barcode: '', // Temporarily empty since column is missing
          available: (inv?.on_hand || 0) - (inv?.committed || 0),
          img: product?.images?.[0] || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=400&h=400&auto=format&fit=crop',
          product_id: variant.product_id,
          variant_options: variant.variant_options || {}
        };
      });

      setProducts(formattedProducts);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCustomers() {
    if (!tenant?.id) return;
    try {
      // Intenta obtener columnas que podrían existir en diferentes esquemas
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('tenant_id', tenant.id);
        // Eliminamos .order('nombre') porque si la columna no existe fallará la consulta completa

      if (error) {
        console.error('Error fetching customers:', error);
      } else {
        setCustomers(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }

  const addToCart = useCallback((product: Product) => {
    setCart(prevCart => {
      const existing = prevCart.find(item => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.available) {
          alert('No hay suficiente stock disponible');
          return prevCart;
        }
        return prevCart.map(item => 
          item.id === product.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      } else {
        if (product.available <= 0) {
          alert('Producto sin stock');
          return prevCart;
        }
        return [...prevCart, { ...product, quantity: 1 }];
      }
    });
  }, []);

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQuantity = item.quantity + delta;
        if (newQuantity <= 0) return item;
        if (newQuantity > item.available) {
          alert('No hay suficiente stock disponible');
          return item;
        }
        return { ...item, quantity: newQuantity };
      }
      return item;
    }));
  };

  const clearCart = () => {
    if (cart.length === 0) return;
    if (confirm('¿Limpiar el carrito?')) {
      setCart([]);
      setPaymentMethod(null);
      setCashReceived('');
      setDiscount(0);
      setSelectedCustomer(null);
      setCustomerSearch('');
    }
  };

  const subtotal = cart.reduce((acc, item) => acc + (item.precio * item.quantity), 0);
  const iva = subtotal * 0.21;
  const discountAmount = subtotal * (discount / 100);
  const finalTotal = subtotal + iva - discountAmount;
  const change = paymentMethod === 'efectivo' && cashReceived 
    ? Math.max(0, parseFloat(cashReceived) - finalTotal) 
    : 0;

  // Auto-fill cash received when paying cash: prefill with total unless user edits it.
  useEffect(() => {
    const finalStr = finalTotal ? finalTotal.toFixed(2) : '0';
    if (paymentMethod === 'efectivo') {
      if (cashReceived === '' || cashReceived === prevAutoCashRef.current) {
        setCashReceived(finalStr);
        prevAutoCashRef.current = finalStr;
      }
    } else {
      prevAutoCashRef.current = null;
    }
  }, [finalTotal, paymentMethod]);

  const filteredProducts = products.filter(p => 
    p.nombre?.toLowerCase()?.includes(search.toLowerCase()) || 
    p.sku?.toLowerCase()?.includes(search.toLowerCase()) ||
    p.barcode?.toLowerCase()?.includes(search.toLowerCase())
  );

  // Agrupar las variantes por product_id para renderizar productos únicos en la cuadrícula del POS
  const groupedPosProducts: Array<{
    productId: string;
    nombre: string;
    img?: string;
    priceRange: string;
    minPrice: number;
    totalAvailable: number;
    hasVariants: boolean;
    variants: Product[];
  }> = [];

  const posGroupsMap: Record<string, Product[]> = {};

  filteredProducts.forEach(product => {
    const pId = product.product_id || product.id;
    if (!posGroupsMap[pId]) {
      posGroupsMap[pId] = [];
    }
    posGroupsMap[pId].push(product);
  });

  const processedPosProductIds = new Set<string>();

  filteredProducts.forEach(product => {
    const pId = product.product_id || product.id;
    if (!processedPosProductIds.has(pId)) {
      processedPosProductIds.add(pId);
      const variants = posGroupsMap[pId] || [];
      const firstVariant = variants[0];
      if (!firstVariant) return;

      const hasOptions = !!(firstVariant.variant_options && Object.keys(firstVariant.variant_options).length > 0);
      const hasVariants = variants.length > 1 || hasOptions;

      const prices = variants.map(v => v.precio);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const priceRange = minPrice === maxPrice 
        ? `$ ${minPrice.toLocaleString('es-AR')}`
        : `$ ${minPrice.toLocaleString('es-AR')} - $ ${maxPrice.toLocaleString('es-AR')}`;

      const totalAvailable = variants.reduce((acc, curr) => acc + (curr.available || 0), 0);

      groupedPosProducts.push({
        productId: pId,
        nombre: firstVariant.nombre,
        img: firstVariant.img,
        priceRange,
        minPrice,
        totalAvailable,
        hasVariants,
        variants
      });
    }
  });

  async function completeSale() {
    if (cart.length === 0) return;
    
    // Si es el ID por defecto de Consumidor Final, enviamos null para que la DB lo maneje como venta rápida
    const customerId = (selectedCustomer?.id === DEFAULT_CUSTOMER_ID || !selectedCustomer) ? null : selectedCustomer.id;

    if (isCreditSale && !customerId) {
      alert('Las ventas a crédito solo pueden realizarse a clientes registrados. Por favor, seleccioná un cliente.');
      setIsCreditSale(false);
      return;
    }

    // Validar límite de crédito
    if (isCreditSale && (selectedCustomer?.credit_limit || 0) > 0) {
      // Calcular deuda actual del cliente
      const { data: customerOrders } = await supabase
        .from('orders')
        .select('id, total_ars')
        .eq('customer_id', customerId)
        .neq('financial_status', 'paid');

      const orderIds = (customerOrders || []).map((order: any) => order.id);
      const { data: customerPayments } = orderIds.length > 0
        ? await supabase
            .from('payments')
            .select('amount_ars')
            .in('order_id', orderIds)
            .eq('status', 'paid')
        : { data: [] };
      
      const totalDebt = (customerOrders || []).reduce((acc: number, o: any) => acc + (o.total_ars || 0), 0);
      const totalPaid = (customerPayments || []).reduce((acc: number, p: any) => acc + (p.amount_ars || 0), 0);
      const currentPending = totalDebt - totalPaid;
      
      if (currentPending + finalTotal > (selectedCustomer?.credit_limit || 0)) {
        const available = Math.max(0, (selectedCustomer?.credit_limit || 0) - currentPending);
        alert(`Limite de credito excedido. Disponible: $${available.toLocaleString('es-AR')}. Pedido: $${finalTotal.toLocaleString('es-AR')}`);
        return;
      }
    }
    
    // Solo requerir método de pago si NO es venta a crédito
    if (!isCreditSale && !paymentMethod) {
      alert('Seleccioná un método de pago o marcá la venta como Crédito');
      return;
    }
    
    // Validar pago en efectivo solo si NO es crédito
    if (!isCreditSale && paymentMethod === 'efectivo' && (!cashReceived || parseFloat(cashReceived) < finalTotal)) {
      alert('El monto recibido debe ser mayor o igual al total');
      return;
    }

    setProcessingSale(true);
    try {
      const tenantId = tenant?.id || '11111111-1111-1111-1111-111111111111';

      const checkoutPayload = buildPosCheckoutPayload({
        tenantId,
        customerId: customerId, // Ahora puede ser null
        cart,
        discountPercent: discount,
        paymentMethod,
        cashReceived,
        isCreditSale,
      });

      const { data: checkout, error: checkoutError } = await supabase.rpc('complete_pos_checkout', {
        p_tenant_id: checkoutPayload.p_tenant_id,
        p_customer_id: checkoutPayload.p_customer_id,
        p_items: checkoutPayload.p_items,
        p_discount_percent: checkoutPayload.p_discount_percent,
        p_payment_method: checkoutPayload.p_payment_method,
        p_cash_received: checkoutPayload.p_cash_received,
        p_is_credit_sale: checkoutPayload.p_is_credit_sale,
      });

      if (checkoutError) throw checkoutError;

      const checkoutResult = checkout as {
        order_id: string;
        subtotal_ars?: number;
        tax_ars?: number;
        discount_ars?: number;
        total_ars?: number;
      };
      // Guardar datos para el recibo
      setLastSale({
        orderId: checkoutResult.order_id,
        items: cart,
        subtotal: checkoutResult.subtotal_ars ?? subtotal,
        iva: checkoutResult.tax_ars ?? iva,
        discount: checkoutResult.discount_ars ?? discountAmount,
        total: checkoutResult.total_ars ?? finalTotal,
        paymentMethod: isCreditSale ? 'credito' : paymentMethod,
        cashReceived: isCreditSale ? 0 : parseFloat(cashReceived || '0'),
        change,
        date: new Date(),
        isCreditSale
      });

      // Limpiar carrito
      setCart([]);
      setPaymentMethod(null);
      setCashReceived('');
      setDiscount(0);
      setSelectedCustomer(null);
      setCustomerSearch('');
      setIsCreditSale(false);
      setShowReceipt(true);

      // Recargar productos para actualizar stock
      await fetchProducts();

    } catch (error: any) {
      console.error('Error al completar venta:', error);
      alert('Error al procesar la venta: ' + error.message);
    } finally {
      setProcessingSale(false);
    }
  }

  if (sessionLoading) {
    return (
      <div className="h-[calc(100vh-140px)] flex flex-col items-center justify-center text-zinc-400 gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-violet-500 border-t-transparent animate-spin"></div>
        <p className="font-black text-xs uppercase tracking-[0.2em] animate-pulse text-zinc-500">Verificando estado de caja...</p>
      </div>
    );
  }

  if (!activeSession) {
    return (
      <div className="max-w-md mx-auto py-16 px-6">
        <div className="bg-[#1A1A1A] border border-white/10 rounded-3xl p-8 shadow-2xl flex flex-col gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex flex-col items-center text-center gap-2">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center text-primary-container">
              <span className="material-symbols-outlined text-2xl">lock_open</span>
            </div>
            <h2 className="text-xl font-black text-white tracking-tight uppercase mt-2">Apertura de Caja</h2>
            <p className="text-xs text-zinc-400">Ingresá los datos para iniciar el turno de ventas y arqueo físico.</p>
          </div>
          
          <form onSubmit={handleOpenSession} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Nombre / Terminal de Caja</label>
              <input 
                className="w-full bg-zinc-950 border border-white/10 rounded-xl py-3 px-4 text-white text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-zinc-600" 
                type="text" 
                placeholder="Ej: Caja Principal, Caja #02..." 
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                required
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Monto Inicial en Efectivo (ARS)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">$</span>
                <input 
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl py-3 pl-8 pr-4 text-white text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" 
                  type="number" 
                  step="0.01"
                  min="0"
                  value={initialAmount}
                  onChange={(e) => setInitialAmount(e.target.value)}
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={openingSession}
              className="w-full bg-primary-container hover:bg-opacity-90 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 active:scale-95 mt-2"
            >
              {openingSession ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-base">sync</span>
                  Abriendo Caja...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">key</span>
                  Abrir Caja e Iniciar Turno
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <FeatureGate feature="pos">
      <div className="flex flex-col gap-6 h-[calc(100vh-120px)]">
        <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
      {/* Product Selection Area */}
      <div className="flex-1 flex flex-col gap-6 overflow-hidden">
        {/* Search Bar */}
        <div className="relative group">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-violet-400 transition-colors">search</span>
          <input 
            ref={searchInputRef}
            type="text" 
            placeholder="Buscar por nombre, SKU o Cód. Barras... (Alt+B)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#1C1C1C]/80 border border-white/5 rounded-2xl py-4 pl-12 pr-12 text-sm text-white font-medium focus:ring-2 focus:ring-violet-500/50 outline-none transition-all placeholder:text-zinc-600 backdrop-blur-xl shadow-inner shadow-black/10"
          />
          {search && (
            <button 
              onClick={() => setSearch('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          )}
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-5 items-start content-start pr-2 custom-scrollbar">
          {loading ? (
             <div className="col-span-full py-20 text-center text-zinc-500 font-black uppercase tracking-widest animate-pulse">
                Conectando con la base de datos...
             </div>
          ) : groupedPosProducts.length === 0 ? (
            <div className="col-span-full py-20 text-center text-zinc-500 font-black uppercase tracking-widest">
              No se encontraron productos
            </div>
          ) : groupedPosProducts.map((groupedProduct) => {
            const hasVariants = groupedProduct.hasVariants;
            const hasStock = groupedProduct.totalAvailable > 0;
            
            const handleProductClick = () => {
              if (hasVariants) {
                setSelectedParentProduct({
                  productId: groupedProduct.productId,
                  nombre: groupedProduct.nombre,
                  img: groupedProduct.img,
                  variants: groupedProduct.variants
                });
              } else {
                const singleVariant = groupedProduct.variants[0];
                if (singleVariant) addToCart(singleVariant);
              }
            };

            return (
              <div 
                key={groupedProduct.productId}
                onClick={handleProductClick}
                className={`bg-[#1E1E1E]/60 backdrop-blur-md border border-white/5 rounded-3xl p-4 flex flex-col gap-4 cursor-pointer transition-all duration-300 hover:scale-[1.03] active:scale-95 group relative overflow-hidden shadow-lg h-fit ${!hasStock ? 'opacity-50 grayscale pointer-events-none' : 'hover:border-violet-500/30'}`}
              >
                <div className="aspect-square rounded-2xl bg-zinc-950 flex items-center justify-center relative overflow-hidden border border-white/5 group-hover:border-white/10 transition-all duration-300">
                  {groupedProduct.img ? (
                    <img src={groupedProduct.img} alt={groupedProduct.nombre} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90" />
                  ) : (
                    <span className="material-symbols-outlined text-4xl text-zinc-800">image</span>
                  )}
                  <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-md border border-white/10 px-2 py-1 rounded-xl">
                    <span className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1 ${groupedProduct.totalAvailable <= 5 ? 'text-red-400 animate-pulse' : 'text-zinc-300'}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                      Stock: {groupedProduct.totalAvailable}
                    </span>
                  </div>
                  {hasVariants && (
                    <div className="absolute bottom-2 left-2 bg-violet-600/90 backdrop-blur-md border border-violet-500/30 px-2 py-1 rounded-xl">
                      <span className="text-[9px] font-black uppercase tracking-widest text-white flex items-center gap-1">
                        <span className="material-symbols-outlined text-[10px]">layers</span>
                        {groupedProduct.variants.length} Variantes
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col flex-1 gap-1">
                  <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                    {hasVariants ? 'MÚLTIPLES SKUS' : `SKU: ${groupedProduct.variants[0]?.sku || 'N/A'}`}
                  </p>
                  <p className="font-bold text-white leading-snug group-hover:text-violet-400 transition-colors line-clamp-2 text-sm">{groupedProduct.nombre}</p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-white/5 mt-auto">
                  <p className="text-sm font-black text-violet-400 tracking-tight">{groupedProduct.priceRange}</p>
                  <span className="w-8 h-8 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20 group-hover:bg-violet-500 group-hover:text-white transition-all flex items-center justify-center material-symbols-outlined text-lg shadow-lg">
                    {hasVariants ? 'layers' : 'add'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cart / Checkout Sidebar */}
      <div className="w-full lg:w-[420px] h-[calc(100vh-120px)] bg-[#171717]/90 backdrop-blur-2xl border border-white/10 rounded-3xl flex flex-col overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-zinc-900/30">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-violet-400">shopping_cart</span>
            <h2 className="font-black text-white uppercase tracking-widest text-sm">Carrito</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-violet-500/20 text-violet-300 text-[10px] font-black px-3 py-1.5 rounded-full border border-violet-500/30 tracking-widest uppercase">
              {cart.reduce((acc, item) => acc + item.quantity, 0)} unidades
            </span>
            {cart.length > 0 && (
              <button 
                onClick={clearCart}
                className="text-zinc-500 hover:text-red-400 p-2 rounded-xl hover:bg-white/5 transition-all duration-200"
                title="Limpiar carrito"
              >
                <span className="material-symbols-outlined text-lg">delete_sweep</span>
              </button>
            )}
          </div>
        </div>

        {/* Cliente Selector */}
        <div className="px-6 py-4 border-b border-white/5 bg-zinc-900/20 customer-dropdown-container">
          <div className="relative">
            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">Cliente</label>
            <div className="relative">
              <input
                type="text"
                value={selectedCustomer ? (selectedCustomer.nombre || `${selectedCustomer.first_name || ''} ${selectedCustomer.last_name || ''}`.trim() || selectedCustomer.email) : customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setSelectedCustomer(null);
                  setShowCustomerDropdown(true);
                }}
                onFocus={() => setShowCustomerDropdown(true)}
                placeholder="Buscar cliente..."
                className="w-full bg-zinc-950/60 border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40"
              />
              <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600">person_search</span>
            </div>
            
            {/* Dropdown resultados */}
            {showCustomerDropdown && customerSearch && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto backdrop-blur-xl">
                {customers
                  .filter(c => {
                    const searchPattern = customerSearch.toLowerCase();
                    const fullName = (c.nombre || `${c.first_name || ''} ${c.last_name || ''}`.trim() || '').toLowerCase();
                    const document = (c.document_number || c.dni_cuit || '').toLowerCase();
                    return fullName.includes(searchPattern) || c.email?.toLowerCase()?.includes(searchPattern) || document.includes(searchPattern);
                  })
                  .slice(0, 5)
                  .map((customer) => (
                    <button
                      key={customer.id}
                      onClick={() => {
                        setSelectedCustomer(customer);
                        setCustomerSearch('');
                        setShowCustomerDropdown(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-violet-500/20 text-violet-300 flex items-center justify-center text-[10px] font-black uppercase">
                        {(customer.nombre?.[0] || customer.first_name?.[0] || 'C')}
                      </div>
                      <div>
                        <p className="text-white text-sm font-bold leading-tight">
                          {customer.nombre || `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.email}
                        </p>
                        <p className="text-zinc-500 text-[10px] mt-0.5">{customer.document_number || customer.dni_cuit || customer.email}</p>
                      </div>
                    </button>
                  ))}
                {customers.filter(c => {
                  const searchPattern = customerSearch.toLowerCase();
                  const fullName = (c.nombre || '').toLowerCase();
                  return fullName.includes(searchPattern) || c.email?.toLowerCase()?.includes(searchPattern) || c.document_number?.toLowerCase()?.includes(searchPattern);
                }).length === 0 && (
                  <div className="px-4 py-3 text-zinc-500 text-xs">No se encontraron clientes</div>
                )}
              </div>
            )}
            
            {/* Cliente seleccionado info */}
            {selectedCustomer && (
              <div className="mt-2.5 flex items-center justify-between bg-violet-500/5 p-2 rounded-xl border border-violet-500/10">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                    {(selectedCustomer.document_number || selectedCustomer.dni_cuit) && `DOC: ${selectedCustomer.document_number || selectedCustomer.dni_cuit}`}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setSelectedCustomer(null);
                    setCustomerSearch('');
                  }}
                  className="text-[10px] text-red-400 hover:text-red-300 font-black uppercase tracking-widest"
                >
                  Cambiar
                </button>
              </div>
            )}
            {!selectedCustomer && !customerSearch && (
              <div className="mt-2 space-y-1">
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Consumidor Final (por defecto)
                </p>
                <p className="text-[10px] text-amber-500/70 font-medium flex items-center gap-1.5 leading-relaxed">
                  <span className="material-symbols-outlined text-[13px]">info</span>
                  Seleccioná un cliente para ventas a crédito
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-zinc-950/20">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-600 gap-4 opacity-50 select-none">
              <span className="material-symbols-outlined text-6xl">shopping_basket</span>
              <p className="text-[10px] font-black uppercase tracking-widest">El carrito está vacío</p>
            </div>
          ) : cart.map((item) => (
            <div key={item.id} className="flex items-center gap-3 bg-zinc-900/40 p-3.5 rounded-2xl border border-white/5 hover:border-white/10 hover:bg-zinc-900/60 transition-all duration-300 relative group overflow-hidden">
              <div className="w-12 h-12 rounded-xl bg-zinc-950 flex items-center justify-center shrink-0 border border-white/5 overflow-hidden">
                {item.img ? (
                  <img src={item.img} alt={item.nombre} className="w-full h-full object-cover opacity-80" />
                ) : (
                  <span className="material-symbols-outlined text-zinc-700 text-lg">image</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-white truncate leading-tight">{item.nombre}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    $ {item.precio.toLocaleString('es-AR')} c/u
                  </span>
                </div>
              </div>
              
              {/* Quantity Controls */}
              <div className="flex items-center gap-1 bg-black/40 rounded-xl p-1 border border-white/5">
                <button 
                  onClick={() => updateQuantity(item.id, -1)}
                  className="w-6 h-6 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined text-sm font-bold">remove</span>
                </button>
                <span className="w-7 text-center font-black text-white text-sm font-data-tabular">{item.quantity}</span>
                <button 
                  onClick={() => updateQuantity(item.id, 1)}
                  className="w-6 h-6 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined text-sm font-bold">add</span>
                </button>
              </div>

              <div className="text-right min-w-[70px]">
                <p className="font-black text-white text-sm font-data-tabular">$ {(item.precio * item.quantity).toLocaleString('es-AR')}</p>
                <button 
                  onClick={() => removeFromCart(item.id)} 
                  className="text-zinc-600 hover:text-red-400 transition-colors mt-1 hover:bg-red-500/10 p-1 rounded-lg inline-flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-lg">delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 bg-zinc-900/60 border-t border-white/10 backdrop-blur-xl space-y-3 shrink-0">
          {/* Totals */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] tracking-wider font-medium text-zinc-400 uppercase">
              <span>Subtotal + IVA</span>
              <span className="text-white font-black font-data-tabular">$ {(subtotal + iva).toLocaleString('es-AR')}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-[11px] tracking-wider font-bold uppercase text-emerald-400">
                <span>Descuento ({discount}%)</span>
                <span className="font-black font-data-tabular">- $ {discountAmount.toLocaleString('es-AR')}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-1.5 border-t border-white/5 mt-1">
              <span className="text-violet-400 font-black uppercase tracking-[0.2em] text-xs">Total</span>
              <span className="text-2xl font-black text-white tracking-tight font-data-tabular">$ {finalTotal.toLocaleString('es-AR')}</span>
            </div>
          </div>

          {/* Discount & Venta a Crédito combined in a grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Discount */}
            <div className="flex items-center gap-2 bg-zinc-950/60 p-1 rounded-xl border border-white/5">
              <span className="material-symbols-outlined text-zinc-500 ml-1.5 text-base">percent</span>
              <input
                type="number"
                min="0"
                max="100"
                value={discount || ''}
                onChange={(e) => setDiscount(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                placeholder="Dcto %"
                className="w-full bg-transparent border-0 rounded-lg py-1 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-0 font-bold"
              />
            </div>

            {/* Venta a Crédito Switch Compact */}
            <div 
              onClick={() => {
                const isDefaultCustomer = !selectedCustomer || selectedCustomer.id === DEFAULT_CUSTOMER_ID;
                if (isDefaultCustomer) {
                  alert('Para ventas a crédito debés seleccionar un cliente registrado');
                  return;
                }
                setIsCreditSale(!isCreditSale);
                if (!isCreditSale) {
                  setPaymentMethod(null);
                  setCashReceived('');
                }
              }}
              className={`flex items-center justify-between px-3 py-1.5 rounded-xl border cursor-pointer transition-all duration-300 ${
                isCreditSale 
                  ? 'bg-amber-500/10 border-amber-500/40' 
                  : 'bg-zinc-950/40 border-white/5 hover:border-white/10'
              } ${(!selectedCustomer || selectedCustomer.id === DEFAULT_CUSTOMER_ID) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span className={`text-[10px] font-black uppercase tracking-wider ${isCreditSale ? 'text-amber-400' : 'text-zinc-400'}`}>Crédito</span>
              <div className={`w-8 h-4.5 rounded-full p-0.5 transition-all duration-300 flex items-center ${isCreditSale ? 'bg-amber-500' : 'bg-zinc-700'}`}>
                <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform duration-300 ${isCreditSale ? 'translate-x-3.5' : 'translate-x-0'}`} />
              </div>
            </div>
          </div>

          {/* Payment Methods (ocultos si es crédito) */}
          {!isCreditSale && (
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'efectivo', label: 'Efectivo', icon: 'payments' },
                { id: 'tarjeta', label: 'Tarjeta', icon: 'credit_card' },
                { id: 'mp', label: 'Mercado Pago', icon: 'account_balance' }
              ].map((method) => (
                <button 
                  key={method.id}
                  onClick={() => setPaymentMethod(method.id as PaymentMethod)}
                  className={`flex flex-col items-center gap-0.5 py-1.5 rounded-xl border transition-all duration-300 ${
                    paymentMethod === method.id 
                      ? 'bg-violet-500/20 border-violet-500/40 text-violet-300' 
                      : 'bg-zinc-950/60 border-white/5 text-zinc-500 hover:text-white hover:border-white/10 hover:bg-zinc-900/60'
                  }`}
                >
                  <span className={`material-symbols-outlined text-base transition-transform ${paymentMethod === method.id ? 'scale-110' : ''}`}>{method.icon}</span>
                  <span className="text-[8px] font-black uppercase tracking-wider">{method.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Cash Payment - Change Calculation inline and compact */}
          {paymentMethod === 'efectivo' && (
            <div className="flex flex-col gap-1.5 p-2 bg-zinc-950/60 rounded-xl border border-white/5 shadow-inner">
              <div className="flex justify-between items-center">
                <label className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">Monto Recibido</label>
                <input
                  type="number"
                  min={finalTotal}
                  value={cashReceived}
                  onChange={(e) => { setCashReceived(e.target.value); prevAutoCashRef.current = null; }}
                  placeholder={`Min $ ${finalTotal.toLocaleString('es-AR')}`}
                  className="w-32 bg-zinc-900 border border-white/5 rounded-lg px-2 py-1 text-white text-sm font-black text-right focus:outline-none focus:ring-1 focus:ring-violet-500 appearance-none"
                />
              </div>
              {change > 0 && (
                <div className="flex justify-between items-center pt-1 border-t border-white/5 animate-fade-in">
                  <span className="text-emerald-400 font-black uppercase tracking-widest text-[9px]">Cambio</span>
                  <span className="text-sm font-black text-emerald-300 font-data-tabular">$ {change.toLocaleString('es-AR')}</span>
                </div>
              )}
            </div>
          )}

          {/* Confirm Button */}
          <button 
            onClick={completeSale}
            disabled={cart.length === 0 || (!isCreditSale && !paymentMethod) || processingSale}
            className={`w-full h-12 text-xs font-black uppercase tracking-[0.2em] rounded-xl flex items-center justify-center gap-2 shadow-2xl hover:scale-[0.98] transition-all duration-300 disabled:opacity-50 disabled:grayscale disabled:pointer-events-none active:scale-95 flex items-center justify-center gap-2 ${
              isCreditSale 
                ? 'bg-amber-500 hover:bg-amber-600 text-black font-black' 
                : 'bg-violet-600 hover:bg-violet-500 text-white'
            }`}
          >
            {processingSale ? (
              <>
                <span className="material-symbols-outlined animate-spin">refresh</span>
                Procesando...
              </>
            ) : isCreditSale ? (
              <>
                <span className="material-symbols-outlined text-base">account_balance_wallet</span>
                Registrar Crédito
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-base">check_circle</span>
                Confirmar Venta
              </>
            )}
          </button>
        </div>
      </div>

      {/* Receipt Modal */}
      {showReceipt && lastSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white text-black rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="p-6 text-center border-b border-gray-200">
              <h2 className="text-xl font-black">{lastSale.isCreditSale ? 'VENTA A CRÉDITO' : 'RECIBO DE VENTA'}</h2>
              <p className="text-gray-500 text-sm mt-1">Obsidiana POS</p>
              <p className="text-gray-400 text-xs">{lastSale.date.toLocaleString('es-AR')}</p>
              {lastSale.isCreditSale && (
                <div className="mt-2 inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-black uppercase tracking-widest">
                  <span className="material-symbols-outlined text-[14px]">account_balance_wallet</span>
                  Cuenta Corriente
                </div>
              )}
            </div>
            
            <div className="p-6 space-y-3 max-h-[300px] overflow-y-auto">
              {lastSale.items.map((item: CartItem) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <div>
                    <p className="font-medium">{item.nombre}</p>
                    <p className="text-gray-500 text-xs">{item.quantity} x $ {item.precio.toLocaleString('es-AR')}</p>
                  </div>
                  <p className="font-black">$ {(item.precio * item.quantity).toLocaleString('es-AR')}</p>
                </div>
              ))}
            </div>

            <div className="p-6 border-t border-gray-200 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium">$ {lastSale.subtotal.toLocaleString('es-AR')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">IVA (21%)</span>
                <span className="font-medium">$ {lastSale.iva.toLocaleString('es-AR')}</span>
              </div>
              {lastSale.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-emerald-600">Descuento</span>
                  <span className="font-medium text-emerald-600">- $ {lastSale.discount.toLocaleString('es-AR')}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                <span className="font-black text-lg">TOTAL</span>
                <span className="font-black text-xl">$ {lastSale.total.toLocaleString('es-AR')}</span>
              </div>
              
              <div className="pt-2 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Método de Pago</span>
                  <span className={`font-medium uppercase ${lastSale.isCreditSale ? 'text-amber-600' : ''}`}>
                    {lastSale.isCreditSale ? 'Crédito - Cuenta Corriente' : lastSale.paymentMethod}
                  </span>
                </div>
                {!lastSale.isCreditSale && lastSale.paymentMethod === 'efectivo' && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Recibido</span>
                      <span className="font-medium">$ {lastSale.cashReceived.toLocaleString('es-AR')}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-emerald-600 font-medium">Cambio</span>
                      <span className="font-black text-emerald-600">$ {lastSale.change.toLocaleString('es-AR')}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="p-4 bg-gray-50 flex gap-3">
              <Link 
                href={`/pos/tickets/${lastSale.orderId}`}
                className="flex-1 bg-violet-600 hover:bg-violet-500 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all text-center"
              >
                <span className="material-symbols-outlined text-sm">print</span>
                Imprimir
              </Link>
              <button 
                onClick={() => setShowReceipt(false)}
                className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-xl font-black text-xs uppercase tracking-widest"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Visual Variant Explosion/Abanico Selector Modal */}
      {selectedParentProduct && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md transition-all duration-300 animate-in fade-in"
          onClick={() => setSelectedParentProduct(null)}
        >
          <style>{`
            @keyframes variantExplosion {
              0% {
                opacity: 0;
                transform: scale(0.4) translateY(40px);
                filter: blur(10px);
              }
              70% {
                transform: scale(1.08) translateY(-5px);
              }
              100% {
                opacity: 1;
                transform: scale(1) translateY(0);
                filter: none;
              }
            }
            .variant-explode-item {
              animation: variantExplosion 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
            }
          `}</style>
          
          <div 
            className="bg-[#0D0D0E]/95 border border-white/10 rounded-[32px] w-full max-w-2xl overflow-hidden shadow-[0_0_80px_-10px_rgba(139,92,246,0.3)] transition-all duration-300 animate-in zoom-in-95 flex flex-col md:flex-row h-[90vh] md:h-auto max-h-[600px]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left Column: Product Info & Image */}
            <div className="w-full md:w-2/5 bg-zinc-950/50 p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-white/5 relative">
              <div className="w-36 h-36 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center overflow-hidden shadow-2xl">
                {selectedParentProduct.img ? (
                  <img 
                    src={selectedParentProduct.img} 
                    alt={selectedParentProduct.nombre} 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <span className="material-symbols-outlined text-5xl text-zinc-800">image</span>
                )}
              </div>
              <h3 className="font-black text-white text-lg text-center mt-4 leading-snug">{selectedParentProduct.nombre}</h3>
              <p className="text-zinc-500 text-[10px] uppercase font-black tracking-widest mt-1">SELECCIONAR VARIANTE</p>
              
              <button 
                onClick={() => setSelectedParentProduct(null)}
                className="absolute top-4 left-4 w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-sm">arrow_back</span>
              </button>
            </div>

            {/* Right Column: Variant Fan-Out List */}
            <div className="flex-1 p-6 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between pb-4 border-b border-white/5 shrink-0">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Variantes Disponibles</span>
                <span className="px-2 py-0.5 bg-violet-500/10 text-violet-400 text-[9px] font-black uppercase tracking-widest rounded-full border border-violet-500/20">
                  {selectedParentProduct.variants.length} Opciones
                </span>
              </div>
              
              <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1 custom-scrollbar">
                {(() => {
                  const availableVariants = selectedParentProduct.variants.filter(v => v.available > 0);
                  const outOfStockVariants = selectedParentProduct.variants.filter(v => v.available <= 0);

                  return (
                    <>
                      {/* Available variants */}
                      {availableVariants.length > 0 && (
                        <div className="space-y-3">
                          <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest px-1 mb-1.5 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Disponibles ({availableVariants.length})
                          </div>
                          {availableVariants.map((v, index) => {
                            const optionsString = v.variant_options && typeof v.variant_options === 'object'
                              ? Object.entries(v.variant_options)
                                  .map(([key, val]) => `${key.toUpperCase()}: ${String(val).toUpperCase()}`)
                                  .join(' • ')
                              : `SKU: ${v.sku}`;

                            return (
                              <button
                                key={v.id}
                                style={{ animationDelay: `${index * 45}ms` }}
                                onClick={() => {
                                  addToCart(v);
                                  setSelectedParentProduct(null);
                                }}
                                className="variant-explode-item w-full p-4 rounded-2xl border text-left flex items-center justify-between transition-all duration-300 group shadow-lg bg-zinc-900/40 border-white/5 hover:border-violet-500/40 hover:bg-violet-500/[0.03] active:scale-[0.98]"
                              >
                                <div className="flex flex-col gap-1 min-w-0">
                                  <span className="font-bold text-white text-sm group-hover:text-violet-400 transition-colors truncate">
                                    {optionsString}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">
                                      SKU: {v.sku}
                                    </span>
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                                      Stock: {v.available}
                                    </span>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-3 shrink-0">
                                  <span className="font-black text-violet-400 text-base">$ {v.precio.toLocaleString('es-AR')}</span>
                                  <span className="w-8 h-8 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20 group-hover:bg-violet-500 group-hover:text-white transition-all flex items-center justify-center material-symbols-outlined text-sm font-bold">
                                    add
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Out of Stock variants */}
                      {outOfStockVariants.length > 0 && (
                        <div className="space-y-3 mt-6">
                          <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1 mb-1.5 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-700"></span>
                            Sin Stock ({outOfStockVariants.length})
                          </div>
                          {outOfStockVariants.map((v, index) => {
                            const optionsString = v.variant_options && typeof v.variant_options === 'object'
                              ? Object.entries(v.variant_options)
                                  .map(([key, val]) => `${key.toUpperCase()}: ${String(val).toUpperCase()}`)
                                  .join(' • ')
                              : `SKU: ${v.sku}`;

                            return (
                              <button
                                key={v.id}
                                disabled
                                style={{ animationDelay: `${(index + availableVariants.length) * 45}ms` }}
                                className="variant-explode-item w-full p-4 rounded-2xl border border-[#ffffff]/5 text-left flex items-center justify-between transition-all duration-300 group shadow-lg bg-zinc-950/20 opacity-30 grayscale pointer-events-none"
                              >
                                <div className="flex flex-col gap-1 min-w-0">
                                  <span className="font-bold text-zinc-500 text-sm truncate">
                                    {optionsString}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-wider">
                                      SKU: {v.sku}
                                    </span>
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500/80"></span>
                                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                                      Stock: 0
                                    </span>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-3 shrink-0">
                                  <span className="font-black text-zinc-600 text-base">$ {v.precio.toLocaleString('es-AR')}</span>
                                  <span className="w-8 h-8 rounded-xl bg-zinc-900 border border-white/5 text-zinc-700 flex items-center justify-center material-symbols-outlined text-sm font-bold">
                                    close
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
    </FeatureGate>
  );
}
