'use client';

import React, { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabase';

interface Product {
  id: string;
  tenant_id: string;
  title: string;
  slug: string;
  description: string;
  status: string;
  images: string[];
  nombre: string;
  sku: string;
  precio: number;
  currency: string;
  available_online: boolean;
  online_reserved: number;
}

interface Appearance {
  template: 'classic' | 'minimal' | 'list';
  theme_color: 'violet' | 'blue' | 'emerald' | 'rose' | 'amber' | 'slate';
  font_family: 'sans' | 'serif' | 'mono';
  dark_mode: boolean;
}

const THEME_MAP: Record<string, { primary: string; primaryLight: string; bg: string; text: string }> = {
  violet: { primary: '#8b5cf6', primaryLight: '#a78bfa', bg: 'bg-violet-600', text: '#fff' },
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

  async function loadTenantData() {
    try {
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('*, ml_affiliate_id')
        .eq('slug', slug)
        .single();

      if (tenantError || !tenantData) {
        setLoading(false);
        return;
      }

      setTenant(tenantData);
      setCurrency(tenantData.store_currency || 'ARS');
      const affiliateId = tenantData.ml_affiliate_id;

      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          *,
          product_variants (id, sku, price_ars)
        `)
        .eq('tenant_id', tenantData.id)
        .eq('available_online', true)
        .eq('status', 'active');

      if (productsError) {
        console.error('Error loading products:', productsError);
        setLoading(false);
        return;
      }

      const productsWithPrice = (productsData || []).map((p: any) => ({
        ...p,
        precio: p.product_variants?.[0]?.price_ars || 0,
        sku: p.product_variants?.[0]?.sku || '',
      }));

      setProducts(productsWithPrice);

      // Load ML Products
      const { data: mlData } = await supabase
        .from('ml_products')
        .select('*')
        .eq('tenant_id', tenantData.id);

      if (mlData && mlData.length > 0) {
        const itemIds = mlData.map((mp: any) => mp.ml_item_id).filter(Boolean);
        let livePrices: Record<string, { price: number; currency: string }> = {};

        if (itemIds.length > 0) {
          try {
            const pricesRes = await fetch('/api/ml/prices', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                item_ids: itemIds,
                tenant_id: tenantData.id,
              }),
            });
            const pricesData = await pricesRes.json();
            livePrices = pricesData.prices || {};
          } catch (e) {
            console.error('Error fetching live prices:', e);
          }
        }

        const mlProducts = mlData.map((mp: any) => {
          const livePrice = livePrices[mp.ml_item_id];
          const currentPrice = livePrice?.price || mp.price;
          
          let finalAffiliateUrl = '';
          if (affiliateId && mp.permalink) {
            const url = new URL(mp.permalink);
            // MercadoLibre standard affiliate parameters
            url.searchParams.set('matt_tool', affiliateId);
            // Optional: If you had a matt_word stored, you'd set it here too
            // url.searchParams.set('matt_word', affiliateWord); 
            finalAffiliateUrl = url.toString();
          }
          
          return {
            id: `ml-${mp.id}`,
            title: mp.title,
            description: mp.description,
            images: mp.pictures || [mp.thumbnail],
            precio: currentPrice,
            originalPrice: mp.price,
            priceChanged: livePrice && livePrice.price !== mp.price,
            sku: mp.ml_item_id,
            currency: livePrice?.currency || mp.currency,
            isMLProduct: true,
            mlItemId: mp.ml_item_id,
            affiliateUrl: finalAffiliateUrl,
            hasAffiliate: !!affiliateId,
          };
        });
        setProducts([...productsWithPrice, ...mlProducts]);
      }

      const variantIds = productsWithPrice.map((p: any) => p.product_variants?.[0]?.id).filter(Boolean);
      
      if (variantIds.length > 0) {
        const { data: inventoryData } = await supabase
          .from('inventory_levels')
          .select('variant_id, on_hand, online_reserved')
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

      const updateStockFromAffiliate = (clicks: number, productId: string, existingStock: Record<string, number>) => {
        existingStock[productId] = clicks > 0 ? clicks : 1;
      };

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
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      p.title?.toLowerCase().includes(query) ||
      p.nombre?.toLowerCase().includes(query) ||
      p.sku?.toLowerCase().includes(query) ||
      p.description?.toLowerCase().includes(query)
    );
  });

  const cartTotal = cart.reduce((sum, item) => sum + item.precio * item.quantity, 0);
  const shippingCost = tenant?.store_shipping_enabled 
    ? (cartTotal >= (tenant.store_shipping_free_threshold || 0) ? 0 : (tenant.store_shipping_cost || 0))
    : 0;
  const finalTotal = cartTotal + shippingCost;

  const addToCart = (product: any) => {
    // ML Products redirect to Mercado Libre
    if (product.isMLProduct) {
      if (!product.hasAffiliate) {
        // No affiliate configured - show warning
        alert('Esta tienda no tiene configurado su ID de afiliado. No puedes comprar este producto.');
        return;
      }
      
      if (product.affiliateUrl) {
        window.open(product.affiliateUrl, '_blank');
        const productId = product.mlItemId;
        const tenantId = tenant?.id;
        if (productId && tenantId) {
          fetch('/api/ml/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tenant_id: tenantId,
              ml_item_id: productId,
            }),
          }).catch(() => {});
        }
      } else if (product.permalink) {
        window.open(product.permalink, '_blank');
      }
      return;
    }

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
          subtotal: cartTotal,
          shipping_cost: shippingCost,
          total: finalTotal,
          status: orderStatus,
          notes: customerInfo.notes ? `${customerInfo.notes} | ${paymentNotes}` : paymentNotes,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      for (const item of cart) {
        const currentReserved = item.online_reserved || 0;
        const newReserved = Math.max(0, currentReserved - item.quantity);
        
        await supabase
          .from('products')
          .update({ online_reserved: newReserved })
          .eq('id', item.id);
      }

      const orderItems = cart.map((item: any) => ({
        order_id: orderData.id,
        product_id: item.id,
        quantity: item.quantity,
        price: item.precio,
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
      
      if (itemsError) throw itemsError;

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
    <div className="min-h-screen" style={{ backgroundColor: bgColor, color: textColor, fontFamily }}>
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
        <div className="text-center mb-12">
          <p className="text-xs font-bold tracking-[0.2em] uppercase mb-2" style={primaryText}>Catálogo</p>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight" style={{ color: textColor }}>Nuestros Productos</h2>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-6xl text-zinc-600 mb-4">inventory_2</span>
            <p className="text-zinc-400">No hay productos disponibles</p>
          </div>
        ) : (
          <>
            {appearance.template === 'classic' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 justify-items-center">
                {filteredProducts.map((product: any) => (
                  <article 
                    key={product.id} 
                    className="max-w-[280px] w-full rounded-2xl overflow-hidden group hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 cursor-pointer"
                    style={{ backgroundColor: cardBg }}
                    onClick={() => setSelectedProduct(product)}
                  >
                    <div className="relative aspect-square overflow-hidden" style={{ backgroundColor: appearance.dark_mode ? '#3f3f46' : '#e5e5e5' }}>
                      {product.images?.[0] ? (
                        <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="material-symbols-outlined text-6xl" style={{ color: mutedColor }}>image</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                    <div className="p-4">
{product.isMLProduct && (
                          <div className="flex items-center gap-1 mb-1">
                            <span className="text-[10px] bg-yellow-400 text-black px-1.5 py-0.5 rounded font-bold">ML</span>
                            <span className="text-[10px] text-zinc-500">Mercado Libre</span>
                            {!product.hasAffiliate && (
                              <span className="text-[10px] text-red-400 ml-1">Sin afiliado</span>
                            )}
                          </div>
                        )}
                        <p className="text-xs font-medium tracking-wider uppercase mb-1" style={{ color: mutedColor }}>
                          {product.isMLProduct ? 'Afiliado' : 'Disponible'}
                        </p>
                        <h3 className="font-bold text-lg mb-1" style={{ color: textColor }}>{product.title || product.nombre}</h3>
                        <p className="text-sm mb-3 line-clamp-2" style={{ color: mutedColor }}>{product.description}</p>
                        <div className="flex items-end justify-between">
                          <div>
                            {!product.isMLProduct && (
                              <p className="text-xs line-through" style={{ color: mutedColor }}>{formatPrice((product.precio || 0) * 1.2, currency)}</p>
                            )}
                            {product.isMLProduct && product.priceChanged && (
                              <p className="text-xs line-through text-amber-400">{formatPrice(product.originalPrice || 0, currency)}</p>
                            )}
                            <div className="flex items-center gap-2">
                              <p className="text-2xl font-bold" style={{ color: textColor }}>{formatPrice(product.precio || 0, currency)}</p>
                              {product.isMLProduct && (
                                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">LIVE</span>
                              )}
                            </div>
                          </div>
                          <button 
                            onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                            className={`p-3 rounded-full shadow-lg hover:shadow-xl transition-all ${
                              product.isMLProduct ? 'bg-yellow-400 text-black hover:bg-yellow-300' : 'text-white'
                            } ${product.isMLProduct && !product.hasAffiliate ? 'opacity-50 cursor-not-allowed' : ''}`}
                            style={product.isMLProduct ? {} : primaryBg}
                            disabled={product.isMLProduct && !product.hasAffiliate}
                          >
                            <span className="material-symbols-outlined">
                              {product.isMLProduct ? 'open_in_new' : 'add_shopping_cart'}
                            </span>
                          </button>
                        </div>
                    </div>
                  </article>
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
                    onClick={() => setSelectedProduct(product)}
                  >
                    <div className="relative aspect-square overflow-hidden" style={{ backgroundColor: appearance.dark_mode ? '#27272a' : '#f4f4f5' }}>
                      {product.images?.[0] ? (
                        <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="material-symbols-outlined text-4xl" style={{ color: mutedColor }}>image</span>
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="font-bold text-sm mb-1 truncate" style={{ color: textColor }}>{product.title || product.nombre}</h3>
                      <div className="flex items-center gap-2">
                        <p className="font-bold" style={{ color: currentTheme.primary }}>{formatPrice(product.precio || 0, currency)}</p>
                        {product.isMLProduct && (
                          <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-1 rounded">LIVE</span>
                        )}
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
                    onClick={() => setSelectedProduct(product)}
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
                    <div className="flex-1">
                      {product.isMLProduct && (
                        <div className="flex items-center gap-1 mb-1">
                          <span className="text-[10px] bg-yellow-400 text-black px-1.5 py-0.5 rounded font-bold">ML</span>
                          <span className="text-[10px] text-zinc-500">Mercado Libre</span>
                          {!product.hasAffiliate && (
                            <span className="text-[10px] text-red-400 ml-1">Sin afiliado</span>
                          )}
                        </div>
                      )}
                      <p className="text-xs font-medium tracking-wider uppercase mb-1" style={{ color: mutedColor }}>
                        {product.isMLProduct ? 'Afiliado' : 'Disponible'}
                      </p>
                      <h3 className="font-bold text-xl mb-2" style={{ color: textColor }}>{product.title || product.nombre}</h3>
                      <p className="mb-4 line-clamp-2" style={{ color: mutedColor }}>{product.description}</p>
<div className="flex items-end justify-between">
                          <div>
                            {!product.isMLProduct && (
                              <p className="text-xs line-through" style={{ color: mutedColor }}>{formatPrice((product.precio || 0) * 1.15, currency)}</p>
                            )}
                            {product.isMLProduct && product.priceChanged && (
                              <p className="text-xs line-through text-amber-400">{formatPrice(product.originalPrice || 0, currency)}</p>
                            )}
                            <div className="flex items-center gap-2">
                              <p className="text-3xl font-bold" style={{ color: textColor }}>{formatPrice(product.precio || 0, currency)}</p>
                              {product.isMLProduct && (
                                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">LIVE</span>
                              )}
                            </div>
                          </div>
                          <button
                          onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                          className={`px-6 py-3 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all hover:scale-105 ${
                            product.isMLProduct && !product.hasAffiliate ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          style={product.isMLProduct ? { backgroundColor: '#facc15', color: '#000' } : primaryBg}
                          disabled={product.isMLProduct && !product.hasAffiliate}
                        >
                          {product.isMLProduct ? (product.hasAffiliate ? 'Ver en ML' : 'Sin afiliado') : 'Agregar'}
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
                <p className="text-sm mb-8" style={{ color: mutedColor }}>Te contactaremos pronto para confirmar el envío.</p>
                <button 
                  onClick={() => { setShowCart(false); setOrderComplete(false); setCheckoutStep(1); }} 
                  className="px-8 py-4 rounded-xl font-bold text-white shadow-lg hover:shadow-xl transition-all" 
                  style={primaryBg}
                >
                  Continuar Comprando
                </button>
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4" 
          style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
          onClick={() => { setSelectedProduct(null); setSelectedVariant({}); }}
        >
          <div 
            className="w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col md:flex-row" 
            style={{ backgroundColor: cardBg }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full md:w-1/2 aspect-square md:aspect-auto" style={{ backgroundColor: appearance.dark_mode ? '#27272a' : '#f4f4f5' }}>
              {selectedProduct.images?.[0] ? (
                <img src={selectedProduct.images[0]} alt={selectedProduct.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-6xl text-zinc-700">image</span>
                </div>
              )}
            </div>
            <div className="p-8 flex flex-col">
              <p className="text-xs text-zinc-500 font-medium tracking-wider uppercase mb-2">Nuevo</p>
              <h2 className="font-bold text-2xl text-white mb-4">{selectedProduct.title || selectedProduct.nombre}</h2>
              <p className="text-zinc-400 mb-2 flex-1">{selectedProduct.description}</p>
              
              {/* Variant Selector */}
              {Object.entries(productAttributes).length > 0 && (
                <div className="mb-4 space-y-3">
                  {Object.entries(productAttributes).map(([slug, attr]: [string, any]) => (
                    <div key={slug}>
                      <p className="text-xs text-zinc-500 font-bold uppercase mb-2">{attr[0]?.name}</p>
                      <div className="flex flex-wrap gap-2">
                        {attr[0]?.options?.map((opt: any) => (
                          <button
                            key={opt.id}
                            onClick={() => setSelectedVariant({ ...selectedVariant, [slug]: opt.slug })}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              selectedVariant[slug] === opt.slug
                                ? 'text-white'
                                : 'bg-zinc-800 text-zinc-400 hover:text-white'
                            }`}
                            style={selectedVariant[slug] === opt.slug ? primaryBg : undefined}
                          >
                            {attr[0]?.type === 'color' && opt.color && (
                              <span 
                                className="inline-block w-3 h-3 rounded-full mr-1" 
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
              
              {selectedProduct.sku && (
                <p className="text-xs text-zinc-600 mb-2">SKU: {selectedProduct.sku}</p>
              )}
              <div className="mt-auto">
                {selectedProduct.isMLProduct && (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs bg-yellow-400 text-black px-2 py-1 rounded font-bold">ML</span>
                    <span className="text-xs text-zinc-400">Producto de Mercado Libre</span>
                  </div>
                )}
                {selectedProduct.isMLProduct && !selectedProduct.hasAffiliate && (
                  <div className="mb-3 p-2 bg-red-500/20 border border-red-500/30 rounded-lg">
                    <p className="text-xs text-red-400">Esta tienda no tiene afiliado configurado.</p>
                  </div>
                )}
                {!selectedProduct.isMLProduct && (
                  <p className="text-xs text-zinc-500 line-through">{formatPrice((selectedProduct.precio || 0) * 1.2, currency)}</p>
                )}
                <p className="text-3xl font-bold text-white mb-4">{formatPrice(selectedProduct.precio || 0, currency)}</p>
                <button 
                  onClick={() => { addToCart(selectedProduct); setSelectedProduct(null); }} 
                  className={`w-full py-4 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 ${
                    selectedProduct.isMLProduct ? 'bg-yellow-400 text-black hover:bg-yellow-300' : 'text-white'
                  } ${selectedProduct.isMLProduct && !selectedProduct.hasAffiliate ? 'opacity-50 cursor-not-allowed' : ''}`}
                  style={selectedProduct.isMLProduct ? {} : primaryBg}
                  disabled={selectedProduct.isMLProduct && !selectedProduct.hasAffiliate}
                >
                  <span className="material-symbols-outlined">
                    {selectedProduct.isMLProduct ? 'open_in_new' : 'add_shopping_cart'}
                  </span>
                  {selectedProduct.isMLProduct 
                    ? (selectedProduct.hasAffiliate ? 'Ver en Mercado Libre' : 'Sin afiliado')
                    : 'Agregar al Carrito'}
                </button>
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