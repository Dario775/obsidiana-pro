'use client';

import React, { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabase';

interface Product {
  id: string;
  tenant_id: string;
  nombre: string;
  title?: string;
  sku: string;
  precio: number;
  currency: string;
  available_online: boolean;
  online_reserved: number;
  external_url?: string;
}

interface Appearance {
  template: 'classic' | 'minimal' | 'list';
  theme_color: 'violet' | 'blue' | 'emerald' | 'rose' | 'amber' | 'slate';
  font_family: 'sans' | 'serif' | 'mono';
  dark_mode: boolean;
}

const THEME_MAP: Record<string, { primary: string; primaryLight: string; bg: string; text: string }> = {
  violet: { primary: '#8b5cf6', primaryLight: '#a78bfa', bg: 'bg-violet-600', text: '#fff' },
  blue: { primary: '#3b82f6', primaryLight: '#60a5fa', bg: 'bg-blue-600', text: '#fff' },
  emerald: { primary: '#10b981', primaryLight: '#34d399', bg: 'bg-emerald-600', text: '#fff' },
  rose: { primary: '#f43f5e', primaryLight: '#fb7185', bg: 'bg-rose-600', text: '#fff' },
  amber: { primary: '#f59e0b', primaryLight: '#fbbf24', bg: 'bg-amber-600', text: '#000' },
  cyan: { primary: '#06b6d4', primaryLight: '#22d3ee', bg: 'bg-cyan-600', text: '#fff' },
  slate: { primary: '#64748b', primaryLight: '#94a3b8', bg: 'bg-slate-600', text: '#fff' },
};

const FONT_MAP = {
  sans: 'system-ui, sans-serif',
  serif: 'Georgia, serif',
  mono: 'monospace',
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  ARS: '$',
  USD: 'US$',
  EUR: '€',
};

function formatPrice(amount: number, currency?: string): string {
  const symbol = CURRENCY_SYMBOLS[currency || 'ARS'] || '$';
  const formatted = amount.toLocaleString('es-AR', { 
    minimumFractionDigits: 0,
    maximumFractionDigits: 2 
  });
  return symbol + formatted;
}

export default function TiendaPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;
  
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [productStock, setProductStock] = useState<Record<string, number>>({});
  const [cart, setCart] = useState<any[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showAddedToast, setShowAddedToast] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(1);
  const [customerInfo, setCustomerInfo] = useState({ name: '', email: '', phone: '', address: '', city: '', province: '', postalCode: '', notes: '' });
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [processingOrder, setProcessingOrder] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [currentBanner, setCurrentBanner] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [currency, setCurrency] = useState('ARS');
  const [transferConfirmed, setTransferConfirmed] = useState(false);
  const [mpConfirmed, setMpConfirmed] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<Record<string, string>>({});
  const [productAttributes, setProductAttributes] = useState<Record<string, any>>({});
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('all'); // all, local, ml
  const [sortBy, setSortBy] = useState('newest'); // newest, price-asc, price-desc


  const openProduct = (product: any) => {
    setSelectedProduct(product);
    setSelectedImageIndex(0);
  };

  const sendWhatsAppOrder = () => {
    if (!tenant?.store_social_whatsapp) {
      alert('El negocio no tiene configurado un número de WhatsApp en la sección de Redes Sociales.');
      return;
    }

    const itemsText = cart.map(item => `- ${item.quantity}x ${item.nombre || item.title} (${formatPrice(item.precio * item.quantity, currency)})`).join('\n');
    const cartTotal = cart.reduce((acc, item) => acc + (item.precio * item.quantity), 0);
    
    const message = `*NUEVO PEDIDO #${orderNumber}*\n\n` +
      `*Cliente:* ${customerInfo.name}\n` +
      `*Teléfono:* ${customerInfo.phone}\n` +
      `*Dirección:* ${customerInfo.address}, ${customerInfo.city}, ${customerInfo.province}\n\n` +
      `*Productos:*\n${itemsText}\n\n` +
      `*TOTAL:* ${formatPrice(cartTotal, currency)}\n` +
      `*Pago:* ${paymentMethod === 'cash' ? 'Efectivo/Acordar' : (paymentMethod === 'transfer' ? 'Transferencia' : 'Mercado Pago')}\n\n` +
      `_Enviado desde mi tienda online_`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${tenant.store_social_whatsapp.replace(/\D/g, '')}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
  };

  const defaultAppearance: Appearance = {
    template: 'classic',
    theme_color: 'violet',
    font_family: 'sans',
    dark_mode: false,
  };

  const defaultTheme = { primary: '#8b5cf6', primaryLight: '#a78bfa', bg: 'bg-violet-600', text: '#fff' };
  const appearance: Appearance = tenant?.store_appearance || defaultAppearance;
  const currentTheme = THEME_MAP[appearance.theme_color] || defaultTheme;
  const primaryBg = { backgroundColor: currentTheme.primary };
  const primaryText = { color: currentTheme.primary };
  const primaryTextColor = currentTheme.text;
  
  const bgColor = appearance.dark_mode ? '#09090b' : '#ffffff';
  const textColor = appearance.dark_mode ? '#ffffff' : '#000000';
  const cardBg = appearance.dark_mode ? '#18181b' : '#f4f4f5';
  const mutedColor = appearance.dark_mode ? '#a1a1aa' : '#71717a';
  const borderColor = appearance.dark_mode ? 'white/10' : 'zinc-200';
  const inputBg = appearance.dark_mode ? '#27272a' : '#f4f4f5';
  const inputText = appearance.dark_mode ? '#ffffff' : '#18181b';
  
  const fontFamily = FONT_MAP[appearance.font_family] || FONT_MAP.sans;
  
  const headerBg = { backgroundColor: appearance.dark_mode ? 'rgba(9, 9, 11, 0.9)' : 'rgba(255, 255, 255, 0.9)' };
  const headerText = appearance.dark_mode ? '#ffffff' : '#000000';

  useEffect(() => {
    loadTenantData();
  }, [slug]);

  // Auto-cambio de banner cada 7 segundos
  useEffect(() => {
    const banners = tenant?.store_banners || [];
    if (banners.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, 7000);

    return () => clearInterval(interval);
  }, [tenant?.store_banners]);

  async function loadTenantData() {
    try {
      // Obtenemos solo los datos públicos del tenant para evitar filtrar secretos (como el MP Access Token)
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select(`
          id, nombre, slug, status, address, phone, email, logo_url, banner_url,
          store_name, store_description, store_domain, store_active, store_theme,
          store_template, store_banners, store_tagline, store_currency,
          store_min_order_amount, store_shipping_enabled, store_shipping_cost,
          store_shipping_free_threshold, store_social_instagram, store_social_facebook,
          store_social_whatsapp
        `)
        .eq('slug', slug)
        .single();

      if (tenantError || !tenantData) {
        console.error('Tenant load error:', tenantError);
        setLoading(false);
        return;
      }

      console.log('TIENDA LOADED:', tenantData);
      setTenant(tenantData);
      setCurrency(tenantData.store_currency || 'ARS');


      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          *,
          product_variants (id, sku, price_ars)
        `)
        .eq('tenant_id', tenantData.id)
        .eq('available_online', true)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (productsError) {
        console.error('Error loading products:', productsError);
        setLoading(false);
        return;
      }

      const productsWithPrice = (productsData || []).map((p: any) => {
        let seoObj = p.seo;
        if (typeof seoObj === 'string') {
          try { seoObj = JSON.parse(seoObj); } catch(e) { seoObj = {}; }
        }
        return {
          ...p,
          precio: p.product_variants?.[0]?.price_ars || 0,
          sku: p.product_variants?.[0]?.sku || '',
          external_url: seoObj?.ml_url || p.external_url || null,
        };
      });

      setProducts(productsWithPrice);



      const variantIds = productsWithPrice.map((p: any) => p.product_variants?.[0]?.id).filter(Boolean);
      
      if (variantIds.length > 0) {
        const { data: inventoryData } = await supabase
          .from('inventory_levels')
          .select('variant_id, on_hand')
          .in('variant_id', variantIds);

        const stockMap: Record<string, number> = {};
        (inventoryData || []).forEach((inv: any) => {
          const product = productsWithPrice.find((p: any) => p.product_variants?.[0]?.id === inv.variant_id);
          if (product) {
            const reserved = product.online_reserved || 0;
            const onHand = inv.on_hand || 0;
            stockMap[product.id] = reserved > 0 ? reserved : onHand;
          }
        });
        setProductStock(stockMap);
      }



      const { data: attrsData } = await supabase
        .from('product_attributes')
        .select('*, product_attribute_options(*)')
        .eq('tenant_id', tenantData.id)
        .order('sort_order');
      
      if (attrsData) {
        const attrsByProduct: Record<string, any[]> = {};
        (attrsData || []).forEach((attr: any) => {
          const options = attr.product_attribute_options?.sort((a: any, b: any) => a.sort_order - b.sort_order) || [];
          const attrOptions = options.map((o: any) => ({ id: o.id, value: o.value, slug: o.slug, color: o.color }));
          attrsByProduct[attr.slug] = [{ ...attr, options: attrOptions }];
        });
        setProductAttributes(attrsByProduct);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error:', error);
      setLoading(false);
    }
  }

  const filteredProducts = products.filter((p: any) => {
    // Búsqueda por texto
    const query = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || (
      p.nombre?.toLowerCase().includes(query) ||
      p.title?.toLowerCase().includes(query) ||
      p.sku?.toLowerCase().includes(query) ||
      p.description?.toLowerCase().includes(query)
    );

    // Filtro por origen
    const matchesCategory = selectedCategory === 'all' || 
      (selectedCategory === 'ml' && p.external_url) ||
      (selectedCategory === 'local' && !p.external_url);

    return matchesSearch && matchesCategory;
  }).sort((a: any, b: any) => {
    if (sortBy === 'price-asc') return (a.precio || 0) - (b.precio || 0);
    if (sortBy === 'price-desc') return (b.precio || 0) - (a.precio || 0);
    return 0; // newest por defecto (mantener orden DB)
  });

  const cartTotal = cart.reduce((sum, item) => sum + item.precio * item.quantity, 0);
  const shippingCost = tenant?.store_shipping_enabled 
    ? (cartTotal >= (tenant.store_shipping_free_threshold || 0) ? 0 : (tenant.store_shipping_cost || 0))
    : 0;
  const finalTotal = cartTotal + shippingCost;

  const addToCart = (product: any) => {


    const variantKey = Object.values(selectedVariant).join('-') || 'default';
    const cartKey = `${product.id}-${variantKey}`;
    const onlineStock = productStock[product.id] || 999;
    const inCart = cart.find((item) => item.cartKey === cartKey)?.quantity || 0;
    
    if (inCart >= onlineStock) {
      setShowAddedToast(true);
      setTimeout(() => setShowAddedToast(false), 2000);
      return;
    }

    setCart((prev: any[]) => {
      const existing = prev.find((item) => item.cartKey === cartKey);
      if (existing) {
        return prev.map((item) =>
          item.cartKey === cartKey ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, cartKey, variantKey, selectedVariant: { ...selectedVariant }, quantity: 1 }];
    });
    setShowAddedToast(true);
    setTimeout(() => setShowAddedToast(false), 2000);
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev: any[]) => {
      return prev
        .map((item) => {
          if (item.id === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean);
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev: any[]) => prev.filter((item) => item.id !== productId));
  };

  async function handleCheckout() {
    if (!customerInfo.name || !customerInfo.phone) return;
    
    if (paymentMethod === 'transfer' && !transferConfirmed) {
      alert('Por favor confirma que ya transferiste el monto');
      return;
    }
    if (paymentMethod === 'mp' && !mpConfirmed) {
      alert('Por favor confirma que ya realizaste el pago por MercadoPago');
      return;
    }
    
    setProcessingOrder(true);

    try {
      let orderStatus = 'pending';
      let paymentNotes = '';

      if (paymentMethod === 'cash') {
        orderStatus = 'pending_confirmation';
        paymentNotes = 'Pago en efectivo contra entrega';
      } else if (paymentMethod === 'transfer') {
        orderStatus = 'pending_confirmation';
        paymentNotes = 'Transferencia verificada por cliente';
      } else if (paymentMethod === 'mp') {
        orderStatus = 'pending_confirmation';
        paymentNotes = 'MercadoPago verificado por cliente';
      }

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          tenant_id: tenant.id,
          customer_name: customerInfo.name,
          customer_email: customerInfo.email,
          customer_phone: customerInfo.phone,
          customer_address: customerInfo.address,
          customer_city: customerInfo.city,
          customer_province: customerInfo.province,
          customer_postal_code: customerInfo.postalCode,
          payment_method: paymentMethod,
          subtotal_ars: cartTotal,
          shipping_ars: shippingCost,
          total_ars: finalTotal,
          status: orderStatus,
          notes: customerInfo.notes ? `${customerInfo.notes} | ${paymentNotes}` : paymentNotes,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Descontar Stock de Inventario
      for (const item of cart) {
        // Obtenemos el ID de la variante (usamos la primera si no hay variantes específicas seleccionadas)
        // Esto asume que el objeto 'item' tiene la información de sus variantes cargada
        const variantId = item.product_variants?.[0]?.id;
        
        if (variantId) {
          // Consultamos el stock actual de la variante para evitar números negativos
          const { data: invData } = await supabase
            .from('inventory_levels')
            .select('on_hand, online_reserved')
            .eq('variant_id', variantId)
            .single();

          if (invData) {
            const currentOnHand = invData.on_hand || 0;
            const currentReserved = invData.online_reserved || 0;
            
            // Si hay stock reservado para la web, lo priorizamos
            if (currentReserved >= item.quantity) {
              await supabase
                .from('inventory_levels')
                .update({ online_reserved: currentReserved - item.quantity })
                .eq('variant_id', variantId);
            } else {
              // Si no hay reserva suficiente, descontamos del stock físico general
              const newOnHand = Math.max(0, currentOnHand - item.quantity);
              await supabase
                .from('inventory_levels')
                .update({ on_hand: newOnHand })
                .eq('variant_id', variantId);
            }
          }
        }
        
        // También actualizamos el campo online_reserved en products por compatibilidad/legacy
        const prodReserved = item.online_reserved || 0;
        if (prodReserved > 0) {
          await supabase
            .from('products')
            .update({ online_reserved: Math.max(0, prodReserved - item.quantity) })
            .eq('id', item.id);
        }
      }

      const orderItems = cart.map((item: any) => ({
        order_id: orderData.id,
        product_id: item.id,
        quantity: item.quantity,
        price: item.precio,
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
      
      if (itemsError) throw itemsError;

      // 4. Si es Mercado Pago, generar link de pago real
      if (paymentMethod === 'mp') {
        const mpRes = await fetch('/api/checkout/mercadopago', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cart,
            tenantId: tenant.id,
            customerInfo,
            orderId: orderData.id,
          }),
        });

        const mpData = await mpRes.json();
        if (mpData.init_point) {
          window.location.href = mpData.init_point;
          return; // No mostramos el éxito aún, esperamos al return de MP
        } else {
          throw new Error(mpData.error || 'Error al generar pago');
        }
      }

      const orderNum = `ORD-${Date.now().toString().slice(-6)}`;
      setOrderNumber(orderNum);
      setOrderComplete(true);
      setCart([]);
      setCheckoutStep(1);
      setCustomerInfo({ name: '', email: '', phone: '', address: '', city: '', province: '', postalCode: '', notes: '' });
      setTransferConfirmed(false);
      setMpConfirmed(false);
    } catch (error) {
      console.error('Error processing order:', error);
      alert('Error al procesar el pedido. Intenta de nuevo.');
    } finally {
      setProcessingOrder(false);
    }
  }

  const defaultPaymentMethods = [
    { id: 'cash', name: 'Efectivo', icon: 'payments', enabled: true },
    { id: 'transfer', name: 'Transferencia', icon: 'account_balance', enabled: true, config: { bank: '', cbu: '', alias: '' } },
    { id: 'mp', name: 'MercadoPago', icon: 'payment', enabled: true, config: { link: '' } },
  ];
  const paymentMethodsConfig = tenant?.store_payment_methods || [];
  const enabledPaymentMethods = paymentMethodsConfig.length > 0 
    ? paymentMethodsConfig.filter((m: any) => m.enabled)
    : defaultPaymentMethods;

  const transferMethod = enabledPaymentMethods.find((m: any) => m.id === 'transfer');
  const mpMethod = enabledPaymentMethods.find((m: any) => m.id === 'mp');
  const transferConfig = transferMethod?.config || null;
  const mpConfig = mpMethod?.config || null;

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Cargando tienda...</p>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-400">Tienda no encontrada</p>
      </div>
    );
  }

  const tenantBanners = tenant?.store_banners || [];
  const showCarousel = tenantBanners.length > 0;

  return (
    <div className="min-h-screen transition-colors duration-500" style={{ backgroundColor: bgColor, color: textColor, fontFamily }}>
      <style>{`
        @keyframes star-movement {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
        .star-border-container {
          position: relative;
          padding: 1px;
          border-radius: 1rem;
          overflow: hidden;
        }
        .star-border-animation {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 200%;
          height: 200%;
          background: conic-gradient(
            from 0deg,
            transparent 0%,
            transparent 30%,
            ${currentTheme.primary} 40%,
            ${currentTheme.primary} 60%,
            transparent 70%,
            transparent 100%
          );
          animation: star-movement 4s linear infinite;
          opacity: 0;
          transition: opacity 0.3s ease;
          z-index: 0;
        }
        .star-border-container:hover .star-border-animation {
          opacity: 1;
        }
        .star-border-content {
          position: relative;
          z-index: 1;
          background: inherit;
          border-radius: inherit;
        }
      `}</style>
      <header className="sticky top-0 z-50 backdrop-blur-xl shadow-sm border-b" style={{ backgroundColor: appearance.dark_mode ? 'rgba(9, 9, 11, 0.9)' : 'rgba(255, 255, 255, 0.98)', borderColor: appearance.dark_mode ? 'rgba(255,255,255,0.1)' : '#e5e5e5' }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16 gap-4">
            {tenant.store_logo_url ? (
              <a href={`/tienda/${slug}`} className="flex items-center gap-3 shrink-0">
                <img src={tenant.store_logo_url} alt={tenant.store_name} className="h-9 w-auto object-contain" />
              </a>
            ) : (
              <a href={`/tienda/${slug}`} className="text-xl font-black tracking-tighter shrink-0" style={{ color: headerText }}>
                {tenant.store_name || tenant.nombre || 'Mi Tienda'}
              </a>
            )}
            
            <div className="flex-1 max-w-lg mx-8">
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2" style={{ color: mutedColor }}>search</span>
                <input
                  type="text"
                  placeholder="Buscar productos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-full pl-10 pr-4 py-2.5 text-sm transition-all border-2"
                  style={{ 
                    backgroundColor: inputBg, 
                    borderColor: 'transparent',
                    color: inputText 
                  }}
                />
              </div>
            </div>

            <button 
              onClick={() => setShowCart(true)} 
              className="relative p-2 rounded-full transition-colors"
              style={{ color: headerText }}
            >
              <span className="material-symbols-outlined text-2xl">shopping_cart</span>
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {cart.reduce((s, i) => s + i.quantity, 0)}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {showCarousel && (
        <div className="relative h-[300px] md:h-[400px] overflow-hidden">
          {tenantBanners.map((banner: string, idx: number) => (
            <div
              key={idx}
              className={`absolute inset-0 transition-opacity duration-700 ${idx === currentBanner ? 'opacity-100' : 'opacity-0'}`}
            >
              <img src={banner} alt={`Banner ${idx + 1}`} className="w-full h-full object-cover" />
            </div>
          ))}
          {tenantBanners.length > 1 && (
            <>
              <button onClick={() => setCurrentBanner((currentBanner - 1 + tenantBanners.length) % tenantBanners.length)} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors">
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <button onClick={() => setCurrentBanner((currentBanner + 1) % tenantBanners.length)} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors">
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {tenantBanners.map((_: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentBanner(idx)}
                    className={`w-2 h-2 rounded-full transition-colors ${idx === currentBanner ? 'bg-white' : 'bg-white/50'}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {!showCarousel && (
        <section className="py-16 text-center" style={{ backgroundColor: cardBg }}>
          <div className="relative z-10 text-center px-4 max-w-3xl mx-auto">
            <p className="text-xs font-bold tracking-[0.3em] uppercase mb-4" style={primaryText}>Tienda Online</p>
            <h1 className="text-5xl md:text-6xl font-black tracking-tighter mb-4" style={{ color: textColor }}>
              {tenant.store_name || 'Bienvenido'}
            </h1>
            {tenant.store_tagline && (
              <p className="text-xl md:text-2xl mb-4" style={{ color: mutedColor }}>{tenant.store_tagline}</p>
            )}
            {tenant.store_description && (
              <p className="max-w-xl mx-auto text-lg" style={{ color: mutedColor }}>{tenant.store_description}</p>
            )}
          </div>
        </section>
      )}

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
          <div className="flex p-1 rounded-2xl shadow-inner w-full md:w-auto" style={{ backgroundColor: cardBg }}>
            {[
              { id: 'all', label: 'Todos', icon: 'grid_view' },
              { id: 'local', label: 'Tienda Local', icon: 'storefront' },
              { id: 'ml', label: 'Mercado Libre', icon: 'bolt' }
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  selectedCategory === cat.id ? 'shadow-lg text-white scale-105' : 'opacity-50 hover:opacity-100'
                }`}
                style={selectedCategory === cat.id ? primaryBg : { color: textColor }}
              >
                <span className="material-symbols-outlined text-[18px]">{cat.icon}</span>
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-48">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full pl-4 pr-10 py-3 rounded-2xl text-xs font-bold appearance-none focus:outline-none shadow-sm cursor-pointer transition-all"
                style={{ backgroundColor: cardBg, color: textColor }}
              >
                <option value="newest">Más recientes</option>
                <option value="price-asc">Menor precio</option>
                <option value="price-desc">Mayor precio</option>
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">unfold_more</span>
            </div>
            
            <p className="text-[10px] font-black uppercase tracking-widest opacity-40 hidden lg:block" style={{ color: textColor }}>
              {filteredProducts.length} productos
            </p>
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-6xl text-zinc-600 mb-4">inventory_2</span>
            <p className="text-zinc-400">No hay productos disponibles</p>
          </div>
        ) : (
          <>
            {appearance.template === 'classic' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 justify-items-center">
                {filteredProducts.map((product: any) => (
                  <div key={product.id} className="star-border-container group h-full">
                    <div className="star-border-animation" />
                    <article 
                      className="star-border-content max-w-[280px] w-full h-full rounded-2xl overflow-hidden shadow-sm group-hover:shadow-2xl transition-all duration-500 cursor-pointer flex flex-col"
                      style={{ backgroundColor: cardBg }}
                      onClick={() => openProduct(product)}
                    >
                      <div className="relative aspect-square overflow-hidden shrink-0" style={{ backgroundColor: appearance.dark_mode ? '#3f3f46' : '#e5e5e5' }}>
                        {product.images?.[0] ? (
                          <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-6xl" style={{ color: mutedColor }}>image</span>
                          </div>
                        )}
                        {product.external_url && (
                          <div className="absolute top-2 right-2 bg-[#FFE600] text-[#2D3277] px-1.5 py-0.5 rounded-md text-[8px] font-black flex items-center gap-0.5 shadow-md z-10 scale-90">
                            <span className="material-symbols-outlined text-[10px]">bolt</span>
                            ML
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>
                      <div className="p-4 flex-1 flex flex-col">
                        <p className="text-xs font-medium tracking-wider uppercase mb-1" style={{ color: mutedColor }}>
                          {product.external_url ? 'Recomendación ML' : 'Disponible en Tienda'}
                        </p>
                        <h3 className="font-bold text-lg mb-1 line-clamp-2" style={{ color: textColor }}>{product.nombre || product.title}</h3>
                        <p className="text-sm mb-4 line-clamp-2" style={{ color: mutedColor }}>{product.description}</p>
                        
                        <div className="mt-auto flex items-end justify-between">
                          <div>
                            <p className="text-xs line-through" style={{ color: mutedColor }}>{formatPrice((product.precio || 0) * 1.2, currency)}</p>
                            <p className="text-2xl font-bold" style={{ color: textColor }}>{formatPrice(product.precio || 0, currency)}</p>
                          </div>
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              if (product.external_url) {
                                window.open(product.external_url, '_blank');
                              } else {
                                addToCart(product); 
                              }
                            }}
                            className="p-3 rounded-full shadow-lg hover:shadow-xl transition-all text-white flex items-center justify-center"
                            style={product.external_url ? { backgroundColor: '#facc15', color: '#000' } : primaryBg}
                          >
                            <span className="material-symbols-outlined">
                              {product.external_url ? 'open_in_new' : 'add_shopping_cart'}
                            </span>
                          </button>
                        </div>
                      </div>
                    </article>
                  </div>
                ))}
              </div>
            )}

            {appearance.template === 'minimal' && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 justify-items-center">
                {filteredProducts.map((product: any) => (
                  <article 
                    key={product.id}
                    className="w-[200px] rounded-xl overflow-hidden group cursor-pointer"
                    style={{ backgroundColor: cardBg }}
                    onClick={() => openProduct(product)}
                  >
                    <div className="relative aspect-square overflow-hidden" style={{ backgroundColor: appearance.dark_mode ? '#27272a' : '#f4f4f5' }}>
                      {product.images?.[0] ? (
                        <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="material-symbols-outlined text-4xl" style={{ color: mutedColor }}>image</span>
                        </div>
                      )}
                      {product.external_url && (
                        <div className="absolute top-1 right-1 bg-[#FFE600] text-[#2D3277] p-0.5 rounded-md shadow-md z-10 scale-75">
                          <span className="material-symbols-outlined text-[12px]">bolt</span>
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="font-bold text-sm mb-1 truncate" style={{ color: textColor }}>{product.nombre || product.title}</h3>
                      <div className="flex items-center gap-2">
                        <p className="font-bold" style={{ color: currentTheme.primary }}>{formatPrice(product.precio || 0, currency)}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {appearance.template === 'list' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 justify-items-center">
                {filteredProducts.map((product: any) => (
                  <article 
                    key={product.id}
                    className="flex gap-6 max-w-lg w-full rounded-2xl p-6 transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-1 cursor-pointer"
                    style={{ backgroundColor: cardBg }}
                    onClick={() => openProduct(product)}
                  >
                    <div className="w-40 h-40 shrink-0 rounded-xl overflow-hidden shadow-lg" style={{ backgroundColor: appearance.dark_mode ? '#27272a' : '#f4f4f5' }}>
                      {product.images?.[0] ? (
                        <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="material-symbols-outlined text-3xl" style={{ color: mutedColor }}>image</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 flex flex-col">
                        <p className="text-[10px] font-bold tracking-widest uppercase mb-1" style={primaryText}>
                          {product.external_url ? 'Mercado Libre' : 'En Stock'}
                        </p>
                        <h3 className="font-bold text-xl mb-1" style={{ color: textColor }}>{product.nombre || product.title}</h3>
                        <p className="text-sm line-clamp-2 mb-4" style={{ color: mutedColor }}>{product.description}</p>
                        
                        <div className="mt-auto flex items-center justify-between">
                          <p className="text-2xl font-black" style={{ color: textColor }}>{formatPrice(product.precio || 0, currency)}</p>
                          <button
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            if (product.external_url) {
                              window.open(product.external_url, '_blank');
                            } else {
                              addToCart(product); 
                            }
                          }}
                          className="px-6 py-3 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center gap-2"
                          style={product.external_url ? { backgroundColor: '#facc15', color: '#000' } : primaryBg}
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {product.external_url ? 'open_in_new' : 'add_shopping_cart'}
                          </span>
                          {product.external_url ? 'Comprar ahora' : 'Agregar'}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {showCart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: appearance.dark_mode ? 'rgba(0,0,0,0.9)' : 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-xl rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden" style={{ backgroundColor: appearance.dark_mode ? '#09090b' : '#ffffff' }}>
            {orderComplete ? (
              <div className="p-12 text-center flex-1 flex flex-col items-center justify-center">
                <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)' }}>
                  <span className="material-symbols-outlined text-5xl text-emerald-500">check_circle</span>
                </div>
                <h3 className="text-3xl font-bold mb-2" style={{ color: textColor }}>¡Pedido Confirmado!</h3>
                <p className="mb-2" style={{ color: mutedColor }}>Tu número de pedido:</p>
                <p className="text-4xl font-black mb-6 px-8 py-4 rounded-xl" style={{ backgroundColor: cardBg, color: textColor }}>#{orderNumber}</p>
                <p className="text-sm mb-8" style={{ color: mutedColor }}>Para agilizar tu entrega, envíanos el resumen por WhatsApp:</p>
                
                <div className="flex flex-col w-full gap-3">
                  <button 
                    onClick={sendWhatsAppOrder}
                    className="w-full py-4 rounded-xl font-bold text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2" 
                    style={{ backgroundColor: '#25D366' }}
                  >
                    <span className="material-symbols-outlined font-black">chat</span>
                    Enviar por WhatsApp
                  </button>
                  
                  <button 
                    onClick={() => { setShowCart(false); setOrderComplete(false); setCheckoutStep(1); }} 
                    className="w-full py-4 rounded-xl font-bold opacity-60 hover:opacity-100 transition-all" 
                    style={{ color: textColor }}
                  >
                    Cerrar y volver a la tienda
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="p-6 border-b flex items-center justify-between" style={{ backgroundColor: cardBg, borderColor: appearance.dark_mode ? 'rgba(255,255,255,0.1)' : '#e5e5e5' }}>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full" style={checkoutStep >= 1 ? primaryBg : { backgroundColor: appearance.dark_mode ? '#3f3f46' : '#e5e5e5' }} />
                      <span className="w-2 h-2 rounded-full" style={checkoutStep >= 2 ? primaryBg : { backgroundColor: appearance.dark_mode ? '#3f3f46' : '#e5e5e5' }} />
                      <span className="w-2 h-2 rounded-full" style={checkoutStep >= 3 ? primaryBg : { backgroundColor: appearance.dark_mode ? '#3f3f46' : '#e5e5e5' }} />
                    </div>
                    <span className="text-sm font-bold" style={{ color: textColor }}>
                      {checkoutStep === 1 && 'Carrito'}
                      {checkoutStep === 2 && 'Datos'}
                      {checkoutStep === 3 && 'Pago'}
                    </span>
                  </div>
                  <button onClick={() => setShowCart(false)} className="p-2 rounded-lg transition-colors" style={{ color: mutedColor }}>
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                  {checkoutStep === 1 && (
                    <div className="space-y-4">
                      <h3 className="font-bold text-xl mb-4" style={{ color: textColor }}>Tu Carrito</h3>
                      {cart.length === 0 ? (
                        <div className="text-center py-16">
                          <span className="material-symbols-outlined text-6xl mb-4" style={{ color: mutedColor }}>shopping_cart</span>
                          <p style={{ color: mutedColor }}>El carrito está vacío</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {cart.map((item: any) => (
                            <div key={item.id} className="flex gap-4 p-3 rounded-xl" style={{ backgroundColor: cardBg }}>
                              <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0" style={{ backgroundColor: appearance.dark_mode ? '#27272a' : '#f4f4f5' }}>
                                {item.images?.[0] ? (
                                  <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <span className="material-symbols-outlined text-xl" style={{ color: mutedColor }}>image</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-sm truncate" style={{ color: textColor }}>{item.title || item.nombre}</h4>
                                <p className="text-sm" style={{ color: currentTheme.primary }}>{formatPrice(item.precio, currency)}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <button onClick={() => updateQuantity(item.id, -1)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: inputBg, color: inputText }}>
                                  <span className="material-symbols-outlined">remove</span>
                                </button>
                                <span className="w-8 text-center font-bold" style={{ color: textColor }}>{item.quantity}</span>
                                <button onClick={() => updateQuantity(item.id, 1)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: inputBg, color: inputText }}>
                                  <span className="material-symbols-outlined">add</span>
                                </button>
                                <button onClick={() => removeFromCart(item.id)} className="p-2 rounded-lg transition-colors" style={{ color: mutedColor }}>
                                  <span className="material-symbols-outlined">delete</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {checkoutStep === 2 && (
                    <div className="space-y-4">
                      <h3 className="font-bold text-lg mb-4" style={{ color: textColor }}>Datos de Contacto</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                          <label className="block text-xs mb-1" style={{ color: mutedColor }}>Nombre *</label>
                          <input 
                            type="text" 
                            value={customerInfo.name} 
                            onChange={e => setCustomerInfo({ ...customerInfo, name: e.target.value })} 
                            className="w-full rounded-lg px-3 py-2" 
                            style={{ backgroundColor: inputBg, borderColor: appearance.dark_mode ? 'rgba(255,255,255,0.1)' : '#e5e5e5', color: inputText }} 
                            placeholder="Tu nombre" 
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs mb-1" style={{ color: mutedColor }}>Email</label>
                          <input 
                            type="email" 
                            value={customerInfo.email} 
                            onChange={e => setCustomerInfo({ ...customerInfo, email: e.target.value })} 
                            className="w-full rounded-lg px-3 py-2" 
                            style={{ backgroundColor: inputBg, borderColor: appearance.dark_mode ? 'rgba(255,255,255,0.1)' : '#e5e5e5', color: inputText }} 
                            placeholder="email@ejemplo.com" 
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs mb-1" style={{ color: mutedColor }}>Teléfono *</label>
                          <input 
                            type="tel" 
                            value={customerInfo.phone} 
                            onChange={e => setCustomerInfo({ ...customerInfo, phone: e.target.value })} 
                            className="w-full rounded-lg px-3 py-2" 
                            style={{ backgroundColor: inputBg, borderColor: appearance.dark_mode ? 'rgba(255,255,255,0.1)' : '#e5e5e5', color: inputText }} 
                            placeholder="+54 9 11 XXXX XXXX" 
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs mb-1" style={{ color: mutedColor }}>Dirección</label>
                          <input 
                            type="text" 
                            value={customerInfo.address} 
                            onChange={e => setCustomerInfo({ ...customerInfo, address: e.target.value })} 
                            className="w-full rounded-lg px-3 py-2" 
                            style={{ backgroundColor: inputBg, borderColor: appearance.dark_mode ? 'rgba(255,255,255,0.1)' : '#e5e5e5', color: inputText }} 
                            placeholder="Calle y número" 
                          />
                        </div>
                        <div>
                          <label className="block text-xs mb-1" style={{ color: mutedColor }}>Ciudad</label>
                          <input 
                            type="text" 
                            value={customerInfo.city} 
                            onChange={e => setCustomerInfo({ ...customerInfo, city: e.target.value })} 
                            className="w-full rounded-lg px-3 py-2" 
                            style={{ backgroundColor: inputBg, borderColor: appearance.dark_mode ? 'rgba(255,255,255,0.1)' : '#e5e5e5', color: inputText }} 
                            placeholder="Ciudad" 
                          />
                        </div>
                        <div>
                          <label className="block text-xs mb-1" style={{ color: mutedColor }}>Provincia</label>
                          <input 
                            type="text" 
                            value={customerInfo.province} 
                            onChange={e => setCustomerInfo({ ...customerInfo, province: e.target.value })} 
                            className="w-full rounded-lg px-3 py-2" 
                            style={{ backgroundColor: inputBg, borderColor: appearance.dark_mode ? 'rgba(255,255,255,0.1)' : '#e5e5e5', color: inputText }} 
                            placeholder="Provincia" 
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs mb-1" style={{ color: mutedColor }}>Notas / Referencias</label>
                          <textarea 
                            value={customerInfo.notes} 
                            onChange={e => setCustomerInfo({ ...customerInfo, notes: e.target.value })} 
                            className="w-full rounded-lg px-3 py-2" 
                            rows={2} 
                            style={{ backgroundColor: inputBg, borderColor: appearance.dark_mode ? 'rgba(255,255,255,0.1)' : '#e5e5e5', color: inputText }} 
                            placeholder="Entregar en tal horario, tocar timbre, etc." 
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {checkoutStep === 3 && (
                    <div className="space-y-4">
                      <h3 className="font-bold text-lg" style={{ color: textColor }}>Método de Pago</h3>
                      {enabledPaymentMethods.map((method: any) => (
                        <label 
                          key={method.id} 
                          className="flex items-center gap-3 cursor-pointer p-3 rounded-xl" 
                          style={{ backgroundColor: cardBg }}
                        >
                          <input 
                            type="radio" 
                            name="payment" 
                            checked={paymentMethod === method.id} 
                            onChange={() => setPaymentMethod(method.id)} 
                          />
                          <span className="material-symbols-outlined" style={{ color: mutedColor }}>{method.icon}</span>
                          <span style={{ color: textColor }}>{method.name}</span>
                        </label>
                      ))}
                      
                      {paymentMethod === 'transfer' && transferConfig && (
                        <>
                          <div className="rounded-xl p-4 mt-4" style={{ backgroundColor: cardBg }}>
                            <h4 className="font-bold mb-2" style={{ color: textColor }}>Datos para transferir</h4>
                            <p className="text-sm" style={{ color: mutedColor }}>Banco: {transferConfig.bank}</p>
                            <p className="text-sm" style={{ color: mutedColor }}>CBU: {transferConfig.cbu}</p>
                            <p className="text-sm" style={{ color: mutedColor }}>Alias: {transferConfig.alias}</p>
                            <p className="text-sm font-bold mt-2" style={{ color: currentTheme.primary }}>Total a pagar: {formatPrice(finalTotal, currency)}</p>
                          </div>
                          <label className="flex items-center gap-3 p-4 rounded-xl mt-3 cursor-pointer" style={{ backgroundColor: cardBg }}>
                            <input type="checkbox" checked={transferConfirmed} onChange={(e) => setTransferConfirmed(e.target.checked)} />
                            <span style={{ color: textColor }}>Ya transferí el monto total</span>
                          </label>
                        </>
                      )}
                      
                      {paymentMethod === 'mp' && mpConfig && (
                        <div className="space-y-3">
                          <a 
                            href={mpConfig.link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="block text-center py-3 rounded-xl font-bold" 
                            style={{ backgroundColor: currentTheme.primary, color: currentTheme.text }}
                          >
                            Ir a MercadoPago
                          </a>
                          <label className="flex items-center gap-3 p-4 rounded-xl cursor-pointer" style={{ backgroundColor: cardBg }}>
                            <input type="checkbox" checked={mpConfirmed} onChange={(e) => setMpConfirmed(e.target.checked)} />
                            <span style={{ color: textColor }}>Ya realicé el pago por MercadoPago</span>
                          </label>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="p-4 border-t" style={{ borderColor: appearance.dark_mode ? 'rgba(255,255,255,0.1)' : '#e5e5e5' }}>
                  {checkoutStep === 1 && (
                    <>
                      <div className="space-y-2 text-sm mb-4">
                        <div className="flex justify-between">
                          <span style={{ color: mutedColor }}>Subtotal</span>
                          <span style={{ color: textColor }}>{formatPrice(cartTotal, currency)}</span>
                        </div>
                        {tenant.store_shipping_enabled && (
                          <div className="flex justify-between">
                            <span style={{ color: mutedColor }}>Envío</span>
                            <span style={{ color: textColor }}>{shippingCost === 0 ? 'Gratis' : formatPrice(shippingCost, currency)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-bold text-lg pt-2 border-t" style={{ color: textColor, borderColor: appearance.dark_mode ? 'rgba(255,255,255,0.1)' : '#e5e5e5' }}>
                          <span>Total</span>
                          <span>{formatPrice(finalTotal, currency)}</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => setCheckoutStep(2)} 
                        disabled={cart.length === 0} 
                        className="w-full py-4 text-white rounded-xl font-bold disabled:opacity-50" 
                        style={primaryBg}
                      >
                        Continuar
                      </button>
                    </>
                  )}
                  {checkoutStep === 2 && (
                    <div className="flex gap-3">
                      <button 
                        onClick={() => setCheckoutStep(1)} 
                        className="flex-1 py-4 border rounded-xl font-bold" 
                        style={{ borderColor: appearance.dark_mode ? 'rgba(255,255,255,0.1)' : '#e5e5e5', color: textColor }}
                      >
                        Volver
                      </button>
                      <button 
                        onClick={() => setCheckoutStep(3)} 
                        disabled={!customerInfo.name || !customerInfo.phone} 
                        className="flex-1 py-4 text-white rounded-xl font-bold disabled:opacity-50" 
                        style={primaryBg}
                      >
                        Continuar
                      </button>
                    </div>
                  )}
                  {checkoutStep === 3 && (
                    <div className="flex gap-3">
                      <button 
                        onClick={() => setCheckoutStep(2)} 
                        className="flex-1 py-4 border rounded-xl font-bold" 
                        style={{ borderColor: appearance.dark_mode ? 'rgba(255,255,255,0.1)' : '#e5e5e5', color: textColor }}
                      >
                        Volver
                      </button>
                      <button 
                        onClick={handleCheckout} 
                        disabled={processingOrder || (paymentMethod === 'transfer' && !transferConfirmed) || (paymentMethod === 'mp' && !mpConfirmed)} 
                        className="flex-1 py-4 text-white rounded-xl font-bold disabled:opacity-50" 
                        style={primaryBg}
                      >
                        {processingOrder ? 'Procesando...' : 'Confirmar Pedido'}
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {selectedProduct && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm" 
          style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
          onClick={() => { setSelectedProduct(null); setSelectedVariant({}); }}
        >
          <div 
            className="w-full max-w-4xl rounded-3xl overflow-hidden flex flex-col md:flex-row shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in duration-300" 
            style={{ backgroundColor: cardBg }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Gallery Section */}
            <div className="w-full md:w-1/2 flex flex-col" style={{ backgroundColor: appearance.dark_mode ? '#121214' : '#f8f8f8' }}>
              <div className="relative aspect-square overflow-hidden group">
                <img 
                  src={selectedProduct.images?.[selectedImageIndex || 0] || selectedProduct.images?.[0]} 
                  alt={selectedProduct.title} 
                  className="w-full h-full object-contain p-4 hover:scale-110 transition-transform duration-500" 
                />
                {selectedProduct.external_url && (
                  <div className="absolute top-4 left-4 bg-[#FFE600] text-black text-[10px] font-black uppercase px-2 py-1 rounded shadow-lg flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px] font-black">bolt</span>
                    Mercado Libre
                  </div>
                )}
              </div>
              
              {/* Thumbnails */}
              {selectedProduct.images?.length > 1 && (
                <div className="flex gap-2 p-4 overflow-x-auto scrollbar-hide bg-black/5">
                  {selectedProduct.images.map((img: string, idx: number) => (
                    <button 
                      key={idx}
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
                        (selectedImageIndex || 0) === idx ? 'border-yellow-400' : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={img} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Info Section */}
            <div className="p-8 flex-1 flex flex-col relative">
              <button 
                onClick={() => { setSelectedProduct(null); setSelectedVariant({}); }}
                className="absolute top-6 right-6 w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/10 transition-colors"
                style={{ color: mutedColor }}
              >
                <span className="material-symbols-outlined">close</span>
              </button>

              <div className="mb-2">
                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: currentTheme.primary }}>
                  {selectedProduct.external_url ? 'Recomendado' : 'Producto Premium'}
                </p>
              </div>
              
              <h2 className="font-black text-3xl mb-4 leading-tight" style={{ color: textColor }}>
                {selectedProduct.nombre || selectedProduct.title}
              </h2>
              
              <div className="flex-1 overflow-y-auto max-h-[200px] mb-6 scrollbar-hide">
                <p className="text-sm leading-relaxed" style={{ color: mutedColor }}>
                  {selectedProduct.description}
                </p>
              </div>
              
              {/* Variant Selector */}
              {Object.entries(productAttributes).length > 0 && (
                <div className="mb-6 space-y-4">
                  {Object.entries(productAttributes).map(([slug, attr]: [string, any]) => (
                    <div key={slug}>
                      <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: mutedColor }}>{attr[0]?.name}</p>
                      <div className="flex flex-wrap gap-2">
                        {attr[0]?.options?.map((opt: any) => (
                          <button
                            key={opt.id}
                            onClick={() => setSelectedVariant({ ...selectedVariant, [slug]: opt.slug })}
                            className={`px-4 py-2 rounded-xl text-xs font-black transition-all border ${
                              selectedVariant[slug] === opt.slug
                                ? 'border-transparent shadow-lg shadow-yellow-500/20'
                                : 'border-white/5 hover:border-white/20'
                            }`}
                            style={selectedVariant[slug] === opt.slug 
                              ? { backgroundColor: currentTheme.primary, color: '#fff' } 
                              : { backgroundColor: appearance.dark_mode ? '#27272a' : '#f1f1f1', color: mutedColor }
                            }
                          >
                            {attr[0]?.type === 'color' && opt.color && (
                              <span 
                                className="inline-block w-3 h-3 rounded-full mr-2 shadow-sm" 
                                style={{ backgroundColor: opt.color }}
                              />
                            )}
                            {opt.value}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="mt-auto space-y-4">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: mutedColor }}>Precio Final</p>
                    <p className="text-4xl font-black" style={{ color: textColor }}>{formatPrice(selectedProduct.precio || 0, currency)}</p>
                  </div>
                  {selectedProduct.sku && (
                    <p className="text-[10px] font-medium opacity-40 mb-1" style={{ color: textColor }}>REF: {selectedProduct.sku}</p>
                  )}
                </div>

                <button 
                  onClick={() => { 
                    if (selectedProduct.external_url) {
                      window.open(selectedProduct.external_url, '_blank');
                    } else {
                      addToCart(selectedProduct); 
                      setSelectedProduct(null); 
                    }
                  }} 
                  className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 ${
                    selectedProduct.external_url ? 'bg-[#FFE600] text-black' : 'text-white'
                  }`}
                  style={!selectedProduct.external_url ? primaryBg : undefined}
                >
                  <span className="material-symbols-outlined font-black">
                    {selectedProduct.external_url ? 'bolt' : 'shopping_basket'}
                  </span>
                  {selectedProduct.external_url ? 'Comprar en Mercado Libre' : 'Agregar al Pedido'}
                </button>
                
                {selectedProduct.external_url && (
                  <p className="text-[9px] text-center font-bold uppercase tracking-tighter opacity-50" style={{ color: mutedColor }}>
                    Serás redirigido a la publicación oficial para completar tu compra de forma segura.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddedToast && (
        <div className="fixed bottom-4 right-4 z-50 px-6 py-3 rounded-xl shadow-2xl" style={{ backgroundColor: '#10b981', color: 'white' }}>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined">check_circle</span>
            <span>Agregado al carrito</span>
          </div>
        </div>
      )}

      <footer className="border-t mt-16" style={{ backgroundColor: cardBg, borderColor: appearance.dark_mode ? 'rgba(255,255,255,0.1)' : '#e5e5e5' }}>
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 text-center md:text-left">
            <div>
              <h3 className="font-bold mb-4" style={{ color: textColor }}>Información</h3>
              <p className="text-sm mb-2" style={{ color: mutedColor }}>{tenant.nombre}</p>
              {tenant.address && <p className="text-sm" style={{ color: mutedColor }}>{tenant.address}</p>}
            </div>
            <div>
              <h3 className="font-bold mb-4" style={{ color: textColor }}>Contacto</h3>
              {tenant.store_social_whatsapp && (
                <a 
                  href={`https://wa.me/${tenant.store_social_whatsapp.replace(/\D/g, '')}`} 
                  className="text-sm flex items-center gap-2 mb-2" 
                  style={{ color: mutedColor }}
                >
                  <span className="material-symbols-outlined text-[18px]">chat</span>
                  {tenant.store_social_whatsapp}
                </a>
              )}
            </div>
            <div>
              <h3 className="font-bold mb-4" style={{ color: textColor }}>Métodos de Pago</h3>
              <div className="flex gap-3 justify-center md:justify-start">
                <span className="material-symbols-outlined" style={{ color: mutedColor }} title="Efectivo">payments</span>
                <span className="material-symbols-outlined" style={{ color: mutedColor }} title="Transferencia">account_balance</span>
                <span className="material-symbols-outlined" style={{ color: mutedColor }} title="MercadoPago">payment</span>
              </div>
            </div>
          </div>
          <div className="border-t pt-8 text-center" style={{ borderColor: appearance.dark_mode ? 'rgba(255,255,255,0.1)' : '#e5e5e5' }}>
            <p className="text-xs" style={{ color: mutedColor }}>© {new Date().getFullYear()} {tenant.nombre}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}