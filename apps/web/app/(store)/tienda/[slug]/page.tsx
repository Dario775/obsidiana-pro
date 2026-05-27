'use client';

import React, { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabase';
import { uploadImageToCloudinary } from '@/lib/cloudinary';

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
  sans: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  serif: '"Outfit", sans-serif',
  mono: '"Inter", sans-serif',
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
  const [isOwner, setIsOwner] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [productStock, setProductStock] = useState<Record<string, number>>({});
  const [cart, setCart] = useState<any[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showAddedToast, setShowAddedToast] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(1);
  const [customerInfo, setCustomerInfo] = useState({ name: '', email: '', phone: '', address: '', city: '', province: '', postalCode: '', notes: '' });
  const [paymentMethod, setPaymentMethod] = useState('transfer');
  const [processingOrder, setProcessingOrder] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [currentBanner, setCurrentBanner] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [currency, setCurrency] = useState('ARS');
  const [transferConfirmed, setTransferConfirmed] = useState(false);
  const [mpConfirmed, setMpConfirmed] = useState(false);
  const [transferProofUrl, setTransferProofUrl] = useState('');
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState<'pickup' | 'delivery'>('pickup');
  const [matchedZone, setMatchedZone] = useState<any>(null);
  const [isZoneUnsupported, setIsZoneUnsupported] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handlePostalCodeCheck = (pc: string) => {
    if (!pc) {
      setMatchedZone(null);
      setIsZoneUnsupported(false);
      return;
    }
    const zones = tenant?.settings?.store_shipping_zones || [];
    if (zones.length === 0) {
      setMatchedZone(null);
      setIsZoneUnsupported(false);
      return;
    }
    const cleanPC = pc.trim();
    const matched = zones.find((z: any) => 
      Array.isArray(z.postal_codes) && z.postal_codes.some((code: string) => code.trim() === cleanPC)
    );
    if (matched) {
      setMatchedZone(matched);
      setIsZoneUnsupported(false);
    } else {
      setMatchedZone(null);
      setIsZoneUnsupported(true);
    }
  };

  const [selectedVariant, setSelectedVariant] = useState<Record<string, string>>({});
  const [productAttributes, setProductAttributes] = useState<Record<string, any>>({});
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('all'); // all, local, ml
  const [sortBy, setSortBy] = useState('newest'); // newest, price-asc, price-desc


  const getProductAttributesForSelected = (product: any) => {
    if (!product || !product.product_variants || product.product_variants.length === 0) return [];
    const usedSlugs = new Set<string>();
    product.product_variants.forEach((v: any) => {
      if (v.variant_options) {
        Object.keys(v.variant_options).forEach(s => usedSlugs.add(s));
      }
    });

    const result: any[] = [];
    usedSlugs.forEach(slug => {
      const attrGroup = productAttributes[slug];
      if (attrGroup && attrGroup[0]) {
        result.push({
          slug,
          name: attrGroup[0].name,
          type: attrGroup[0].type,
          options: attrGroup[0].options
        });
      }
    });
    return result;
  };

  const getActiveVariant = (product: any) => {
    if (!product || !product.product_variants || product.product_variants.length === 0) return null;
    const match = product.product_variants.find((v: any) => {
      const vOpts = v.variant_options || {};
      return Object.entries(selectedVariant).every(([slug, val]) => vOpts[slug] === val);
    });
    return match || product.product_variants[0];
  };

  const openProduct = (product: any) => {
    setSelectedProduct(product);
    setSelectedImageIndex(0);
    
    const defaultSelection: Record<string, string> = {};
    if (product.product_variants && product.product_variants.length > 0) {
      const firstWithOpts = product.product_variants.find(
        (v: any) => v.variant_options && Object.keys(v.variant_options).length > 0
      );
      if (firstWithOpts) {
        Object.entries(firstWithOpts.variant_options).forEach(([k, v]) => {
          defaultSelection[k] = v as string;
        });
      }
    }
    setSelectedVariant(defaultSelection);
  };

  const sendWhatsAppOrder = () => {
    if (!tenant?.store_social_whatsapp) {
      alert('El negocio no tiene configurado un número de WhatsApp en la sección de Redes Sociales.');
      return;
    }

    const itemsText = cart.map(item => {
      const varText = item.selectedVariantText ? ` [${item.selectedVariantText}]` : '';
      return `- ${item.quantity}x ${item.nombre || item.title}${varText} (${formatPrice(item.precio * item.quantity, currency)})`;
    }).join('\n');
    const cartTotal = cart.reduce((acc, item) => acc + (item.precio * item.quantity), 0);
    
    const deliveryDetails = deliveryMethod === 'pickup'
      ? `*Entrega:* Retiro en Tienda 🏪\n\n`
      : `*Entrega:* Envío a Domicilio 🚚\n` +
        `*Zona:* ${matchedZone?.name || 'Tarifa Estándar'}\n` +
        `*Dirección:* ${customerInfo.address}, ${customerInfo.city}, ${customerInfo.province} (CP: ${customerInfo.postalCode})\n\n`;

    const message = `*NUEVO PEDIDO #${orderNumber}*\n\n` +
      `*Cliente:* ${customerInfo.name}\n` +
      `*Teléfono:* ${customerInfo.phone}\n` +
      deliveryDetails +
      `*Productos:*\n${itemsText}\n\n` +
      `*TOTAL:* ${formatPrice(cartTotal + shippingCost, currency)}\n` +
      `*Pago:* ${paymentMethod === 'cash' ? 'Efectivo/Acordar' : (paymentMethod === 'transfer' ? 'Transferencia Bancaria' : 'Mercado Pago')}\n` +
      (paymentMethod === 'transfer' && transferProofUrl ? `*Comprobante:* ${transferProofUrl}\n\n` : '\n') +
      `_Enviado desde mi tienda online_`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${tenant.store_social_whatsapp.replace(/\D/g, '')}?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingReceipt(true);
    try {
      const res = await uploadImageToCloudinary(file, {
        folder: `obsidiana/${tenant?.id}/receipts`
      });
      if (res && res.secure_url) {
        setTransferProofUrl(res.secure_url);
        setTransferConfirmed(true);
      } else {
        alert('Hubo un error al subir el comprobante. Intenta de nuevo.');
      }
    } catch (err) {
      console.error('Error uploading receipt:', err);
      alert('Error al subir el archivo.');
    } finally {
      setUploadingReceipt(false);
    }
  };

  const defaultAppearance: Appearance = {
    template: 'classic',
    theme_color: 'violet',
    font_family: 'sans',
    dark_mode: false,
  };

  const defaultTheme = { primary: '#8b5cf6', primaryLight: '#a78bfa', bg: 'bg-violet-600', text: '#fff' };
  const appearance: Appearance = {
    ...defaultAppearance,
    ...(tenant?.store_appearance || {})
  };
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
          store_social_whatsapp, store_appearance, store_logo_url, updated_at, settings, store_payment_methods
        `)
        .or(`slug.eq.${slug},store_domain.eq.${slug}`)
        .single();

      if (tenantError || !tenantData) {
        console.error('Tenant load error:', tenantError);
        setLoading(false);
        return;
      }

      console.log('TIENDA LOADED:', tenantData);
      setTenant(tenantData);
      setCurrency(tenantData.store_currency || 'ARS');

      // Check if logged in user is the owner
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const userTenantId = user?.user_metadata?.tenant_id;
        const userIsOwner = userTenantId === tenantData.id;
        setIsOwner(userIsOwner);
      } catch (e) {
        console.error('Error checking store owner:', e);
      }


      let productsData: any[] | null = null;
      let productsError: any = null;

      // Intentamos consultar incluyendo la columna variant_options
      const resWithVariants = await supabase
        .from('products')
        .select(`
          *,
          product_variants (id, sku, price_ars, price_usd, cost_ars, barcode, variant_options)
        `)
        .eq('tenant_id', tenantData.id)
        .eq('available_online', true)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (resWithVariants.error) {
        console.warn('Fallo al cargar variantes con variant_options, intentando fallback sin variant_options:', resWithVariants.error);
        
        // Fallback: consulta sin variant_options para mantener la tienda activa
        const resFallback = await supabase
          .from('products')
          .select(`
            *,
            product_variants (id, sku, price_ars, price_usd, cost_ars, barcode)
          `)
          .eq('tenant_id', tenantData.id)
          .eq('available_online', true)
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        if (resFallback.error) {
          console.error('Error loading products fallback:', resFallback.error);
          setLoading(false);
          return;
        }
        
        // Mockeamos variant_options como un objeto vacío para evitar errores de renderizado
        productsData = (resFallback.data || []).map((p: any) => {
          if (p.product_variants) {
            p.product_variants = p.product_variants.map((v: any) => ({
              ...v,
              variant_options: {}
            }));
          }
          return p;
        });
      } else {
        productsData = resWithVariants.data;
      }

      console.log('PRODUCTS DATA FETCHED:', productsData);

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

      const allVariantIds: string[] = [];
      productsWithPrice.forEach((p: any) => {
        if (p.product_variants) {
          p.product_variants.forEach((v: any) => {
            if (v.id) allVariantIds.push(v.id);
          });
        }
      });
      
      if (allVariantIds.length > 0) {
        const { data: inventoryData } = await supabase
          .from('inventory_levels')
          .select('variant_id, on_hand')
          .in('variant_id', allVariantIds);

        const stockMap: Record<string, number> = {};
        (inventoryData || []).forEach((inv: any) => {
          stockMap[inv.variant_id] = inv.on_hand || 0;
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
      p.nombre?.toLowerCase()?.includes(query) ||
      p.title?.toLowerCase()?.includes(query) ||
      p.sku?.toLowerCase()?.includes(query) ||
      p.description?.toLowerCase()?.includes(query)
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
  const shippingCost = deliveryMethod === 'pickup'
    ? 0
    : (tenant?.store_shipping_enabled 
        ? (cartTotal >= (tenant.store_shipping_free_threshold || 0) ? 0 : (matchedZone ? matchedZone.cost : (tenant.store_shipping_cost || 0)))
        : 0);
  const finalTotal = cartTotal + shippingCost;

  const addToCart = (product: any) => {
    const activeVar = product.product_variants?.find((v: any) => {
      if (!v.variant_options) return false;
      const vOpts = v.variant_options || {};
      return Object.entries(selectedVariant).every(([slug, val]) => vOpts[slug] === val);
    }) || product.product_variants?.[0];

    const variantId = activeVar?.id;
    const variantKey = Object.values(selectedVariant).join('-') || 'default';
    const cartKey = `${product.id}-${variantKey}`;
    const onlineStock = variantId ? (productStock[variantId] ?? 999) : 999;
    const inCart = cart.find((item) => item.cartKey === cartKey)?.quantity || 0;
    
    if (inCart >= onlineStock) {
      setShowAddedToast(true);
      setTimeout(() => setShowAddedToast(false), 2000);
      return;
    }

    const variantName = Object.entries(selectedVariant)
      .map(([slug, valSlug]) => {
        const attrGroup = productAttributes[slug];
        const option = attrGroup?.[0]?.options?.find((o: any) => o.slug === valSlug);
        return option ? `${attrGroup[0].name}: ${option.value}` : '';
      })
      .filter(Boolean)
      .join(' / ');

    setCart((prev: any[]) => {
      const existing = prev.find((item) => item.cartKey === cartKey);
      if (existing) {
        return prev.map((item) =>
          item.cartKey === cartKey ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { 
        ...product, 
        cartKey, 
        variantKey, 
        variantId,
        selectedVariant: { ...selectedVariant }, 
        selectedVariantText: variantName,
        precio: activeVar?.price_ars || product.precio || 0,
        sku: activeVar?.sku || product.sku || '',
        quantity: 1 
      }];
    });
    setShowAddedToast(true);
    setTimeout(() => setShowAddedToast(false), 2000);
  };

  const updateQuantity = (cartKey: string, delta: number) => {
    setCart((prev: any[]) => {
      return prev
        .map((item) => {
          if (item.cartKey === cartKey) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean);
    });
  };

  const removeFromCart = (cartKey: string) => {
    setCart((prev: any[]) => prev.filter((item) => item.cartKey !== cartKey));
  };

  async function handleCheckout() {
    if (!customerInfo.name || !customerInfo.phone) return;
    
    if (paymentMethod === 'transfer' && !transferProofUrl) {
      alert('Por favor sube el comprobante de tu transferencia bancaria para continuar.');
      return;
    }
    
    setProcessingOrder(true);

    try {
      let orderStatus = 'pending';
      let paymentNotes = '';

      if (paymentMethod === 'transfer') {
        orderStatus = 'pending_confirmation';
        paymentNotes = `[Comprobante de Pago]: ${transferProofUrl}`;
      } else if (paymentMethod === 'mp') {
        orderStatus = 'pending_confirmation';
        paymentNotes = 'Pago por MercadoPago (Pendiente de Aprobación)';
      }

      let shippingNotes = deliveryMethod === 'pickup' 
        ? '[Método: Retiro en Tienda]' 
        : `[Método: Envío a Domicilio${matchedZone ? ` - Zona: ${matchedZone.name}` : ''}]`;

      const orderNotesParts = [customerInfo.notes, shippingNotes, paymentNotes].filter(Boolean).join(' | ');

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          tenant_id: tenant.id,
          customer_name: customerInfo.name,
          customer_email: customerInfo.email,
          customer_phone: customerInfo.phone,
          customer_address: deliveryMethod === 'pickup' ? 'Retiro en Tienda' : customerInfo.address,
          customer_city: deliveryMethod === 'pickup' ? 'Salta' : customerInfo.city,
          customer_province: deliveryMethod === 'pickup' ? 'Salta' : customerInfo.province,
          customer_postal_code: deliveryMethod === 'pickup' ? '' : customerInfo.postalCode,
          payment_method: paymentMethod,
          subtotal_ars: cartTotal,
          shipping_ars: shippingCost,
          total_ars: finalTotal,
          status: orderStatus,
          channel: 'online',
          notes: orderNotesParts,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Descontar Stock de Inventario
      for (const item of cart) {
        const variantId = item.variantId || item.product_variants?.[0]?.id;
        
        if (variantId) {
          const { data: invData } = await supabase
            .from('inventory_levels')
            .select('on_hand')
            .eq('variant_id', variantId)
            .single();

          if (invData) {
            const currentOnHand = invData.on_hand || 0;
            const newOnHand = Math.max(0, currentOnHand - item.quantity);
            await supabase
              .from('inventory_levels')
              .update({ on_hand: newOnHand })
              .eq('variant_id', variantId);
          }
        }
        
        const prodReserved = item.online_reserved || 0;
        if (prodReserved > 0) {
          await supabase
            .from('products')
            .update({ online_reserved: Math.max(0, prodReserved - item.quantity) })
            .eq('id', item.id);
        }
      }

      const orderItems = cart.map((item: any) => ({
        tenant_id: tenant.id,
        order_id: orderData.id,
        product_id: item.id || null,
        variant_id: item.variantId || null,
        quantity: item.quantity,
        unit_price_ars: item.precio || 0,
        unit_price: item.precio || 0,
        title_snapshot: item.nombre || item.title || 'Producto',
        sku_snapshot: item.sku || 'N/A',
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
      setTransferProofUrl('');
    } catch (error) {
      console.error('Error processing order:', error);
      alert('Error al procesar el pedido. Intenta de nuevo.');
    } finally {
      setProcessingOrder(false);
    }
  }

  const defaultPaymentMethods = [
    { id: 'transfer', name: 'Transferencia', icon: 'account_balance', enabled: true, config: { bank: '', cbu: '', alias: '' } },
    { id: 'mp', name: 'MercadoPago', icon: 'payment', enabled: true, config: { link: '' } },
  ];
  const paymentMethodsConfig = tenant?.store_payment_methods || [];
  const enabledPaymentMethods = (paymentMethodsConfig.length > 0 
    ? paymentMethodsConfig.filter((m: any) => m.enabled)
    : defaultPaymentMethods).filter((m: any) => m.id !== 'cash');

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

  if (!tenant.store_active && !isOwner) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-zinc-900 border border-white/10 p-8 rounded-3xl text-center space-y-6 shadow-2xl">
          <div className="w-20 h-20 bg-amber-500/15 border border-amber-500/30 text-amber-400 rounded-full flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-4xl">construction</span>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-white">{tenant.store_name || tenant.nombre || 'Tienda Online'}</h1>
            <p className="text-amber-400 font-medium text-sm tracking-wide uppercase">Tienda en mantenimiento</p>
          </div>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Estamos preparando los mejores productos para vos. ¡Volvé a visitarnos muy pronto!
          </p>
          <div className="pt-4 border-t border-white/5">
            <a 
              href="/login" 
              className="inline-flex items-center gap-2 text-xs text-zinc-500 hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-sm">login</span>
              ¿Sos el dueño? Iniciar sesión
            </a>
          </div>
        </div>
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
      {!tenant.store_active && isOwner && (
        <div className="bg-amber-500 text-zinc-950 text-xs font-bold py-2.5 px-4 text-center flex items-center justify-center gap-2 relative z-50">
          <span className="material-symbols-outlined text-[16px] font-bold">warning</span>
          <span>Esta tienda está en modo <strong>Borrador (Inactiva)</strong> y solo vos podés verla. Podés activarla desde el Panel de Administración.</span>
        </div>
      )}
      <header className="sticky top-0 z-50 backdrop-blur-xl shadow-sm border-b" style={{ backgroundColor: appearance.dark_mode ? 'rgba(9, 9, 11, 0.9)' : 'rgba(255, 255, 255, 0.98)', borderColor: appearance.dark_mode ? 'rgba(255,255,255,0.1)' : '#e5e5e5' }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16 gap-4">
            <a href="/" className="flex items-center gap-3 shrink-0 group">
              {tenant.store_logo_url && (
                <img 
                  src={`${tenant.store_logo_url}${tenant.store_logo_url.includes('?') ? '&' : '?'}_t=${tenant.updated_at ? new Date(tenant.updated_at).getTime() : Date.now()}`} 
                  alt={tenant.store_name} 
                  className="h-9 w-auto object-contain transition-transform group-hover:scale-105 duration-300" 
                />
              )}
              <span className="text-xl font-black tracking-tighter transition-colors group-hover:opacity-80" style={{ color: headerText }}>
                {tenant.store_name || tenant.nombre || 'Mi Tienda'}
              </span>
            </a>
            
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

      <main id="products-section" className="max-w-7xl mx-auto px-6 py-12">
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
                                const hasMultiple = product.product_variants && product.product_variants.filter((v: any) => v.variant_options && Object.keys(v.variant_options).length > 0).length > 0;
                                if (hasMultiple) {
                                  openProduct(product);
                                } else {
                                  addToCart(product);
                                }
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
                              const hasMultiple = product.product_variants && product.product_variants.filter((v: any) => v.variant_options && Object.keys(v.variant_options).length > 0).length > 0;
                              if (hasMultiple) {
                                openProduct(product);
                              } else {
                                addToCart(product);
                              }
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
        <div 
          className="fixed inset-0 z-50 flex justify-end backdrop-blur-md transition-all duration-500 ease-in-out" 
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
          onClick={() => setShowCart(false)}
        >
          <div 
            className="w-full sm:max-w-md h-full flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.3)] animate-in slide-in-from-right duration-300 relative border-l" 
            style={{ 
              backgroundColor: appearance.dark_mode ? 'rgba(9, 9, 11, 0.98)' : 'rgba(255, 255, 255, 0.98)',
              borderColor: appearance.dark_mode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
              backdropFilter: 'blur(20px)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {orderComplete ? (
              <div className="p-8 text-center flex-1 flex flex-col items-center justify-center">
                <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-inner" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)' }}>
                  <span className="material-symbols-outlined text-4xl text-emerald-500">check</span>
                </div>
                <h3 className="text-2xl font-black mb-2" style={{ color: textColor }}>¡Pedido Confirmado!</h3>
                <p className="mb-2 text-sm" style={{ color: mutedColor }}>Tu número de pedido:</p>
                <p className="text-3xl font-black mb-6 px-8 py-3 rounded-full border" style={{ 
                  backgroundColor: cardBg, 
                  color: textColor,
                  borderColor: appearance.dark_mode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
                }}>
                  #{orderNumber}
                </p>
                <p className="text-xs mb-8 max-w-xs" style={{ color: mutedColor }}>Para agilizar tu entrega, envíanos el resumen de compra por WhatsApp:</p>
                
                <div className="flex flex-col w-full gap-3">
                  <button 
                    onClick={sendWhatsAppOrder}
                    className="w-full py-4 rounded-full font-black text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 tracking-wide text-xs uppercase" 
                    style={{ backgroundColor: '#25D366' }}
                  >
                    <span className="material-symbols-outlined font-black text-lg">chat</span>
                    Enviar por WhatsApp
                  </button>
                  
                  <button 
                    onClick={() => { setShowCart(false); setOrderComplete(false); setCheckoutStep(1); }} 
                    className="w-full py-4 rounded-full font-bold opacity-60 hover:opacity-100 transition-all text-xs tracking-wider uppercase" 
                    style={{ color: textColor }}
                  >
                    Volver a la tienda
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="flex items-center justify-between w-full border-b pb-4 px-6 pt-6" style={{ borderColor: appearance.dark_mode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-[0.2em] font-black" style={{ color: currentTheme.primary }}>
                      Paso {checkoutStep} de 3
                    </span>
                    <h3 className="font-sans font-black text-xl tracking-tight" style={{ color: textColor }}>
                      {checkoutStep === 1 && 'Tu Carrito'}
                      {checkoutStep === 2 && 'Datos de Envío'}
                      {checkoutStep === 3 && 'Método de Pago'}
                    </h3>
                  </div>
                  <button onClick={() => setShowCart(false)} className="w-10 h-10 rounded-full flex items-center justify-center bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors" style={{ color: textColor }}>
                    <span className="material-symbols-outlined text-lg">close</span>
                  </button>
                </div>

                {/* Micro Stepper Line */}
                <div className="w-full h-1 bg-zinc-100 dark:bg-zinc-900 relative">
                  <div 
                    className="h-full transition-all duration-500 ease-out absolute left-0 top-0" 
                    style={{ 
                      backgroundColor: currentTheme.primary, 
                      width: checkoutStep === 1 ? '33.33%' : checkoutStep === 2 ? '66.66%' : '100%' 
                    }} 
                  />
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                  {checkoutStep === 1 && (
                    <div className="space-y-4">
                      {/* Free Shipping Gamification Progress Bar */}
                      {(() => {
                        const freeShippingThreshold = tenant.store_shipping_free_threshold || 0;
                        if (freeShippingThreshold > 0) {
                          const amountNeeded = freeShippingThreshold - cartTotal;
                          const percentage = Math.min(100, (cartTotal / freeShippingThreshold) * 100);
                          return (
                            <div className="p-4 rounded-2xl mb-4 text-xs font-semibold border transition-all duration-500" style={{ 
                              backgroundColor: appearance.dark_mode ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                              borderColor: appearance.dark_mode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
                            }}>
                              <div className="flex justify-between mb-2">
                                <span style={{ color: mutedColor }}>
                                  {amountNeeded > 0 
                                    ? `Te faltan ${formatPrice(amountNeeded, currency)} para el Envío Gratis` 
                                    : '¡Felicidades! Tenés envío gratis'}
                                </span>
                                <span className="font-bold" style={{ color: currentTheme.primary }}>{Math.round(percentage)}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                                <div 
                                  className="h-full transition-all duration-500 ease-out" 
                                  style={{ 
                                    backgroundColor: currentTheme.primary, 
                                    width: `${percentage}%` 
                                  }} 
                                />
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}

                      {cart.length === 0 ? (
                        <div className="text-center py-16 flex flex-col items-center justify-center">
                          <span className="material-symbols-outlined text-5xl mb-4 opacity-30" style={{ color: textColor }}>local_mall</span>
                          <p className="text-sm font-medium" style={{ color: mutedColor }}>El carrito está vacío</p>
                          <button 
                            onClick={() => setShowCart(false)} 
                            className="mt-6 px-6 py-2 rounded-full border text-xs font-bold uppercase tracking-wider transition-all hover:scale-105 active:scale-95"
                            style={{ 
                              borderColor: appearance.dark_mode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                              color: textColor
                            }}
                          >
                            Ver Productos
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {cart.map((item: any) => (
                            <div key={item.cartKey} className="flex gap-4 p-3 rounded-2xl border transition-all duration-300" style={{ 
                              backgroundColor: appearance.dark_mode ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)',
                              borderColor: appearance.dark_mode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
                            }}>
                              <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border" style={{ 
                                backgroundColor: appearance.dark_mode ? '#1c1c1e' : '#f4f4f5',
                                borderColor: appearance.dark_mode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
                              }}>
                                {item.images?.[0] ? (
                                  <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <span className="material-symbols-outlined text-lg" style={{ color: mutedColor }}>image</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                                <div className="min-w-0">
                                  <h4 className="font-bold text-xs truncate uppercase tracking-wider" style={{ color: textColor }}>{item.title || item.nombre}</h4>
                                  {item.selectedVariantText && (
                                    <p className="text-[9px] opacity-60 font-bold uppercase tracking-tight mt-0.5" style={{ color: currentTheme.primary }}>
                                      {item.selectedVariantText}
                                    </p>
                                  )}
                                  <p className="text-xs mt-0.5 font-bold" style={{ color: currentTheme.primary }}>{formatPrice(item.precio, currency)}</p>
                                </div>
                                <div className="flex items-center justify-between mt-2">
                                  {/* Sleek stepper capsule */}
                                  <div className="flex items-center border rounded-full px-2 py-0.5" style={{ 
                                    backgroundColor: inputBg,
                                    borderColor: appearance.dark_mode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
                                  }}>
                                    <button onClick={() => updateQuantity(item.cartKey, -1)} className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10" style={{ color: textColor }}>
                                      <span className="material-symbols-outlined text-[10px] font-black">remove</span>
                                    </button>
                                    <span className="w-6 text-center text-xs font-bold" style={{ color: textColor }}>{item.quantity}</span>
                                    <button onClick={() => updateQuantity(item.cartKey, 1)} className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10" style={{ color: textColor }}>
                                      <span className="material-symbols-outlined text-[10px] font-black">add</span>
                                    </button>
                                  </div>
                                  <button onClick={() => removeFromCart(item.cartKey)} className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-red-500/10 text-red-400">
                                    <span className="material-symbols-outlined text-lg">delete</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {checkoutStep === 2 && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <label className="block text-[10px] uppercase tracking-wider font-bold mb-1.5" style={{ color: mutedColor }}>Nombre Completo *</label>
                          <input 
                            type="text" 
                            value={customerInfo.name} 
                            onChange={e => setCustomerInfo({ ...customerInfo, name: e.target.value })} 
                            className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-all duration-300 border-2" 
                            style={{ 
                              backgroundColor: inputBg, 
                              borderColor: 'transparent',
                              color: inputText 
                            }} 
                            placeholder="Ingresa tu nombre y apellido" 
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-[10px] uppercase tracking-wider font-bold mb-1.5" style={{ color: mutedColor }}>Email</label>
                          <input 
                            type="email" 
                            value={customerInfo.email} 
                            onChange={e => setCustomerInfo({ ...customerInfo, email: e.target.value })} 
                            className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-all duration-300 border-2" 
                            style={{ 
                              backgroundColor: inputBg, 
                              borderColor: 'transparent', 
                              color: inputText 
                            }} 
                            placeholder="ejemplo@correo.com" 
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-[10px] uppercase tracking-wider font-bold mb-1.5" style={{ color: mutedColor }}>Teléfono Celular *</label>
                          <input 
                            type="tel" 
                            value={customerInfo.phone} 
                            onChange={e => setCustomerInfo({ ...customerInfo, phone: e.target.value })} 
                            className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-all duration-300 border-2" 
                            style={{ 
                              backgroundColor: inputBg, 
                              borderColor: 'transparent', 
                              color: inputText 
                            }} 
                            placeholder="+54 9 11 XXXX XXXX" 
                          />
                        </div>
                        {tenant.store_shipping_enabled && (
                          <div className="col-span-2 space-y-3">
                            <label className="block text-[10px] uppercase tracking-wider font-bold mb-1" style={{ color: mutedColor }}>Método de Entrega *</label>
                            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl border border-white/5" style={{ backgroundColor: inputBg }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setDeliveryMethod('pickup');
                                  setIsZoneUnsupported(false);
                                  setMatchedZone(null);
                                }}
                                className={`py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${deliveryMethod === 'pickup' ? 'text-white shadow' : 'opacity-40 hover:opacity-75'}`}
                                style={deliveryMethod === 'pickup' ? primaryBg : { color: textColor }}
                              >
                                <span className="material-symbols-outlined text-sm">store</span>
                                Retiro en Tienda
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setDeliveryMethod('delivery');
                                  if (customerInfo.postalCode) {
                                    handlePostalCodeCheck(customerInfo.postalCode);
                                  }
                                }}
                                className={`py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${deliveryMethod === 'delivery' ? 'text-white shadow' : 'opacity-40 hover:opacity-75'}`}
                                style={deliveryMethod === 'delivery' ? primaryBg : { color: textColor }}
                              >
                                <span className="material-symbols-outlined text-sm">local_shipping</span>
                                Envío a Domicilio
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Si es retiro en tienda */}
                        {deliveryMethod === 'pickup' && (
                          <div className="col-span-2 p-4 rounded-xl border bg-emerald-500/5 border-emerald-500/10 flex items-start gap-3">
                            <span className="material-symbols-outlined text-emerald-400 mt-0.5">storefront</span>
                            <div className="text-xs">
                              <h5 className="font-bold text-white mb-0.5">Dirección de Retiro</h5>
                              <p className="text-zinc-400 leading-relaxed mb-2">{tenant.address || 'Salta, Argentina'}</p>
                              <span className="text-[10px] uppercase font-black text-emerald-400 tracking-wider">¡El retiro es 100% Gratis! 🎁</span>
                            </div>
                          </div>
                        )}

                        {/* Si es envío a domicilio */}
                        {deliveryMethod === 'delivery' && (
                          <>
                            <div className="col-span-2">
                              <label className="block text-[10px] uppercase tracking-wider font-bold mb-1.5" style={{ color: mutedColor }}>Dirección de Entrega *</label>
                              <input 
                                type="text" 
                                value={customerInfo.address} 
                                onChange={e => setCustomerInfo({ ...customerInfo, address: e.target.value })} 
                                className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-all duration-300 border-2" 
                                style={{ 
                                  backgroundColor: inputBg, 
                                  borderColor: 'transparent', 
                                  color: inputText 
                                }} 
                                placeholder="Calle, número, depto, timbre" 
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] uppercase tracking-wider font-bold mb-1.5" style={{ color: mutedColor }}>Ciudad *</label>
                              <input 
                                type="text" 
                                value={customerInfo.city} 
                                onChange={e => setCustomerInfo({ ...customerInfo, city: e.target.value })} 
                                className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-all duration-300 border-2" 
                                style={{ 
                                  backgroundColor: inputBg, 
                                  borderColor: 'transparent', 
                                  color: inputText 
                                }} 
                                placeholder="Ciudad" 
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] uppercase tracking-wider font-bold mb-1.5" style={{ color: mutedColor }}>Provincia *</label>
                              <input 
                                type="text" 
                                value={customerInfo.province} 
                                onChange={e => setCustomerInfo({ ...customerInfo, province: e.target.value })} 
                                className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-all duration-300 border-2" 
                                style={{ 
                                  backgroundColor: inputBg, 
                                  borderColor: 'transparent', 
                                  color: inputText 
                                }} 
                                placeholder="Provincia" 
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="block text-[10px] uppercase tracking-wider font-bold mb-1.5" style={{ color: mutedColor }}>Código Postal *</label>
                              <input 
                                type="text" 
                                value={customerInfo.postalCode} 
                                onChange={e => {
                                  setCustomerInfo({ ...customerInfo, postalCode: e.target.value });
                                  handlePostalCodeCheck(e.target.value);
                                }} 
                                className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-all duration-300 border-2" 
                                style={{ 
                                  backgroundColor: inputBg, 
                                  borderColor: 'transparent', 
                                  color: inputText 
                                }} 
                                placeholder="Ej: 4400" 
                              />
                            </div>

                            {/* Alertas de Zonas de Envío */}
                            {isZoneUnsupported && (
                              <div className="col-span-2 p-4 rounded-xl border bg-amber-500/5 border-amber-500/20 flex items-start gap-3 animate-pulse">
                                <span className="material-symbols-outlined text-amber-500 mt-0.5">warning</span>
                                <div className="text-xs">
                                  <h5 className="font-bold text-white mb-0.5">Envío No Disponible</h5>
                                  <p className="text-zinc-400 leading-relaxed">Lo sentimos, no realizamos envíos a tu zona. Por favor elige la opción de **Retiro en Tienda** para completar tu compra.</p>
                                </div>
                              </div>
                            )}

                            {matchedZone && (
                              <div className="col-span-2 p-4 rounded-xl border bg-emerald-500/5 border-emerald-500/20 flex items-start gap-3">
                                <span className="material-symbols-outlined text-emerald-400 mt-0.5">local_shipping</span>
                                <div className="text-xs">
                                  <h5 className="font-bold text-white mb-0.5">Zona de Envío Detectada: {matchedZone.name}</h5>
                                  <p className="text-zinc-400 leading-relaxed">Costo de envío para esta zona: **${matchedZone.cost.toLocaleString('es-AR')}**</p>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                        <div className="col-span-2">
                          <label className="block text-[10px] uppercase tracking-wider font-bold mb-1.5" style={{ color: mutedColor }}>Notas Adicionales</label>
                          <textarea 
                            value={customerInfo.notes} 
                            onChange={e => setCustomerInfo({ ...customerInfo, notes: e.target.value })} 
                            className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-all duration-300 border-2" 
                            rows={2} 
                            style={{ 
                              backgroundColor: inputBg, 
                              borderColor: 'transparent', 
                              color: inputText 
                            }} 
                            placeholder="Indicaciones para la entrega o comentarios..." 
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {checkoutStep === 3 && (
                    <div className="space-y-4">
                      <div className="space-y-3">
                        {enabledPaymentMethods.map((method: any) => (
                          <label 
                            key={method.id} 
                            className="flex items-center gap-4 cursor-pointer p-4 rounded-2xl border transition-all duration-300 hover:scale-[1.01]" 
                            style={{ 
                              backgroundColor: paymentMethod === method.id 
                                ? (appearance.dark_mode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)') 
                                : 'transparent',
                              borderColor: paymentMethod === method.id 
                                ? currentTheme.primary 
                                : (appearance.dark_mode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)')
                            }}
                          >
                            <input 
                              type="radio" 
                              name="payment" 
                              checked={paymentMethod === method.id} 
                              onChange={() => setPaymentMethod(method.id)} 
                              className="w-4 h-4"
                              style={{ accentColor: currentTheme.primary }}
                            />
                            <span className="material-symbols-outlined text-xl" style={{ color: paymentMethod === method.id ? currentTheme.primary : mutedColor }}>{method.icon}</span>
                            <div className="flex-1">
                              <span className="font-bold text-xs uppercase tracking-wider block" style={{ color: textColor }}>{method.name}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                      
                      {paymentMethod === 'transfer' && transferConfig && (
                        <div className="animate-in fade-in slide-in-from-top-4 duration-300 space-y-4">
                          <div className="rounded-2xl p-5 border space-y-3.5" style={{ 
                            backgroundColor: cardBg, 
                            borderColor: appearance.dark_mode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' 
                          }}>
                            <h4 className="font-black text-xs uppercase tracking-wider flex items-center gap-1.5" style={{ color: textColor }}>
                              <span className="material-symbols-outlined text-sm" style={{ color: currentTheme.primary }}>account_balance</span>
                              Datos de Transferencia
                            </h4>
                            <div className="h-px w-full" style={{ backgroundColor: appearance.dark_mode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }} />
                            
                            <div className="space-y-3 pt-1">
                              {/* Banco */}
                              <div className="flex justify-between items-center text-xs">
                                <span style={{ color: mutedColor }}>Banco:</span>
                                <strong style={{ color: textColor }} className="text-sm font-bold">{transferConfig.bank}</strong>
                              </div>

                              {/* Titular de la Cuenta */}
                              {transferConfig.holder && (
                                <div className="flex justify-between items-center text-xs">
                                  <span style={{ color: mutedColor }}>Titular:</span>
                                  <strong style={{ color: textColor }} className="text-sm font-bold">{transferConfig.holder}</strong>
                                </div>
                              )}

                              {/* Nro de Cuenta */}
                              {transferConfig.account && (
                                <div className="flex justify-between items-center text-xs">
                                  <span style={{ color: mutedColor }}>Nro Cuenta:</span>
                                  <strong style={{ color: textColor }} className="text-xs font-semibold">{transferConfig.account}</strong>
                                </div>
                              )}

                              {/* CBU / CVU con Copiar */}
                              {transferConfig.cbu && (
                                <div className="flex justify-between items-center text-xs gap-3">
                                  <span style={{ color: mutedColor }}>CBU/CVU:</span>
                                  <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-2.5 py-1.5 rounded-xl font-mono text-xs relative group">
                                    <strong style={{ color: textColor }} className="tracking-wide select-all">{transferConfig.cbu}</strong>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        navigator.clipboard.writeText(transferConfig.cbu);
                                        setCopiedField('cbu');
                                        setTimeout(() => setCopiedField(null), 2000);
                                      }}
                                      className="hover:scale-110 active:scale-95 transition-all text-xs flex items-center justify-center p-0.5"
                                      style={{ color: copiedField === 'cbu' ? '#10b981' : currentTheme.primary }}
                                    >
                                      <span className="material-symbols-outlined text-sm leading-none">
                                        {copiedField === 'cbu' ? 'check_circle' : 'content_copy'}
                                      </span>
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* Alias con Copiar */}
                              {transferConfig.alias && (
                                <div className="flex justify-between items-center text-xs gap-3">
                                  <span style={{ color: mutedColor }}>Alias:</span>
                                  <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-2.5 py-1.5 rounded-xl font-mono text-xs relative group">
                                    <strong style={{ color: textColor }} className="tracking-wide select-all">{transferConfig.alias}</strong>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        navigator.clipboard.writeText(transferConfig.alias);
                                        setCopiedField('alias');
                                        setTimeout(() => setCopiedField(null), 2000);
                                      }}
                                      className="hover:scale-110 active:scale-95 transition-all text-xs flex items-center justify-center p-0.5"
                                      style={{ color: copiedField === 'alias' ? '#10b981' : currentTheme.primary }}
                                    >
                                      <span className="material-symbols-outlined text-sm leading-none">
                                        {copiedField === 'alias' ? 'check_circle' : 'content_copy'}
                                      </span>
                                    </button>
                                  </div>
                                </div>
                              )}

                              <div className="h-px w-full my-2.5" style={{ backgroundColor: appearance.dark_mode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }} />
                              <p className="text-xs font-black mt-2 text-right uppercase tracking-wider" style={{ color: currentTheme.primary }}>Total a Transferir: {formatPrice(finalTotal, currency)}</p>
                            </div>
                          </div>

                          <div className="rounded-2xl border p-4 space-y-3 relative overflow-hidden" style={{
                            backgroundColor: cardBg,
                            borderColor: transferProofUrl ? currentTheme.primary : (appearance.dark_mode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)')
                          }}>
                            <h4 className="font-black text-xs uppercase tracking-wider block" style={{ color: textColor }}>Comprobante de Transferencia</h4>
                            <p className="text-[10px]" style={{ color: mutedColor }}>Es obligatorio adjuntar una captura o foto de la transferencia para que el negocio verifique y despache tu compra.</p>
                            
                            {uploadingReceipt && (
                              <div className="flex flex-col items-center justify-center p-6 gap-3 bg-black/10 rounded-xl">
                                <div className="w-8 h-8 border-3 border-t-transparent rounded-full animate-spin" style={{ borderColor: currentTheme.primary }} />
                                <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: currentTheme.primary }}>Subiendo comprobante...</span>
                              </div>
                            )}

                            {!uploadingReceipt && transferProofUrl && (
                              <div className="flex items-center gap-4 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                                <div className="w-12 h-12 rounded-lg bg-cover bg-center border border-emerald-500/30 shrink-0" style={{ backgroundImage: `url(${transferProofUrl})` }} />
                                <div className="flex-1">
                                  <span className="text-xs font-black text-emerald-400 uppercase tracking-wide flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm">verified</span>
                                    Subido con éxito
                                  </span>
                                  <button 
                                    onClick={() => setTransferProofUrl('')} 
                                    className="text-[9px] font-black uppercase tracking-wider text-red-500 hover:text-red-400 mt-1 block"
                                  >
                                    Reemplazar archivo
                                  </button>
                                </div>
                              </div>
                            )}

                            {!uploadingReceipt && !transferProofUrl && (
                              <div className="relative group cursor-pointer">
                                <input 
                                  type="file" 
                                  accept="image/*"
                                  onChange={handleReceiptUpload}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                                />
                                <div className="border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 group-hover:border-zinc-400 transition-all duration-300" style={{
                                  borderColor: appearance.dark_mode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.1)'
                                }}>
                                  <span className="material-symbols-outlined text-zinc-500 text-3xl">upload_file</span>
                                  <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: textColor }}>Seleccionar Captura / Foto</span>
                                  <span className="text-[9px] font-medium" style={{ color: mutedColor }}>JPG, PNG o WEBP (Máx. 2MB)</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {paymentMethod === 'mp' && mpConfig && (
                        <div className="animate-in fade-in slide-in-from-top-4 duration-300 space-y-4">
                          <div className="rounded-2xl p-6 border text-center space-y-4 shadow-xl" style={{ 
                            backgroundColor: cardBg,
                            borderColor: currentTheme.primary
                          }}>
                            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto">
                              <span className="material-symbols-outlined text-2xl text-blue-400 animate-pulse">security</span>
                            </div>
                            <div>
                              <h4 className="font-black text-sm uppercase tracking-wider" style={{ color: textColor }}>Pago Seguro 100% Protegido</h4>
                              <p className="text-[11px] mt-2 max-w-sm mx-auto leading-relaxed" style={{ color: mutedColor }}>
                                Al hacer clic en <strong style={{ color: textColor }}>"Confirmar Compra"</strong> abajo, serás redirigido a la pasarela oficial de <strong style={{ color: textColor }}>Mercado Pago</strong> para abonar de forma inmediata y automática.
                              </p>
                            </div>
                            <div className="h-px w-full" style={{ backgroundColor: appearance.dark_mode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }} />
                            <p className="text-xs font-black text-right uppercase tracking-wider" style={{ color: currentTheme.primary }}>Monto a abonar: {formatPrice(finalTotal, currency)}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Stepper Footer Summary */}
                <div className="p-6 border-t shadow-2xl relative z-10" style={{ 
                  borderColor: appearance.dark_mode ? 'rgba(255,255,255,0.06)' : '#e5e5e5',
                  backgroundColor: appearance.dark_mode ? '#0d0d0e' : '#fcfcfc'
                }}>
                  {checkoutStep === 1 && (
                    <>
                      <div className="space-y-2 text-xs font-medium mb-5">
                        <div className="flex justify-between">
                          <span style={{ color: mutedColor }}>Subtotal</span>
                          <span className="font-bold" style={{ color: textColor }}>{formatPrice(cartTotal, currency)}</span>
                        </div>
                        {tenant.store_shipping_enabled && (
                          <div className="flex justify-between">
                            <span style={{ color: mutedColor }}>Envío</span>
                            <span className="font-bold" style={{ color: textColor }}>{shippingCost === 0 ? 'Gratis' : formatPrice(shippingCost, currency)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-black text-base pt-3 border-t uppercase tracking-wider" style={{ 
                          color: textColor, 
                          borderColor: appearance.dark_mode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' 
                        }}>
                          <span>Total</span>
                          <span>{formatPrice(finalTotal, currency)}</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => setCheckoutStep(2)} 
                        disabled={cart.length === 0} 
                        className="w-full py-4 text-white rounded-full font-black text-xs tracking-wider uppercase disabled:opacity-30 disabled:pointer-events-none hover:opacity-90 active:scale-[0.98] transition-all shadow-lg flex items-center justify-center gap-2" 
                        style={primaryBg}
                      >
                        <span>Continuar</span>
                        <span className="material-symbols-outlined text-sm font-black">arrow_forward</span>
                      </button>
                    </>
                  )}

                  {checkoutStep === 2 && (
                    <div className="flex gap-3">
                      <button 
                        onClick={() => setCheckoutStep(1)} 
                        className="flex-1 py-4 border rounded-full font-black text-xs tracking-wider uppercase hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.98] transition-all" 
                        style={{ borderColor: appearance.dark_mode ? 'rgba(255,255,255,0.1)' : '#e5e5e5', color: textColor }}
                      >
                        Volver
                      </button>
                      <button 
                        onClick={() => setCheckoutStep(3)} 
                        disabled={
                          !customerInfo.name || 
                          !customerInfo.phone || 
                          (deliveryMethod === 'delivery' && (
                            !customerInfo.address || 
                            !customerInfo.city || 
                            !customerInfo.province || 
                            !customerInfo.postalCode || 
                            isZoneUnsupported
                          ))
                        } 
                        className="flex-1 py-4 text-white rounded-full font-black text-xs tracking-wider uppercase disabled:opacity-30 disabled:pointer-events-none hover:opacity-90 active:scale-[0.98] transition-all shadow-lg" 
                        style={primaryBg}
                      >
                        Siguiente
                      </button>
                    </div>
                  )}

                  {checkoutStep === 3 && (
                    <div className="flex gap-3">
                      <button 
                        onClick={() => setCheckoutStep(2)} 
                        className="flex-1 py-4 border rounded-full font-black text-xs tracking-wider uppercase hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.98] transition-all" 
                        style={{ borderColor: appearance.dark_mode ? 'rgba(255,255,255,0.1)' : '#e5e5e5', color: textColor }}
                      >
                        Volver
                      </button>
                      <button 
                        onClick={handleCheckout} 
                        disabled={processingOrder || uploadingReceipt || (paymentMethod === 'transfer' && !transferProofUrl)} 
                        className="flex-1 py-4 text-white rounded-full font-black text-xs tracking-wider uppercase disabled:opacity-30 disabled:pointer-events-none hover:opacity-90 active:scale-[0.98] transition-all shadow-lg" 
                        style={primaryBg}
                      >
                        {processingOrder ? 'Procesando...' : 'Confirmar Compra'}
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
              
              {selectedProduct && getProductAttributesForSelected(selectedProduct).length > 0 && (
                <div className="mb-6 space-y-4">
                  {getProductAttributesForSelected(selectedProduct).map((attr: any) => (
                    <div key={attr.slug}>
                      <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: mutedColor }}>{attr.name}</p>
                      <div className="flex flex-wrap gap-2">
                        {attr.options?.map((opt: any) => (
                          <button
                            key={opt.id}
                            onClick={() => setSelectedVariant({ ...selectedVariant, [attr.slug]: opt.slug })}
                            className={`px-4 py-2 rounded-xl text-xs font-black transition-all border ${
                              selectedVariant[attr.slug] === opt.slug
                                ? 'border-transparent shadow-lg shadow-yellow-500/20 scale-[1.02]'
                                : 'border-white/5 hover:border-white/20'
                            }`}
                            style={selectedVariant[attr.slug] === opt.slug 
                              ? { backgroundColor: currentTheme.primary, color: '#fff' } 
                              : { backgroundColor: appearance.dark_mode ? '#27272a' : '#f1f1f1', color: mutedColor }
                            }
                          >
                            {attr.type === 'color' && opt.color && (
                              <span 
                                className="inline-block w-3.5 h-3.5 rounded-full mr-2 shadow-sm border border-black/10" 
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
                    <p className="text-4xl font-black animate-in fade-in duration-200" style={{ color: textColor }}>
                      {formatPrice(
                        getActiveVariant(selectedProduct) ? (getActiveVariant(selectedProduct).price_ars || selectedProduct.precio) : selectedProduct.precio, 
                        currency
                      )}
                    </p>
                  </div>
                  {(getActiveVariant(selectedProduct)?.sku || selectedProduct.sku) && (
                    <p className="text-[10px] font-medium opacity-40 mb-1" style={{ color: textColor }}>
                      REF: {getActiveVariant(selectedProduct)?.sku || selectedProduct.sku}
                    </p>
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

      <footer className="relative border-t mt-24 pt-16 transition-colors duration-500" style={{ 
        backgroundColor: appearance.dark_mode ? '#000000' : '#ffffff', 
        borderColor: appearance.dark_mode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' 
      }}>
        {/* Floating Brand Badge (No Golden Frame) */}
        <div className="absolute -top-8 right-8 md:right-16 w-16 h-16 flex items-center justify-center z-20 cursor-pointer"
          onClick={() => {
            const el = document.getElementById('products-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          title={tenant.store_name || tenant.nombre || 'Ir arriba'}
        >
          {(() => {
            const activeLogo = tenant.store_logo_url || tenant.logo_url;
            if (activeLogo) {
              const cacheBuster = tenant.updated_at 
                ? new Date(tenant.updated_at).getTime() 
                : Date.now();
              const bustedUrl = `${activeLogo}${activeLogo.includes('?') ? '&' : '?'}_t=${cacheBuster}`;
              
              return (
                <img 
                  src={bustedUrl} 
                  alt="Logo" 
                  className="w-14 h-14 rounded-full object-contain border border-zinc-200 dark:border-white/10 shadow-md bg-white hover:scale-110 transition-transform duration-300"
                />
              );
            }
            
            // If there is no logo, display ONLY the elegant letter monogram with absolute minimalism
            return (
              <span className="font-serif text-4xl font-black select-none text-zinc-900 dark:text-white hover:scale-110 transition-transform duration-300 leading-none">
                {(tenant.store_name || tenant.nombre || 'O').charAt(0).toUpperCase()}
              </span>
            );
          })()}
        </div>

        <div className="max-w-7xl mx-auto px-6">
          {/* Main Links Row */}
          <div className="flex flex-col items-center justify-center gap-6 md:gap-8 mb-8">
            <nav className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-xs font-semibold tracking-[0.2em] uppercase">
              <button 
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="transition-colors"
                style={{ color: appearance.dark_mode ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = appearance.dark_mode ? '#ffffff' : '#000000'}
                onMouseLeave={(e) => e.currentTarget.style.color = appearance.dark_mode ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)'}
              >
                Inicio
              </button>
              <button 
                onClick={() => {
                  setSelectedCategory('all');
                  const el = document.getElementById('products-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="transition-colors"
                style={{ color: appearance.dark_mode ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = appearance.dark_mode ? '#ffffff' : '#000000'}
                onMouseLeave={(e) => e.currentTarget.style.color = appearance.dark_mode ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)'}
              >
                Productos
              </button>
              
              <button 
                onClick={() => {
                  setSelectedCategory('local');
                  const el = document.getElementById('products-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="transition-colors"
                style={{ color: appearance.dark_mode ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = appearance.dark_mode ? '#ffffff' : '#000000'}
                onMouseLeave={(e) => e.currentTarget.style.color = appearance.dark_mode ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)'}
              >
                Tienda Local
              </button>

              <button 
                onClick={() => {
                  setSelectedCategory('ml');
                  const el = document.getElementById('products-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="transition-colors"
                style={{ color: appearance.dark_mode ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = appearance.dark_mode ? '#ffffff' : '#000000'}
                onMouseLeave={(e) => e.currentTarget.style.color = appearance.dark_mode ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)'}
              >
                Mercado Libre
              </button>

              {tenant.address && (
                <span 
                  className="cursor-default opacity-85 text-center"
                  style={{ color: appearance.dark_mode ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}
                >
                  {tenant.address}
                </span>
              )}
              
              {/* Dynamic Social Icons at the end */}
              {(tenant.store_social_instagram || tenant.store_social_facebook || tenant.store_social_whatsapp) && (
                <div className="flex items-center gap-4 ml-2 border-l pl-6" style={{ borderColor: appearance.dark_mode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
                  {tenant.store_social_instagram && (
                    <a 
                      href={tenant.store_social_instagram.startsWith('http') ? tenant.store_social_instagram : `https://instagram.com/${tenant.store_social_instagram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="transition-opacity duration-300 hover:opacity-100 opacity-60"
                      style={{ color: appearance.dark_mode ? '#ffffff' : '#000000' }}
                    >
                      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051C.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                      </svg>
                    </a>
                  )}
                  {tenant.store_social_facebook && (
                    <a 
                      href={tenant.store_social_facebook.startsWith('http') ? tenant.store_social_facebook : `https://facebook.com/${tenant.store_social_facebook}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="transition-opacity duration-300 hover:opacity-100 opacity-60"
                      style={{ color: appearance.dark_mode ? '#ffffff' : '#000000' }}
                    >
                      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                        <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" />
                      </svg>
                    </a>
                  )}
                  {tenant.store_social_whatsapp && (
                    <a 
                      href={`https://wa.me/${tenant.store_social_whatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="transition-opacity duration-300 hover:opacity-100 opacity-60"
                      style={{ color: appearance.dark_mode ? '#ffffff' : '#000000' }}
                    >
                      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413" />
                      </svg>
                    </a>
                  )}
                </div>
              )}
            </nav>
          </div>

          {/* Sub Links Row */}
          <div className="flex flex-wrap items-center justify-center gap-6 mb-4 text-[10px] tracking-widest uppercase opacity-55">
            <a href="/terminos" className="cursor-pointer hover:opacity-100 transition-opacity" style={{ color: appearance.dark_mode ? '#ffffff' : '#000000' }}>Términos de Uso</a>
            <a href="/privacidad" className="cursor-pointer hover:opacity-100 transition-opacity" style={{ color: appearance.dark_mode ? '#ffffff' : '#000000' }}>Política de Privacidad</a>
            <a href="/afiliados" className="cursor-pointer hover:opacity-100 transition-opacity" style={{ color: appearance.dark_mode ? '#ffffff' : '#000000' }}>Divulgación de Afiliados</a>
            <a 
              href="https://www.argentina.gob.ar/produccion/defensa-del-consumidor/formulario" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="cursor-pointer hover:opacity-100 transition-opacity" 
              style={{ color: appearance.dark_mode ? '#ffffff' : '#000000' }}
            >
              Defensa al Consumidor
            </a>
          </div>

          {/* Copyright */}
          <div className="text-center text-[10px] tracking-[0.15em] uppercase opacity-40 mb-6">
            <p style={{ color: appearance.dark_mode ? '#ffffff' : '#000000' }}>
              All Rights Reserved © {new Date().getFullYear()} Copyright
            </p>
          </div>

          {/* Giant Premium Branding Logo at the very bottom */}
          <div className="border-t pt-8 overflow-hidden" style={{ borderColor: appearance.dark_mode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
            {(() => {
              const rawStoreName = tenant.store_name || tenant.nombre || 'Obsidiana';
              // Mathematically calculate optimal dynamic font size in vw to guarantee the title fits exactly on one line without truncation
              const fontSizeVw = Math.min(12, Math.max(3, 100 / rawStoreName.length));

              return (
                <span className="w-full text-center block font-sans font-black tracking-tighter select-none uppercase pointer-events-none transition-all duration-500 whitespace-nowrap overflow-hidden"
                  style={{ 
                    color: appearance.dark_mode ? '#ffffff' : '#000000',
                    letterSpacing: '-0.04em',
                    fontSize: `${fontSizeVw}vw`,
                    lineHeight: '0.9'
                  }}
                >
                  {rawStoreName}
                </span>
              );
            })()}
          </div>
        </div>
      </footer>
    </div>
  );
}