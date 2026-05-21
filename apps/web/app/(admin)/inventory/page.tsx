'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/hooks/use-tenant';
import { uploadImageToCloudinary, buildImageUrl, getThumbnailUrl, getPreviewUrl, getCloudinaryUrl } from '@/lib/cloudinary';
import { findGlobalImage, contributeImageToGlobal } from '@/lib/global-catalog';
import { FeatureGate } from '@/components/feature-gate';
const RUBRO_PRESETS: {
  [key: string]: {
    label: string;
    attributes: {
      name: string;
      slug: string;
      type: 'select' | 'color';
      options: { value: string; color?: string }[];
    }[];
  };
} = {
  ropa: {
    label: 'Indumentaria y Ropa',
    attributes: [
      {
        name: 'Talle',
        slug: 'talle',
        type: 'select',
        options: [
          { value: 'S' },
          { value: 'M' },
          { value: 'L' },
          { value: 'XL' },
          { value: 'XXL' }
        ]
      },
      {
        name: 'Color',
        slug: 'color',
        type: 'color',
        options: [
          { value: 'Negro', color: '#000000' },
          { value: 'Blanco', color: '#FFFFFF' },
          { value: 'Rojo', color: '#EF4444' },
          { value: 'Azul', color: '#3B82F6' },
          { value: 'Verde', color: '#10B981' },
          { value: 'Gris', color: '#6B7280' }
        ]
      }
    ]
  },
  calzado: {
    label: 'Calzado y Zapatos',
    attributes: [
      {
        name: 'Talle de Calzado',
        slug: 'talle_calzado',
        type: 'select',
        options: [
          { value: '35' },
          { value: '36' },
          { value: '37' },
          { value: '38' },
          { value: '39' },
          { value: '40' },
          { value: '41' },
          { value: '42' },
          { value: '43' },
          { value: '44' }
        ]
      },
      {
        name: 'Color',
        slug: 'color',
        type: 'color',
        options: [
          { value: 'Negro', color: '#000000' },
          { value: 'Marrón', color: '#78350F' },
          { value: 'Blanco', color: '#FFFFFF' },
          { value: 'Rojo', color: '#EF4444' },
          { value: 'Azul', color: '#3B82F6' }
        ]
      }
    ]
  },
  tecnologia: {
    label: 'Tecnología y Electrónica',
    attributes: [
      {
        name: 'Capacidad',
        slug: 'capacidad',
        type: 'select',
        options: [
          { value: '32GB' },
          { value: '64GB' },
          { value: '128GB' },
          { value: '256GB' },
          { value: '512GB' },
          { value: '1TB' }
        ]
      },
      {
        name: 'Modelo/Terminación',
        slug: 'modelo',
        type: 'select',
        options: [
          { value: 'Gris Espacial' },
          { value: 'Plata' },
          { value: 'Oro' },
          { value: 'Negro Titán' }
        ]
      }
    ]
  },
  ferreteria: {
    label: 'Ferretería y Herramientas',
    attributes: [
      {
        name: 'Medida',
        slug: 'medida',
        type: 'select',
        options: [
          { value: '1/4"' },
          { value: '1/2"' },
          { value: '3/4"' },
          { value: '1"' },
          { value: '2"' }
        ]
      },
      {
        name: 'Material',
        slug: 'material',
        type: 'select',
        options: [
          { value: 'Acero' },
          { value: 'Bronce' },
          { value: 'Hierro' },
          { value: 'PVC' },
          { value: 'Aluminio' }
        ]
      }
    ]
  },
  perfumeria: {
    label: 'Perfumería y Cosmética (Contenido / Fragancia)',
    attributes: [
      {
        name: 'Contenido',
        slug: 'contenido',
        type: 'select',
        options: [
          { value: '30ml' },
          { value: '50ml' },
          { value: '75ml' },
          { value: '100ml' },
          { value: '150ml' },
          { value: '200ml' }
        ]
      },
      {
        name: 'Fragancia',
        slug: 'fragancia',
        type: 'select',
        options: [
          { value: 'Original' },
          { value: 'Floral' },
          { value: 'Cítrico' },
          { value: 'Amaderado' },
          { value: 'Dulce' }
        ]
      }
    ]
  },
  dietetica: {
    label: 'Dietética, Almacén y Mascotas (Peso / Presentación)',
    attributes: [
      {
        name: 'Presentación',
        slug: 'presentacion',
        type: 'select',
        options: [
          { value: '100g' },
          { value: '250g' },
          { value: '500g' },
          { value: '1kg' },
          { value: '2kg' },
          { value: '5kg' },
          { value: '10kg' },
          { value: '15kg' }
        ]
      }
    ]
  },
  gastronomia: {
    label: 'Gastronomía y Bebidas (Medida / Sabor)',
    attributes: [
      {
        name: 'Medida',
        slug: 'medida_gastronomia',
        type: 'select',
        options: [
          { value: '1/4 KG' },
          { value: '1/2 KG' },
          { value: '1 KG' },
          { value: 'Porción' },
          { value: 'Pinta' },
          { value: '1 Litro' },
          { value: 'Botella' }
        ]
      }
    ]
  }
};

export default function InventoryPage() {
  const { tenant, plan } = useTenant();
  const [items, setItems] = useState<any[]>([]);
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedProducts, setExpandedProducts] = useState<{ [key: string]: boolean }>({});
  
  const toggleExpand = (productId: string) => {
    setExpandedProducts(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [previewItem, setPreviewItem] = useState<any>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [actionModalItem, setActionModalItem] = useState<any | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    slug: '',
    sku: '',
    price_ars: '',
    barcode: '',
    stock: '',
    description: '',
    available_online: false
  });
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [statusFilter, setStatusFilter] = useState('');
  const [onlineFilter, setOnlineFilter] = useState('');
  const [productImages, setProductImages] = useState<string[]>([]);
  const [newProductImages, setNewProductImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingNewImage, setUploadingNewImage] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [imageFileRef, setImageFileRef] = useState<HTMLInputElement | null>(null);
  const newImageFileRef = useRef<HTMLInputElement>(null);
  
  const [globalImageSuggestions, setGlobalImageSuggestions] = useState<any[]>([]);
  const [showGlobalSuggestions, setShowGlobalSuggestions] = useState(false);
  const [imageSearchLoading, setImageSearchLoading] = useState(false);
  const [autoImageFound, setAutoImageFound] = useState(false);
  const [detectedGlobalId, setDetectedGlobalId] = useState<string | null>(null);
  const [productAttributes, setProductAttributes] = useState<any[]>([]);
  const [selectedAttributeIds, setSelectedAttributeIds] = useState<string[]>([]);
  const [selectedRubro, setSelectedRubro] = useState<string>('ninguno');
  const [rubroValues, setRubroValues] = useState<{ [key: string]: string[] }>({});

  const handleTogglePresetValue = (attributeSlug: string, value: string) => {
    setRubroValues(prev => {
      const currentValues = prev[attributeSlug] || [];
      const updatedValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value];
      return {
        ...prev,
        [attributeSlug]: updatedValues
      };
    });
  };

  // --- Estados y manejadores para variantes personalizadas (Crear Libremente) ---
  const [customAttributes, setCustomAttributes] = useState<{ name: string; slug: string; type: 'select' | 'color'; options: string[] }[]>([]);
  const [newCustomAttrName, setNewCustomAttrName] = useState('');
  const [newCustomAttrType, setNewCustomAttrType] = useState<'select' | 'color'>('select');
  const [newOptionInput, setNewOptionInput] = useState<{ [attrSlug: string]: string }>({});

  const handleAddCustomAttribute = () => {
    if (!newCustomAttrName.trim()) return;
    const slug = newCustomAttrName.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    if (customAttributes.some(a => a.slug === slug)) {
      alert('Ya existe un atributo con ese nombre.');
      return;
    }
    setCustomAttributes(prev => [...prev, {
      name: newCustomAttrName.trim(),
      slug,
      type: newCustomAttrType,
      options: []
    }]);
    setNewCustomAttrName('');
  };

  const handleAddCustomOption = (attrSlug: string) => {
    const inputVal = newOptionInput[attrSlug] || '';
    if (!inputVal.trim()) return;
    
    setCustomAttributes(prev => prev.map(attr => {
      if (attr.slug === attrSlug) {
        if (attr.options.includes(inputVal.trim())) return attr;
        return {
          ...attr,
          options: [...attr.options, inputVal.trim()]
        };
      }
      return attr;
    }));
    
    setNewOptionInput(prev => ({ ...prev, [attrSlug]: '' }));
  };

  const handleRemoveCustomOption = (attrSlug: string, optionVal: string) => {
    setCustomAttributes(prev => prev.map(attr => {
      if (attr.slug === attrSlug) {
        return {
          ...attr,
          options: attr.options.filter(o => o !== optionVal)
        };
      }
      return attr;
    }));
  };

  const handleRemoveCustomAttribute = (attrSlug: string) => {
    setCustomAttributes(prev => prev.filter(a => a.slug !== attrSlug));
  };
  
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const getThumb = (url: string | undefined) => {
    if (!url) return null;
    try {
      const pid = url.match(/upload\/(?:v\d+\/)?([^\.]+)/)?.[1];
      if (!pid) return url;
      return getThumbnailUrl(pid, 64);
    } catch { return url; }
  };

  const [tenantAttributes, setTenantAttributes] = useState<any[]>([]);

  async function fetchTenantAttributes() {
    if (!tenant?.id) return;
    try {
      const { data, error } = await supabase
        .from('product_attributes')
        .select('*, product_attribute_options(*)')
        .eq('tenant_id', tenant.id)
        .order('sort_order');
      if (error) throw error;
      setTenantAttributes(data || []);
    } catch (err) {
      console.error('Error fetching dynamic attributes:', err);
    }
  }

  useEffect(() => {
    fetchInventory();
    fetchTenantAttributes();
  }, [tenant]);

  async function fetchInventory() {
    if (!tenant?.id) return;
    setLoading(true);
    
    try {
      // 1. Obtener todos los productos del tenant
      const { data: productsData, error: prodError } = await supabase
        .from('products')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: false });

      if (prodError) throw prodError;

      const productIds = productsData?.map(p => p.id).filter(Boolean) || [];

      if (productIds.length === 0) {
        setItems([]);
        setFilteredItems([]);
        setLoading(false);
        return;
      }

      // 2. Obtener todas las variantes de esos productos
      const { data: variantsData, error: varError } = await supabase
        .from('product_variants')
        .select('id, sku, price_ars, product_id, variant_options')
        .in('product_id', productIds)
        .order('sku');

      if (varError) throw varError;

      // 3. Obtener todos los niveles de inventario del tenant
      const { data: inventoryData, error: invError } = await supabase
        .from('inventory_levels')
        .select('*')
        .eq('tenant_id', tenant.id);

      if (invError) throw invError;

      const productsMap: Record<string, any> = {};
      productsData?.forEach(p => {
        productsMap[p.id] = p;
      });

      // 4. Cruzar los datos partiendo de las variantes para asegurar que todo sea visible
      const enrichedData = (variantsData || []).map(variant => {
        const product = productsMap[variant.product_id] || null;
        const inv = inventoryData?.find(i => i.variant_id === variant.id);

        return {
          id: inv?.id || `temp-${variant.id}`, // ID temporal si no existe fila en inventory_levels
          tenant_id: tenant.id,
          branch_id: inv?.branch_id || '00000000-0000-0000-0000-000000000001',
          variant_id: variant.id,
          on_hand: inv?.on_hand || 0,
          committed: inv?.committed || 0,
          reorder_point: inv?.reorder_point || 0,
          updated_at: inv?.updated_at || new Date().toISOString(),
          available: (inv?.on_hand || 0) - (inv?.committed || 0),
          product_variants: {
            ...variant,
            products: { ...product, nombre: product?.nombre || product?.title }
          }
        };
      });

      // Filtramos productos de MercadoLibre (SKU empieza con ML-) ya que no son para el POS
      const filteredEnrichedData = enrichedData.filter(item => {
        const sku = item.product_variants?.sku || '';
        return !sku.startsWith('ML-');
      });

      setItems(filteredEnrichedData);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }

    // Fetch product attributes for this tenant
    const { data: attrsData } = await supabase
      .from('product_attributes')
      .select('*, product_attribute_options(*)')
      .eq('tenant_id', tenant.id)
      .order('sort_order');
    
    if (attrsData) {
      const formatted = attrsData.map((a: any) => ({
        id: a.id,
        name: a.name,
        slug: a.slug,
        type: a.type,
        is_required: a.is_required,
        options: (a.product_attribute_options || []).sort((o1: any, o2: any) => o1.sort_order - o2.sort_order).map((o: any) => ({
          id: o.id,
          value: o.value,
          slug: o.slug,
          color: o.color,
        })),
      }));
      setProductAttributes(formatted);
    }
  }

async function generateUniqueSlug(tenantId: string, baseSlug: string): Promise<string> {
    let slug = baseSlug;
    
    for (let counter = 1; counter <= 100; counter++) {
      const { data } = await supabase
        .from('products')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('slug', slug)
        .limit(1);
      
      if (!data?.length) return slug;
      
      slug = `${baseSlug}-${counter}`;
    }
    
    return slug;
  }

  async function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const tenantId = tenant?.id;
      if (!tenantId) {
        alert('Cargando tenant. Intenta de nuevo en unos segundos.');
        setSaving(false);
        return;
      }
      const locationId = '00000000-0000-0000-0000-000000000001'; // Default location

      // Check product limit
      if (tenant?.plan_id) {
        const { count, error: countError } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenantId);
        
        if (!countError && count !== null) {
          const maxProducts = plan?.max_products || 50; // Fallback to 50
          if (count >= maxProducts) {
            alert(`Has alcanzado el límite de productos de tu plan (${maxProducts}). Por favor, actualizá tu suscripción para agregar más.`);
            setSaving(false);
            return;
          }
        }
      }

      // Generar slug único
      const baseSlug = formData.slug.trim() || formData.nombre.toLowerCase().replace(/\s+/g, '-');
      const uniqueSlug = await generateUniqueSlug(tenantId, baseSlug);

      // --- PROCESAMIENTO DE VARIANTES Y PRESETS ---
      const createdAttributes: string[] = [];
      const combinations: any[] = [];
      
      if (selectedRubro !== 'ninguno') {
        if (selectedRubro === 'personalizado') {
          const attributeIdsMap: { [slug: string]: string } = {};

          for (const attr of customAttributes) {
            const activeVals = attr.options;
            if (activeVals.length === 0) continue;

            // Buscar si ya existe el atributo para el tenant
            let { data: existingAttr } = await supabase
              .from('product_attributes')
              .select('id')
              .eq('tenant_id', tenantId)
              .eq('slug', attr.slug)
              .maybeSingle();

            let attrId = existingAttr?.id;
            if (!attrId) {
              const { data: newAttr, error: newAttrErr } = await supabase
                .from('product_attributes')
                .insert({
                  tenant_id: tenantId,
                  name: attr.name,
                  slug: attr.slug,
                  type: attr.type,
                  sort_order: createdAttributes.length
                })
                .select('id')
                .single();
              if (newAttrErr) throw newAttrErr;
              attrId = newAttr.id;
            }

            createdAttributes.push(attrId);
            attributeIdsMap[attr.slug] = attrId;

            // Asegurar opciones
            for (const val of activeVals) {
              const valSlug = val.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

              let { data: existingOpt } = await supabase
                .from('product_attribute_options')
                .select('id')
                .eq('attribute_id', attrId)
                .eq('slug', valSlug)
                .maybeSingle();

              let optId = existingOpt?.id;
              if (!optId) {
                const { data: newOpt, error: newOptErr } = await supabase
                  .from('product_attribute_options')
                  .insert({
                    attribute_id: attrId,
                    value: val,
                    slug: valSlug,
                    color: attr.type === 'color' ? '#7C3AED' : null
                  })
                  .select('id')
                  .single();
                if (newOptErr) throw newOptErr;
                optId = newOpt.id;
              }
            }
          }

          // Generar el producto cartesiano de combinaciones
          const attrSlugs = Object.keys(attributeIdsMap);
          if (attrSlugs.length > 0) {
            const cartesian = (depth: number, current: any) => {
              if (depth === attrSlugs.length) {
                combinations.push(current);
                return;
              }
              const slug = attrSlugs[depth];
              if (slug) {
                const vals = customAttributes.find(a => a.slug === slug)?.options || [];
                vals.forEach(val => {
                  cartesian(depth + 1, { ...current, [slug]: val });
                });
              }
            };
            cartesian(0, {});
          }
        } else if (selectedRubro === 'globales') {
          const attributeIdsMap: { [slug: string]: string } = {};

          for (const attr of tenantAttributes) {
            const activeVals = rubroValues[attr.slug] || [];
            if (activeVals.length === 0) continue;

            createdAttributes.push(attr.id);
            attributeIdsMap[attr.slug] = attr.id;
          }

          // Generar el producto cartesiano de combinaciones
          const attrSlugs = Object.keys(attributeIdsMap);
          if (attrSlugs.length > 0) {
            const cartesian = (depth: number, current: any) => {
              if (depth === attrSlugs.length) {
                combinations.push(current);
                return;
              }
              const slug = attrSlugs[depth];
              if (slug) {
                const vals = rubroValues[slug] || [];
                vals.forEach(val => {
                  cartesian(depth + 1, { ...current, [slug]: val });
                });
              }
            };
            cartesian(0, {});
          }
        } else {
          const preset = RUBRO_PRESETS[selectedRubro];
          if (preset) {
            const attributeIdsMap: { [slug: string]: string } = {};

            for (const attr of preset.attributes) {
              const activeVals = rubroValues[attr.slug] || [];
              if (activeVals.length === 0) continue;

              // Buscar si ya existe el atributo para el tenant
              let { data: existingAttr } = await supabase
                .from('product_attributes')
                .select('id')
                .eq('tenant_id', tenantId)
                .eq('slug', attr.slug)
                .maybeSingle();

              let attrId = existingAttr?.id;
              if (!attrId) {
                const { data: newAttr, error: newAttrErr } = await supabase
                  .from('product_attributes')
                  .insert({
                    tenant_id: tenantId,
                    name: attr.name,
                    slug: attr.slug,
                    type: attr.type,
                    sort_order: createdAttributes.length
                  })
                  .select('id')
                  .single();
                if (newAttrErr) throw newAttrErr;
                attrId = newAttr.id;
              }

              createdAttributes.push(attrId);
              attributeIdsMap[attr.slug] = attrId;

              // Asegurar opciones
              for (const val of activeVals) {
                const valSlug = val.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
                const presetOpt = attr.options.find(o => o.value === val);

                let { data: existingOpt } = await supabase
                  .from('product_attribute_options')
                  .select('id')
                  .eq('attribute_id', attrId)
                  .eq('slug', valSlug)
                  .maybeSingle();

                let optId = existingOpt?.id;
                if (!optId) {
                  const { data: newOpt, error: newOptErr } = await supabase
                    .from('product_attribute_options')
                    .insert({
                      attribute_id: attrId,
                      value: val,
                      slug: valSlug,
                      color: presetOpt?.color || null
                    })
                    .select('id')
                    .single();
                  if (newOptErr) throw newOptErr;
                  optId = newOpt.id;
                }
              }
            }

            // Generar el producto cartesiano de combinaciones
            const attrSlugs = Object.keys(attributeIdsMap);
            if (attrSlugs.length > 0) {
              const cartesian = (depth: number, current: any) => {
                if (depth === attrSlugs.length) {
                  combinations.push(current);
                  return;
                }
                const slug = attrSlugs[depth];
                if (slug) {
                  const vals = rubroValues[slug] || [];
                  vals.forEach(val => {
                    cartesian(depth + 1, { ...current, [slug]: val });
                  });
                }
              };
              cartesian(0, {});
            }
          }
        }
      }

      // 1. Insertar producto y dependencias en una sola transacción atómica a nivel de base de datos (RPC)
      const { data: rpcResult, error: rpcError } = await supabase
        .rpc('create_product_with_dependencies', {
          p_tenant_id: tenantId,
          p_nombre: formData.nombre,
          p_slug: uniqueSlug,
          p_description: formData.description,
          p_images: newProductImages,
          p_available_online: formData.available_online || false,
          p_sku: formData.sku,
          p_price_ars: parseInt(formData.price_ars) || 0,
          p_stock: selectedRubro === 'ninguno' || combinations.length === 0 ? (parseInt(formData.stock) || 0) : 0,
          p_barcode: formData.barcode || null
        });

      if (rpcError) throw rpcError;

      const { product_id } = rpcResult as { product_id: string; variant_id: string };

      // 2. Si tiene combinaciones, las creamos
      if (combinations.length > 0 && product_id) {
        // Eliminar variante por defecto creada por la RPC
        await supabase.from('product_variants').delete().eq('product_id', product_id);

        const totalStock = parseInt(formData.stock || '0');
        const stockPerVariant = Math.floor(totalStock / combinations.length);
        const remainderStock = totalStock % combinations.length;

        for (let i = 0; i < combinations.length; i++) {
          const comb = combinations[i];
          const variantOptions: { [key: string]: string } = {};
          const slugParts: string[] = [];

          Object.entries(comb).forEach(([key, val]) => {
            const valStr = String(val);
            variantOptions[key] = valStr.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
            slugParts.push(valStr.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
          });

          const variantSku = `${formData.sku}-${slugParts.join('-')}`;
          
          // Insertar variante
          const { data: newVar, error: varErr } = await supabase
            .from('product_variants')
            .insert({
              product_id,
              sku: variantSku,
              price_ars: parseInt(formData.price_ars) || 0,
              variant_options: variantOptions
            })
            .select('id')
            .single();

          if (varErr) throw varErr;

          // Asignar stock en inventory_levels
          const allocatedStock = stockPerVariant + (i === 0 ? remainderStock : 0);
          await supabase.from('inventory_levels').insert({
            tenant_id: tenantId,
            branch_id: locationId,
            variant_id: newVar.id,
            on_hand: allocatedStock,
            committed: 0
          });
        }
      }

      // 3. Asignar los atributos creados al producto en product_attribute_assignments
      if (createdAttributes.length > 0 && product_id) {
        const assignments = createdAttributes.map((attrId, index) => ({
          product_id: product_id,
          attribute_id: attrId,
          sort_order: index
        }));
        await supabase.from('product_attribute_assignments').insert(assignments);
      }

      // 4. Si el usuario seleccionó opciones individuales de la lista existente (legacy flow fallback)
      if (selectedRubro === 'ninguno' && selectedAttributeIds.length > 0 && product_id) {
        const assignments = selectedAttributeIds.map((attrId, index) => ({
          product_id: product_id,
          attribute_id: attrId,
          sort_order: index
        }));
        await supabase.from('product_attribute_assignments').insert(assignments);
      }

      // Limpiar formulario y cerrar modal
      setFormData({
        nombre: '',
        slug: '',
        sku: '',
        price_ars: '',
        barcode: '',
        stock: '',
        description: '',
        available_online: false
      });
      setNewProductImages([]);
      setSelectedRubro('ninguno');
      setRubroValues({});
      setCustomAttributes([]);
      setNewCustomAttrName('');
      setNewCustomAttrType('select');
      setNewOptionInput({});
      setSelectedAttributeIds([]);
      setShowModal(false);
      
      // Recargar inventario
      await fetchInventory();
      
      alert('Producto creado exitosamente');
    } catch (error: any) {
      console.error('Error al guardar producto:', error);
      alert('Error al guardar: ' + error.message);
    } finally {
      setSaving(false);
    }
  }

  // Función para filtrar items — single unified useEffect for all filters
  useEffect(() => {
    let filtered = items;
    
    // Filtro de búsqueda
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      filtered = filtered.filter(item => {
        const product = item.product_variants?.products;
        const variant = item.product_variants;
        return (
          product?.nombre?.toLowerCase()?.includes(search) ||
          variant?.sku?.toLowerCase()?.includes(search) ||
          variant?.barcode?.toLowerCase()?.includes(search)
        );
      });
    }
    
    // Filtro de estado de stock
    if (statusFilter) {
      filtered = filtered.filter(item => {
        const available = item.available || 0;
        if (statusFilter === 'optimal') return available > 10;
        if (statusFilter === 'low') return available > 0 && available <= 10;
        if (statusFilter === 'out') return available === 0;
        return true;
      });
    }

    // Filtro de tienda online
    if (onlineFilter) {
      const online = onlineFilter === 'online';
      filtered = filtered.filter(item => {
        const product = item.product_variants?.products;
        return (product?.available_online || false) === online;
      });
    }
    
    setFilteredItems(filtered);
  }, [searchQuery, items, statusFilter, onlineFilter]);

  // Función para eliminar producto
  async function handleDeleteProduct(item: any) {
    if (!confirm('¿Estás seguro de que querés eliminar este producto?')) return;
    
    try {
      const tenantId = tenant?.id;
      if (!tenantId) {
        alert('Cargando tenant. Intenta de nuevo en unos segundos.');
        return;
      }
      
      // 1. Eliminar inventario
      await supabase
        .from('inventory_levels')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('variant_id', item.variant_id);
      
      // 2. Obtener product_id de la variante
      const { data: variant } = await supabase
        .from('product_variants')
        .select('product_id')
        .eq('id', item.variant_id)
        .single();
      
      // 3. Eliminar variante
      await supabase
        .from('product_variants')
        .delete()
        .eq('id', item.variant_id);
      
      // 4. Eliminar producto
      if (variant?.product_id) {
        await supabase
          .from('products')
          .delete()
          .eq('id', variant.product_id);
      }
      
      await fetchInventory();
      alert('Producto eliminado exitosamente');
    } catch (error: any) {
      console.error('Error al eliminar:', error);
      alert('Error al eliminar: ' + error.message);
    }
  }

  // Función para abrir modal de editar
  function handleOpenEditModal(item: any) {
    const product = item.product_variants?.products;
    const variant = item.product_variants;
    setFormData({
      nombre: product?.nombre || '',
      slug: product?.slug || '',
      sku: variant?.sku || '',
      price_ars: variant?.price_ars?.toString() || '',
      barcode: variant?.barcode || '',
      stock: item?.on_hand?.toString() || '',
      description: product?.description || '',
      available_online: product?.available_online || false
    });
    setProductImages(product?.images || []);
    setSelectedProductId(product?.id);
    setSelectedItem(item);
    setShowEditModal(true);
    setActionMenuOpen(null);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedProductId) return;
    
    setUploadingImage(true);
    const hasBarcode = !!(formData.barcode && formData.barcode.length >= 12);
    const result = await uploadImageToCloudinary(file, { 
      folder: `obsidiana/${tenant?.id}/products`,
      isGlobal: hasBarcode || undefined,
      barcode: hasBarcode ? formData.barcode : undefined
    });
    
    if (result?.secure_url) {
      const newImages = [...productImages, result.secure_url];
      setProductImages(newImages);
    }
    setUploadingImage(false);
    e.target.value = '';
  }

  async function deleteProductImage(index: number) {
    const newImages = productImages.filter((_, i) => i !== index);
    setProductImages(newImages);
  }

  async function handleNewImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    
    if (!file || !tenant?.id) {

      alert('Cargando datos. Intenta de nuevo.');
      return;
    }
    
    if (!file.type.startsWith('image/')) {
      alert('Selecciona una imagen válida');
      return;
    }
    
    setUploadingNewImage(true);
    try {
      const hasBarcode = !!(formData.barcode && formData.barcode.length >= 12);
      const folder = hasBarcode 
        ? 'obsidiana/global_library' 
        : `obsidiana/${tenant.id}/products`;
      
      const result = await uploadImageToCloudinary(file, { 
        folder,
        isGlobal: hasBarcode || undefined,
        barcode: hasBarcode ? formData.barcode : undefined
      });
      
      if (result?.secure_url) {
        setNewProductImages([...newProductImages, result.secure_url]);
        
        if (hasBarcode && result.public_id) {
          const saveToGlobal = confirm(
            '¿Guardar esta imagen en el Catálogo Global para que otras tiendas puedan usarla?'
          );
          if (saveToGlobal) {
            try {
              const { data: existing } = await supabase
                .from('global_catalog')
                .select('id')
                .eq('barcode_ean13', formData.barcode)
                .single();
              
              if (existing) {
                alert('Ya existe una imagen con ese código en el Catálogo Global');
              } else {
                const contribResult = await supabase
                  .from('global_catalog')
                  .insert({
                    barcode_ean13: formData.barcode,
                    normalized_name: formData.nombre || 'Unknown',
                    normalized_slug: formData.nombre?.toLowerCase().replace(/\s+/g, '-') || 'unknown',
                    description: formData.description || '',
                    default_price: parseInt(formData.price_ars) || 0,
                    cloudinary_public_id: result.public_id,
                    cloudinary_url: result.secure_url,
                    width: result.width,
                    height: result.height,
                    format: result.format,
                    bytes: result.bytes,
                    status: 'approved'
                  })
                  .select('id')
                  .single();
                
                if (contribResult.data) {
                  setDetectedGlobalId(contribResult.data.id);
                  alert('Imagen guardada en Catálogo Global');
                }
              }
            } catch (contribErr) {
              console.error('Contribute error:', contribErr);
            }
          }
        }
        
        setAutoImageFound(false);
        setDetectedGlobalId(null);
      } else {
        alert('Error: No se recibió URL de Cloudinary');
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      alert('Error al subir: ' + (err?.message || err));
    } finally {
      setUploadingNewImage(false);
      if (e.target) e.target.value = '';
    }
  }

  function deleteNewProductImage(index: number) {
    setNewProductImages(newProductImages.filter((_, i) => i !== index));
  }

  // Debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const barcodeDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Buscar imagen global por código de barras (13 dígitos) (debounced para evitar lagueos al escribir)
  const searchGlobalImageByBarcode = useCallback(async (barcode: string) => {
    if (!barcode || barcode.length < 12) {
      if (autoImageFound) {
        setNewProductImages([]);
        setAutoImageFound(false);
        setDetectedGlobalId(null);
      }
      return;
    }
    
    if (barcodeDebounceTimerRef.current) {
      clearTimeout(barcodeDebounceTimerRef.current);
    }
    
    barcodeDebounceTimerRef.current = setTimeout(async () => {
      setImageSearchLoading(true);
      try {
        const result = await findGlobalImage(barcode, null);
        
        if (result.id && result.cloudinary_url) {
          setNewProductImages([result.cloudinary_url]);
          setAutoImageFound(true);
          setDetectedGlobalId(result.id);
          
          // Auto-completar silencioso e inteligente sin interrumpir con carteles confirm() molestos
          setFormData(prev => ({
            ...prev,
            nombre: result.normalized_name || prev.nombre,
            barcode: result.barcode_ean13 || barcode,
            price_ars: result.default_price?.toString() || prev.price_ars,
            description: result.description || prev.description
          }));
        } else {
          setAutoImageFound(false);
          setDetectedGlobalId(null);
        }
      } catch (err) {
        console.error('Error searching global image:', err);
      }
      setImageSearchLoading(false);
    }, 400);
  }, [autoImageFound]);

  // BuscarSuggestions por nombre (debounced)
  const searchGlobalSuggestions = useCallback(async (name: string) => {
    if (!name || name.length < 3) {
      setGlobalImageSuggestions([]);
      setShowGlobalSuggestions(false);
      return;
    }
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(async () => {
      setImageSearchLoading(true);
      try {
        const result = await findGlobalImage(null, name);
        
        if (result.all_matches && result.all_matches.length > 0) {
          setGlobalImageSuggestions(result.all_matches);
          setShowGlobalSuggestions(true);
        } else if (result.id && result.cloudinary_url) {
          setGlobalImageSuggestions([{
            id: result.id,
            cloudinary_url: result.cloudinary_url,
            normalized_name: result.normalized_name,
            match_type: result.match_type,
            barcode_ean13: result.barcode_ean13,
            description: result.description,
            default_price: result.default_price
          }]);
          setShowGlobalSuggestions(true);
        } else {
          setGlobalImageSuggestions([]);
          setShowGlobalSuggestions(false);
        }
      } catch (err) {
        console.error('Error searching suggestions:', err);
      }
      setImageSearchLoading(false);
    }, 500);
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (barcodeDebounceTimerRef.current) {
        clearTimeout(barcodeDebounceTimerRef.current);
      }
    };
  }, []);

  // Función para guardar edición
  async function handleEditProduct(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const tenantId = tenant?.id;
      if (!tenantId) {
        alert('Cargando tenant. Intenta de nuevo en unos segundos.');
        return;
      }
      const locationId = '00000000-0000-0000-0000-000000000001'; // Default location
      const product = selectedItem?.product_variants?.products;
      const variant = selectedItem?.product_variants;

      if (!product || !variant) throw new Error('Producto no encontrado');

      // 1. Actualizar producto
      const { error: productError } = await supabase
        .from('products')
        .update({
          nombre: formData.nombre,
          slug: formData.slug || formData.nombre.toLowerCase().replace(/\s+/g, '-'),
          description: formData.description,
          available_online: formData.available_online || false,
          images: productImages
        })
        .eq('tenant_id', tenantId)
        .eq('id', product.id);

      if (productError) throw productError;

      // 2. Actualizar variante
      const { error: variantError } = await supabase
        .from('product_variants')
        .update({
          sku: formData.sku,
          price_ars: parseInt(formData.price_ars) || 0
        })
        .eq('id', variant.id);

      if (variantError) throw variantError;

      // 3. Actualizar stock (usando lógica self-healing para insertar el nivel de inventario si no existe)
      const { data: existingInv } = await supabase
        .from('inventory_levels')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('variant_id', variant.id)
        .maybeSingle();

      let inventoryError;
      if (existingInv) {
        const { error } = await supabase
          .from('inventory_levels')
          .update({ on_hand: parseInt(formData.stock) || 0 })
          .eq('id', existingInv.id);
        inventoryError = error;
      } else {
        const { error } = await supabase
          .from('inventory_levels')
          .insert({
            tenant_id: tenantId,
            branch_id: locationId || '00000000-0000-0000-0000-000000000001',
            variant_id: variant.id,
            on_hand: parseInt(formData.stock) || 0,
            committed: 0
          });
        inventoryError = error;
      }

      if (inventoryError) throw inventoryError;

      setShowEditModal(false);
      await fetchInventory();
      alert('Producto actualizado exitosamente');
    } catch (error: any) {
      console.error('Error al editar producto:', error);
      alert('Error al actualizar: ' + error.message);
    } finally {
      setSaving(false);
    }
  }

  // Función para parsear CSV
  function parseCSV(text: string): any[] {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];
    
    const firstLine = lines[0];
    if (!firstLine) return [];
    const headers = firstLine.split(',').map(h => h.trim());
    const rows = [];
    
    for (let i = 1; i < lines.length; i++) {
      const currentLine = lines[i];
      if (!currentLine) continue;
      const values = currentLine.split(',').map(v => v.trim());
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      rows.push(row);
    }
    
    return rows;
  }

  // Función para manejar archivo de importación
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setImportFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const preview = parseCSV(text).slice(0, 5); // Preview primeras 5 filas
      setImportPreview(preview);
    };
    reader.readAsText(file);
  }

  // Función para importar CSV
  async function handleImportCSV() {
    if (!importFile) return;
    
    setImporting(true);
    setImportProgress({ current: 0, total: 0 });
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target?.result as string;
        const rows = parseCSV(text);
        const tenantId = tenant?.id;
        if (!tenantId) {
          alert('Cargando tenant. Intenta de nuevo en unos segundos.');
          return;
        }
        
        let imported = 0;
        let errors = 0;
        const totalRows = rows.length;
        setImportProgress({ current: 0, total: totalRows });
        
        for (let i = 0; i < totalRows; i++) {
          const row = rows[i];
          try {
            const title = row['Producto'] || row['Nombre'] || row['Title'] || '';
            const sku = row['SKU'] || row['sku'] || '';
            const price = parseInt(row['Precio'] || row['Price'] || row['price_ars'] || '0');
            const stock = parseInt(row['Stock'] || row['stock'] || row['En Mano'] || '0');
            const barcode = row['Barcode'] || row['barcode'] || row['Código de Barras'] || '';
            
            if (!title || !sku) {
              setImportProgress({ current: i + 1, total: totalRows });
              continue;
            }
            
            const baseSlug = title.toLowerCase().replace(/\s+/g, '-');
            const uniqueSlug = await generateUniqueSlug(tenantId, baseSlug);
            
            // Insertar producto, variante e inventario en una sola transacción atómica a nivel de base de datos
            const { error: rpcError } = await supabase
              .rpc('create_product_with_dependencies', {
                p_tenant_id: tenantId,
                p_nombre: title,
                p_slug: uniqueSlug,
                p_description: row['Descripción'] || row['Description'] || '',
                p_images: [],
                p_available_online: false,
                p_sku: sku,
                p_price_ars: price,
                p_stock: stock,
                p_barcode: barcode || null
              });
            
            if (rpcError) throw rpcError;
            
            imported++;
          } catch (err) {
            errors++;
            console.error('Error importando fila:', err);
          } finally {
            setImportProgress({ current: i + 1, total: totalRows });
          }
        }
        
        setImportFile(null);
        setImportPreview([]);
        setShowImportModal(false);
        await fetchInventory();
        alert(`Importación completada. ${imported} productos importados. ${errors} errores.`);
      };
      reader.readAsText(importFile);
    } catch (error: any) {
      alert('Error al importar: ' + error.message);
    } finally {
      setImporting(false);
    }
  }

  // Función para ajustar stock
  async function handleAdjustStock(item: any, newStock: number) {
    try {
      const tenantId = tenant?.id;
      if (!tenantId) {
        alert('Cargando tenant. Intenta de nuevo en unos segundos.');
        return;
      }
      const locationId = '00000000-0000-0000-0000-000000000001'; // Default location
      
      const { data: existingInv } = await supabase
        .from('inventory_levels')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('variant_id', item.variant_id)
        .maybeSingle();

      if (existingInv) {
        await supabase
          .from('inventory_levels')
          .update({ on_hand: newStock })
          .eq('id', existingInv.id);
      } else {
        await supabase
          .from('inventory_levels')
          .insert({
            tenant_id: tenantId,
            branch_id: locationId || '00000000-0000-0000-0000-000000000001',
            variant_id: item.variant_id,
            on_hand: newStock,
            committed: 0
          });
      }
      
      await fetchInventory();
      setShowStockModal(false);
      alert('Stock actualizado exitosamente');
    } catch (error: any) {
      console.error('Error al ajustar stock:', error);
      alert('Error: ' + error.message);
    }
  }

  // Función para obtener el historial de stock (Kardex)
  async function fetchStockHistory(variantId: string) {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('inventory_transactions')
        .select('*')
        .eq('variant_id', variantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistoryItems(data || []);
    } catch (err) {
      console.error('Error fetching stock history:', err);
    } finally {
      setLoadingHistory(false);
    }
  }

  // Función para exportar a CSV
  function handleExportCSV() {
    const headers = ['Producto', 'SKU', 'Variante', 'En Mano', 'Reservado', 'Disponible', 'Precio'];
    const rows = items.map(item => [
      item.product_variants?.products?.nombre || '',
      item.product_variants?.sku || '',
      item.product_variants?.sku || 'Única',
      item.on_hand || 0,
      item.committed || 0,
      item.available || 0,
      item.product_variants?.price_ars || 0
    ]);
    
    const csv = [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inventario.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  }

  return (
    <FeatureGate feature="inventory">
      <div className="max-w-[1440px] mx-auto flex flex-col gap-8 pb-32">
      {/* Page Header & Primary Actions */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-8">
        <div>
          <h1 className="font-headline-xl text-3xl font-black text-white mb-2">Gestión de Inventario</h1>
          <p className="text-zinc-400 font-body-sm text-sm max-w-2xl">Control centralizado de existencias, reservas temporales (TTL) y sincronización omnicanal.</p>
        </div>
        <div className="flex flex-wrap gap-3 shrink-0">
          <button onClick={fetchInventory} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-zinc-900 border border-white/10 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all font-black text-[10px] uppercase tracking-widest">
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            Actualizar
          </button>
          <button 
            onClick={() => setShowImportModal(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-zinc-900 border border-white/10 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all font-black text-[10px] uppercase tracking-widest"
          >
            <span className="material-symbols-outlined text-[18px]">upload_file</span>
            Importar
          </button>
          <button 
            onClick={() => {
              setFormData({
                nombre: '',
                slug: '',
                sku: '',
                price_ars: '',
                barcode: '',
                stock: '',
                description: '',
                available_online: false
              });
              setNewProductImages([]);
              setAutoImageFound(false);
              setDetectedGlobalId(null);
              setGlobalImageSuggestions([]);
              setShowGlobalSuggestions(false);
              setShowModal(true);
              setSelectedAttributeIds([]);
              setSelectedRubro('ninguno');
              setRubroValues({});
              setCustomAttributes([]);
              setNewCustomAttrName('');
              setNewCustomAttrType('select');
              setNewOptionInput({});
              fetchTenantAttributes();
            }}
            className="w-full md:w-auto flex items-center justify-center gap-3 px-6 py-2.5 bg-primary-container text-white rounded-xl hover:bg-[#6D28D9] transition-all font-black text-[10px] uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(124,58,237,0.3)] active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Nuevo Producto
          </button>
        </div>
      </div>

      {/* Filters & Search Bento */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 relative group">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-primary transition-colors">search</span>
          <input 
            className="w-full bg-[#1A1A1A] border border-white/5 rounded-xl py-3.5 pl-12 pr-6 text-sm text-white font-medium focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-zinc-700" 
            placeholder="Buscar por SKU, nombre o variante..." 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          )}
        </div>
        <div className="relative">
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-[#1A1A1A] border border-white/5 rounded-xl py-3.5 px-4 text-sm text-zinc-400 font-bold focus:ring-1 focus:ring-primary outline-none appearance-none cursor-pointer hover:bg-zinc-900 transition-colors"
          >
            <option value="">Estado: Todos</option>
            <option value="optimal">Óptimo</option>
            <option value="low">Bajo Stock</option>
            <option value="out">Agotado</option>
          </select>
          <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-zinc-700 pointer-events-none">expand_more</span>
        </div>
        <div className="relative">
          <select 
            value={onlineFilter}
            onChange={(e) => setOnlineFilter(e.target.value)}
            className="w-full bg-[#1A1A1A] border border-white/5 rounded-xl py-3.5 px-4 text-sm text-zinc-400 font-bold focus:ring-1 focus:ring-primary outline-none appearance-none cursor-pointer hover:bg-zinc-900 transition-colors"
          >
            <option value="">Tienda: Todos</option>
            <option value="online">Disponible Online</option>
            <option value="offline">No Disponible</option>
          </select>
          <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-zinc-700 pointer-events-none">expand_more</span>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-800/40 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300 border-b border-white/5">
                <th className="py-3 px-6">Producto / SKU</th>
                <th className="py-3 px-6">Variante</th>
                <th className="py-3 px-6 text-right">En Mano</th>
                <th className="py-3 px-6 text-right">Reservado POS</th>
                <th className="py-3 px-6 text-right">Reservado Web</th>
                <th className="py-3 px-6 text-right">Disponible</th>
                <th className="py-3 px-6 text-center">Estado</th>
                <th className="py-3 px-6 text-center">Online</th>
                <th className="py-3 px-6 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm font-data-tabular text-white">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-20 text-center text-zinc-500 font-black uppercase tracking-widest animate-pulse">
                    Cargando inventario real...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-20 text-center text-zinc-500 font-black uppercase tracking-widest">
                    {searchQuery ? 'No se encontraron productos' : 'No hay productos en la base de datos'}
                  </td>
                </tr>
              ) : (() => {
                // 1. Agrupar por product_id
                const groupsMap: Record<string, any[]> = {};
                filteredItems.forEach(item => {
                  const prodId = item.product_variants?.product_id;
                  if (prodId) {
                    if (!groupsMap[prodId]) groupsMap[prodId] = [];
                    groupsMap[prodId].push(item);
                  }
                });

                // 2. Mantener orden original de productos
                const processed = new Set<string>();
                const groupedList: Array<{
                  productId: string;
                  product: any;
                  items: any[];
                  hasMultiple: boolean;
                }> = [];

                filteredItems.forEach(item => {
                  const prodId = item.product_variants?.product_id;
                  if (prodId && !processed.has(prodId)) {
                    processed.add(prodId);
                    const groupItems = groupsMap[prodId] || [];
                    const firstItem = groupItems[0];
                    const hasOptions = firstItem?.product_variants?.variant_options && 
                                      Object.keys(firstItem.product_variants.variant_options).length > 0;
                    const hasMultiple = groupItems.length > 1 || hasOptions;
                    groupedList.push({
                      productId: prodId,
                      product: firstItem?.product_variants?.products,
                      items: groupItems,
                      hasMultiple
                    });
                  }
                });

                // 3. Renderizar grupos y sus variantes
                return groupedList.flatMap(({ productId, product, items: groupItems, hasMultiple }) => {
                  // Si no tiene múltiples variantes, se renderiza exactamente igual que antes (Fila simple)
                  if (!hasMultiple) {
                    const item = groupItems[0];
                    if (!item) return [];
                    const onlineReserved = product?.online_reserved || 0;
                    const available = item.available || 0;
                    const posAvailable = product?.available_online 
                      ? Math.max(0, available - onlineReserved)
                      : available;
                    const status = item.on_hand > 10 ? 'Óptimo' : item.on_hand > 0 ? 'Bajo Stock' : 'Agotado';
                    const color = item.on_hand > 10 ? 'emerald' : item.on_hand > 0 ? 'amber' : 'red';
                    const itemKey = `${item.tenant_id}-${item.variant_id}-${item.location_id}`;
                    
                    const variantImages = item.product_variants?.images as string[] | undefined;
                    const productImages = product?.images as string[] | undefined;
                    const firstImage = variantImages?.[0] || productImages?.[0];
                    const thumbSrc = firstImage ? getThumb(firstImage) : null;

                    return (
                      <tr key={itemKey} className="hover:bg-white/[0.02] transition-colors group relative">
                        <td className="py-3 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-white/5 flex items-center justify-center shrink-0 overflow-hidden">
                              {thumbSrc ? (
                                <img 
                                  src={thumbSrc} 
                                  alt={product?.nombre}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = firstImage || '';
                                  }}
                                />
                              ) : (
                                <span className="material-symbols-outlined text-zinc-700">image</span>
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-sm text-white">{product?.nombre || 'Desconocido'}</p>
                              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-0.5">
                                SKU: {item.product_variants?.sku || 'N/A'}
                                {item.product_variants?.barcode && <span className="ml-2">• EAN: {item.product_variants.barcode}</span>}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-6">
                          <span className="text-zinc-400 italic text-xs font-bold">Única</span>
                        </td>
                        <td className="py-3 px-6 text-right font-black text-white">{item.on_hand || 0}</td>
                        <td className="py-3 px-6 text-right font-black text-secondary">{item.committed || 0}</td>
                        <td className="py-3 px-6 text-right font-black text-amber-400">{onlineReserved}</td>
                        <td className={`py-3 px-6 text-right font-black text-lg text-${color}-400`}>
                          {product?.available_online ? posAvailable : available}
                        </td>
                        <td className="py-3 px-6 text-center">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border bg-${color}-500/10 text-${color}-400 border-${color}-500/20`}>
                            {status}
                          </span>
                        </td>
                        <td className="py-3 px-6 text-center">
                          {product?.available_online ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                              Sí
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border bg-zinc-500/10 text-zinc-400 border-zinc-500/20">
                              No
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-6 text-right relative">
                          <button 
                            onClick={() => setActionModalItem(item)}
                            className="p-2 text-zinc-400 hover:text-white transition-colors"
                          >
                            <span className="material-symbols-outlined">more_vert</span>
                          </button>
                        </td>
                      </tr>
                    );
                  }

                  // Si tiene múltiples variantes, se renderiza una fila master (Padre) y luego las filas de variantes hijas (indendadas)
                  const isExpanded = !!expandedProducts[productId]; // Colapsado por defecto
                  
                  // Totales acumulados de todas las variantes
                  const totalOnHand = groupItems.reduce((acc, curr) => acc + (curr.on_hand || 0), 0);
                  const totalCommitted = groupItems.reduce((acc, curr) => acc + (curr.committed || 0), 0);
                  const onlineReserved = product?.online_reserved || 0;
                  const totalAvailable = groupItems.reduce((acc, curr) => acc + (curr.available || 0), 0);
                  
                  const posAvailable = product?.available_online 
                    ? Math.max(0, totalAvailable - onlineReserved)
                    : totalAvailable;
                    
                  const masterStatus = totalOnHand > 10 ? 'Óptimo' : totalOnHand > 0 ? 'Bajo Stock' : 'Agotado';
                  const masterColor = totalOnHand > 10 ? 'emerald' : totalOnHand > 0 ? 'amber' : 'red';
                  
                  const firstImage = product?.images?.[0];
                  const thumbSrc = firstImage ? getThumb(firstImage) : null;
                  const masterKey = `master-${productId}`;

                  const masterRow = (
                    <tr 
                      key={masterKey} 
                      className="bg-white/[0.02] border-l-4 border-violet-500 hover:bg-white/[0.04] transition-colors group relative cursor-pointer" 
                      onClick={() => toggleExpand(productId)}
                    >
                      <td className="py-3 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-white/5 flex items-center justify-center shrink-0 overflow-hidden">
                            {thumbSrc ? (
                              <img 
                                src={thumbSrc} 
                                alt={product?.nombre}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = firstImage || '';
                                }}
                              />
                            ) : (
                              <span className="material-symbols-outlined text-zinc-700">image</span>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span 
                                className="material-symbols-outlined text-zinc-400 text-lg transition-transform" 
                                style={{ transform: isExpanded ? 'rotate(90deg)' : 'none' }}
                              >
                                chevron_right
                              </span>
                              <p className="font-bold text-sm text-white">{product?.nombre || 'Desconocido'}</p>
                              <span className="px-2 py-0.5 bg-violet-500/10 text-violet-400 text-[9px] font-black uppercase tracking-widest rounded-full border border-violet-500/20">
                                {groupItems.length} Variantes
                              </span>
                            </div>
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-0.5 ml-7">
                              Producto Base
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-6">
                        <span className="text-zinc-300 font-bold text-xs uppercase tracking-wider font-mono">Múltiples</span>
                      </td>
                      <td className="py-3 px-6 text-right font-black text-white/70">{totalOnHand}</td>
                      <td className="py-3 px-6 text-right font-black text-secondary/70">{totalCommitted}</td>
                      <td className="py-3 px-6 text-right font-black text-amber-400/70">{onlineReserved}</td>
                      <td className={`py-3 px-6 text-right font-black text-lg text-${masterColor}-400/80`}>
                        {product?.available_online ? posAvailable : totalAvailable}
                      </td>
                      <td className="py-3 px-6 text-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border bg-${masterColor}-500/10 text-${masterColor}-400 border-${masterColor}-500/20`}>
                          {masterStatus}
                        </span>
                      </td>
                      <td className="py-3 px-6 text-center">
                        {product?.available_online ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                            Sí
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border bg-zinc-500/10 text-zinc-400 border-zinc-500/20">
                            No
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-6 text-right relative" onClick={(e) => e.stopPropagation()}>
                        <span className="text-xs font-black uppercase tracking-widest text-zinc-400 font-mono">Grupo</span>
                      </td>
                    </tr>
                  );

                  if (!isExpanded) return [masterRow];

                  const childRows = groupItems.map(item => {
                    const variant = item.product_variants;
                    const available = item.available || 0;
                    const vStatus = item.on_hand > 10 ? 'Óptimo' : item.on_hand > 0 ? 'Bajo Stock' : 'Agotado';
                    const vColor = item.on_hand > 10 ? 'emerald' : item.on_hand > 0 ? 'amber' : 'red';
                    const vItemKey = `${item.tenant_id}-${item.variant_id}-${item.location_id}`;
                    
                    return (
                      <tr key={vItemKey} className="bg-white/[0.005] border-l-4 border-zinc-700/50 hover:bg-white/[0.02] transition-colors group relative">
                        <td className="py-2 px-6 pl-14">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-zinc-400 text-sm">
                              subdirectory_arrow_right
                            </span>
                            <div className="flex flex-col">
                              <span className="text-[11px] font-mono font-black text-zinc-400 uppercase tracking-wider">
                                SKU: {variant?.sku || 'N/A'}
                              </span>
                              {variant?.barcode && (
                                <span className="text-[9px] font-mono text-zinc-400 tracking-wider">
                                  EAN: {variant.barcode}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-2 px-6">
                          {variant?.variant_options && typeof variant.variant_options === 'object' ? (
                            <div className="flex flex-wrap gap-1.5">
                              {Object.entries(variant.variant_options).map(([key, val]) => (
                                <span 
                                  key={key} 
                                  className="px-2 py-0.5 bg-zinc-800 text-[9px] text-zinc-300 rounded-md border border-white/5 uppercase tracking-wider font-mono font-black"
                                >
                                  {key}: {String(val)}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-zinc-400 italic text-xs font-bold">Variante</span>
                          )}
                        </td>
                        <td className="py-2 px-6 text-right font-black text-white/90">{item.on_hand || 0}</td>
                        <td className="py-2 px-6 text-right font-black text-secondary/90">{item.committed || 0}</td>
                        <td className="py-2 px-6 text-right font-black text-zinc-400 font-mono text-xs">-</td>
                        <td className={`py-2 px-6 text-right font-black text-zinc-300`}>
                          {available}
                        </td>
                        <td className="py-2 px-6 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border bg-${vColor}-500/10 text-${vColor}-400 border-${vColor}-500/20`}>
                            {vStatus}
                          </span>
                        </td>
                        <td className="py-2 px-6 text-center">
                          <span className="text-xs text-zinc-400 font-mono font-black">-</span>
                        </td>
                        <td className="py-2 px-6 text-right relative">
                          <button 
                            onClick={() => setActionModalItem(item)}
                            className="p-1.5 text-zinc-400 hover:text-white transition-colors rounded-lg bg-zinc-900 border border-white/5"
                          >
                            <span className="material-symbols-outlined text-sm">more_vert</span>
                          </button>
                        </td>
                      </tr>
                    );
                  });

                  return [masterRow, ...childRows];
                });
              })()}
            </tbody>
          </table>
        </div>
      </div>

       {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md transition-all animate-in fade-in duration-300">
          <div className="bg-[#0D0D0E]/95 border border-white/10 rounded-[28px] w-full max-w-4xl max-h-[90vh] flex flex-col shadow-[0_0_80px_-20px_rgba(139,92,246,0.3)] overflow-hidden transition-all animate-in zoom-in-95 duration-300">
            <div className="sticky top-0 bg-[#0D0D0E]/95 backdrop-blur-xl border-b border-white/5 p-6 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-purple-500 flex items-center justify-center shadow-lg shadow-primary/20">
                  <span className="material-symbols-outlined text-white text-[22px]">add_box</span>
                </div>
                <div>
                  <h2 className="text-lg font-black text-white tracking-wide uppercase">Nuevo Producto</h2>
                  <p className="text-zinc-500 text-xs mt-0.5 font-medium">Completa la ficha técnica para ingresar stock al inventario</p>
                </div>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="p-2.5 hover:bg-white/5 rounded-xl transition-all duration-200 border border-transparent hover:border-white/10"
              >
                <span className="material-symbols-outlined text-zinc-400 text-[20px] block">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="flex-1 overflow-y-auto flex flex-col">
              <div className="p-6 space-y-6 overflow-y-auto flex-1">
                {autoImageFound && (
                  <div className="bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 p-4 rounded-2xl flex items-center justify-between text-xs transition-all animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-[20px] text-emerald-400 animate-pulse">auto_awesome</span>
                      <div>
                        <p className="font-bold text-emerald-300 text-[12px]">¡Autocompletado Híbrido Exitoso!</p>
                        <p className="text-zinc-400 text-[11px] mt-0.5">Campos importados automáticamente desde Cloudinary y el catálogo. Puedes editarlos libremente.</p>
                      </div>
                    </div>
                    <button 
                      type="button"
                      onClick={() => {
                        setFormData({
                          nombre: '',
                          slug: '',
                          sku: '',
                          price_ars: '',
                          barcode: '',
                          stock: '',
                          description: '',
                          available_online: false
                        });
                        setNewProductImages([]);
                        setAutoImageFound(false);
                        setDetectedGlobalId(null);
                      }}
                      className="bg-zinc-900 hover:bg-zinc-800 border border-white/5 hover:border-white/10 text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all shrink-0"
                    >
                      Limpiar todo
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* COLUMNA IZQUIERDA: DETALLES (7 de 12 columnas) */}
                  <div className="lg:col-span-7 space-y-6">
                    {/* Tarjeta de Identificación */}
                    <div className="bg-zinc-900/30 border border-white/5 rounded-2xl p-5 space-y-4">
                      <h3 className="text-xs font-black tracking-wider text-primary uppercase flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-primary">info</span>
                        Identificación Básica
                      </h3>
                      
                      <div className="relative space-y-4">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                          <div className="lg:col-span-8">
                            <label className="block text-xs font-bold text-zinc-400 mb-1.5 truncate">Nombre del Producto *</label>
                            <input
                              type="text"
                              required
                              value={formData.nombre}
                              onChange={(e) => {
                                setFormData({...formData, nombre: e.target.value});
                                searchGlobalSuggestions(e.target.value);
                              }}
                              className="w-full bg-[#121214] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium"
                              placeholder="Ej: Auriculares Sony WH-1000XM4"
                            />
                          </div>

                          <div className="lg:col-span-4">
                            <label className="block text-xs font-bold text-zinc-400 mb-1.5 truncate" title="Código de Barras (EAN-13)">
                              Código de Barras
                            </label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-zinc-500 text-[18px]">barcode</span>
                              <input
                                type="text"
                                value={formData.barcode}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setFormData({...formData, barcode: val});
                                  if (val.length >= 12) {
                                    searchGlobalImageByBarcode(val);
                                  } else {
                                    searchGlobalSuggestions(val);
                                  }
                                }}
                                className="w-full bg-[#121214] border border-white/10 rounded-xl pl-9 pr-3 py-3 text-white placeholder:text-zinc-700 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium"
                                placeholder="7790895067587"
                              />
                              {imageSearchLoading && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                  <span className="material-symbols-outlined text-primary animate-spin text-[18px]">sync</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {showGlobalSuggestions && globalImageSuggestions.length > 0 && (
                          <div className="absolute z-30 left-0 right-0 mt-1 bg-[#16161a] border border-white/10 rounded-xl overflow-hidden shadow-2xl divide-y divide-white/5">
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider px-3 py-2 bg-zinc-900/50">
                              Sugerencias de imágenes encontradas (Catálogo Híbrido)
                            </p>
                            {globalImageSuggestions.map((suggestion) => (
                              <button
                                key={suggestion.id}
                                type="button"
                                onClick={async () => {
                                  const fullData = await findGlobalImage(suggestion.barcode_ean13 || null, suggestion.normalized_name);
                                  setNewProductImages([suggestion.cloudinary_url]);
                                  setAutoImageFound(true);
                                  setDetectedGlobalId(suggestion.id);
                                  setFormData(prev => ({
                                    ...prev,
                                    nombre: fullData.normalized_name || suggestion.normalized_name,
                                    barcode: fullData.barcode_ean13 || suggestion.barcode_ean13 || prev.barcode,
                                    description: fullData.description || prev.description,
                                    price_ars: fullData.default_price?.toString() || prev.price_ars
                                  }));
                                  setShowGlobalSuggestions(false);
                                  setGlobalImageSuggestions([]);
                                }}
                                className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-white/5 text-left transition-colors"
                              >
                                <img 
                                  src={suggestion.cloudinary_url} 
                                  alt={suggestion.normalized_name}
                                  className="w-9 h-9 object-cover rounded-lg border border-white/10 shrink-0" 
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-white text-xs font-semibold truncate">{suggestion.normalized_name}</p>
                                  <p className="text-zinc-500 text-[10px]">
                                    {suggestion.barcode_ean13 ? `Código: ${suggestion.barcode_ean13}` : 'Librería de imágenes'}
                                  </p>
                                </div>
                                <span className="material-symbols-outlined text-emerald-400 text-[18px]">add_circle</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="flex items-center text-xs font-bold text-zinc-400 mb-1.5 group relative cursor-help select-none">
                            <span>SKU *</span>
                            <span className="w-3.5 h-3.5 inline-flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-[9px] text-zinc-400 font-bold ml-1.5 transition-colors">?</span>
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2.5 bg-[#16161a]/95 border border-white/10 text-[10px] text-zinc-400 font-normal leading-relaxed rounded-xl shadow-2xl backdrop-blur-md opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 z-50 text-center normal-case">
                              El <strong>SKU</strong> es el código interno para controlar el inventario. <br/><span className="text-zinc-500 mt-1 block">Ejemplo: <code>REMA-NEGRA-L</code> o <code>JAB-ALM-150G</code>.</span>
                            </span>
                          </label>
                          <input
                            type="text"
                            required
                            value={formData.sku}
                            onChange={(e) => setFormData({...formData, sku: e.target.value})}
                            className="w-full bg-[#121214] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium"
                            placeholder="Ej: SNY-1000-B"
                          />
                        </div>
                        <div>
                          <label className="flex items-center text-xs font-bold text-zinc-400 mb-1.5 group relative cursor-help select-none">
                            <span>Slug (URL)</span>
                            <span className="w-3.5 h-3.5 inline-flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-[9px] text-zinc-400 font-bold ml-1.5 transition-colors">?</span>
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2.5 bg-[#16161a]/95 border border-white/10 text-[10px] text-zinc-400 font-normal leading-relaxed rounded-xl shadow-2xl backdrop-blur-md opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 z-50 text-center normal-case">
                              El <strong>Slug</strong> es el texto amigable que forma la dirección web (URL) de este producto en tu catálogo online. Se auto-genera solo a partir del nombre, pero puedes editarlo.
                            </span>
                          </label>
                          <input
                            type="text"
                            value={formData.slug}
                            onChange={(e) => setFormData({...formData, slug: e.target.value})}
                            className="w-full bg-[#121214] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium"
                            placeholder="auto-generado"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Descripción y Tienda Online */}
                    <div className="bg-zinc-900/30 border border-white/5 rounded-2xl p-5 space-y-4">
                      <h3 className="text-xs font-black tracking-wider text-primary uppercase flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-primary">description</span>
                        Descripción y Canal Online
                      </h3>
                      
                      <div>
                        <label className="block text-xs font-bold text-zinc-400 mb-1.5">Descripción del Producto</label>
                        <textarea
                          rows={3}
                          value={formData.description}
                          onChange={(e) => setFormData({...formData, description: e.target.value})}
                          className="w-full bg-[#121214] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm resize-none"
                          placeholder="Escribe detalles del producto, marca, características..."
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 bg-[#121214] border border-white/5 rounded-xl">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-bold text-white">Disponible en Tienda Online</span>
                          <span className="text-[10px] text-zinc-500">Permite que tus clientes lo compren desde la web.</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.available_online || false}
                            onChange={(e) => setFormData({...formData, available_online: e.target.checked})}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-checked:after:bg-white"></div>
                        </label>
                      </div>
                    </div>

                    {/* Rubro y Atributos del Producto */}
                    <div className="bg-zinc-900/30 border border-white/5 rounded-2xl p-5 space-y-5">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black tracking-wider text-primary uppercase flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px] text-primary">layers</span>
                          Rubro y Atributos
                        </h3>
                        <span className="bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full text-[9px] font-black text-primary uppercase tracking-widest">
                          Variantes Dinámicas
                        </span>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-zinc-400 mb-1.5">Selecciona el Rubro del Producto</label>
                        <div className="relative">
                          <select
                            value={selectedRubro}
                            onChange={(e) => {
                              setSelectedRubro(e.target.value);
                              setRubroValues({});
                            }}
                            className="w-full bg-[#121214] border border-white/10 rounded-xl py-3 px-4 text-sm text-white font-medium focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer"
                          >
                            <option value="ninguno">Ninguno (Producto Simple)</option>
                            <option value="globales">✨ Mis Atributos de Ajustes (Base de Datos)</option>
                            <option value="ropa">Indumentaria y Ropa (Talle / Color)</option>
                            <option value="calzado">Calzado y Zapatos (Talle Calzado / Color)</option>
                            <option value="tecnologia">Tecnología y Electrónica (Capacidad / Modelo)</option>
                            <option value="ferreteria">Ferretería y Herramientas (Medida / Material)</option>
                            <option value="perfumeria">Perfumería y Cosmética (Contenido / Fragancia)</option>
                            <option value="dietetica">Dietética y Almacén (Peso / Presentación)</option>
                            <option value="gastronomia">Gastronomía y Bebidas (Medida / Sabor)</option>
                            <option value="personalizado">✨ Atributos Personalizados (Crear Libremente)</option>
                          </select>
                          <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">expand_more</span>
                        </div>
                      </div>

                      {selectedRubro !== 'ninguno' && RUBRO_PRESETS[selectedRubro] && (
                        <div className="space-y-4 pt-3 border-t border-white/5 animate-in fade-in duration-200">
                          {RUBRO_PRESETS[selectedRubro].attributes.map((attr) => {
                            const activeVals = rubroValues[attr.slug] || [];
                            return (
                              <div key={attr.slug} className="space-y-2">
                                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                                  {attr.name} (Selecciona los que aplican)
                                </label>
                                <div className="flex flex-wrap gap-2">
                                  {attr.options.map((opt) => {
                                    const isSelected = activeVals.includes(opt.value);
                                    return (
                                      <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => handleTogglePresetValue(attr.slug, opt.value)}
                                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 select-none ${
                                          isSelected
                                            ? 'bg-[#7C3AED]/10 text-[#A78BFA] border-[#7C3AED]/30 shadow-lg shadow-[#7C3AED]/5'
                                            : 'bg-zinc-800/40 border-white/5 text-zinc-400 hover:text-white hover:border-white/10'
                                        }`}
                                      >
                                        {attr.type === 'color' && opt.color && (
                                          <span
                                            className="inline-block w-3.5 h-3.5 rounded-full border border-white/20 animate-pulse"
                                            style={{ backgroundColor: opt.color }}
                                          />
                                        )}
                                        <span>{opt.value}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {selectedRubro === 'globales' && (
                        <div className="space-y-4 pt-3 border-t border-white/5 animate-in fade-in duration-200">
                          {tenantAttributes.length === 0 ? (
                            <div className="text-center py-6 text-zinc-500 text-xs italic">
                              No tienes atributos guardados en tus Ajustes Globales. Ve a Ajustes &gt; Atributos para configurarlos.
                            </div>
                          ) : (
                            tenantAttributes.map((attr) => {
                              const activeVals = rubroValues[attr.slug] || [];
                              const options = attr.product_attribute_options || [];
                              return (
                                <div key={attr.id} className="space-y-2">
                                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                                    {attr.name} (Selecciona los que aplican)
                                  </label>
                                  <div className="flex flex-wrap gap-2">
                                    {options.map((opt: any) => {
                                      const isSelected = activeVals.includes(opt.value);
                                      return (
                                        <button
                                          key={opt.id}
                                          type="button"
                                          onClick={() => handleTogglePresetValue(attr.slug, opt.value)}
                                          className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 select-none ${
                                            isSelected
                                              ? 'bg-[#7C3AED]/10 text-[#A78BFA] border-[#7C3AED]/30 shadow-lg shadow-[#7C3AED]/5'
                                              : 'bg-zinc-800/40 border-white/5 text-zinc-400 hover:text-white hover:border-white/10'
                                          }`}
                                        >
                                          {attr.type === 'color' && opt.color && (
                                            <span
                                              className="inline-block w-3.5 h-3.5 rounded-full border border-white/20 animate-pulse"
                                              style={{ backgroundColor: opt.color }}
                                            />
                                          )}
                                          <span>{opt.value}</span>
                                        </button>
                                      );
                                    })}
                                    {options.length === 0 && (
                                      <span className="text-[10px] text-zinc-500 italic">Este atributo no tiene opciones creadas aún.</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}

                      {selectedRubro === 'personalizado' && (
                        <div className="space-y-6 pt-4 border-t border-white/5 animate-in fade-in duration-200">
                          {/* Formulario para agregar un nuevo atributo personalizado */}
                          <div className="bg-zinc-950/40 p-4 border border-white/5 rounded-2xl space-y-4">
                            <h4 className="text-[11px] font-black tracking-wider text-emerald-400 uppercase flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">add_circle</span>
                              Nuevo Atributo Personalizado
                            </h4>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[10px] font-bold text-zinc-500 mb-1">Nombre (ej: Sabor, Fragancia...)</label>
                                <input
                                  type="text"
                                  value={newCustomAttrName}
                                  onChange={(e) => setNewCustomAttrName(e.target.value)}
                                  placeholder="Ej: Fragancia"
                                  className="w-full bg-[#121214] border border-white/10 rounded-xl py-2 px-3 text-xs text-white placeholder:text-zinc-650 focus:outline-none focus:border-emerald-500"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-zinc-500 mb-1">Tipo de Selección</label>
                                <select
                                  value={newCustomAttrType}
                                  onChange={(e) => setNewCustomAttrType(e.target.value as 'select' | 'color')}
                                  className="w-full bg-[#121214] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                                >
                                  <option value="select">Texto / Lista de Opciones</option>
                                  <option value="color">Paleta de Colores</option>
                                </select>
                              </div>
                            </div>
                            
                            <button
                              type="button"
                              onClick={handleAddCustomAttribute}
                              className="w-full py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-[#34D399] text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1 border border-emerald-500/25 active:scale-95"
                            >
                              <span className="material-symbols-outlined text-[14px]">add</span>
                              Agregar Atributo
                            </button>
                          </div>

                          {/* Lista de atributos personalizados creados */}
                          {customAttributes.length > 0 ? (
                            <div className="space-y-4">
                              {customAttributes.map((attr) => (
                                <div key={attr.slug} className="bg-zinc-900/50 border border-white/5 rounded-2xl p-4 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                                        <span className="text-[9px] bg-white/5 text-zinc-400 border border-white/5 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
                                          {attr.type === 'color' ? 'Color' : 'Texto'}
                                        </span>
                                        {attr.name}
                                      </h5>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveCustomAttribute(attr.slug)}
                                      className="text-zinc-500 hover:text-red-400 transition-all flex items-center gap-0.5"
                                    >
                                      <span className="material-symbols-outlined text-xs">delete</span>
                                      <span className="text-[9px] font-bold uppercase tracking-wider">Quitar</span>
                                    </button>
                                  </div>

                                  {/* Input para agregar opciones */}
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="text"
                                      value={newOptionInput[attr.slug] || ''}
                                      onChange={(e) => setNewOptionInput(prev => ({ ...prev, [attr.slug]: e.target.value }))}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          handleAddCustomOption(attr.slug);
                                        }
                                      }}
                                      placeholder="Escribe un valor y pulsa Enter..."
                                      className="flex-1 bg-[#121214] border border-white/10 rounded-xl py-2 px-3 text-xs text-white placeholder:text-zinc-650 focus:outline-none focus:border-emerald-500"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleAddCustomOption(attr.slug)}
                                      className="bg-zinc-800 text-zinc-300 hover:text-emerald-400 hover:bg-white/5 px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center"
                                    >
                                      Agregar
                                    </button>
                                  </div>

                                  {/* Lista de opciones añadidas */}
                                  <div className="flex flex-wrap gap-2">
                                    {attr.options.map((opt) => (
                                      <div
                                        key={opt}
                                        className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-950/60 border border-white/5 rounded-xl text-[11px] font-bold text-white group"
                                      >
                                        {attr.type === 'color' && (
                                          <span className="w-3 h-3 rounded-full border border-white/10" style={{ backgroundColor: '#7C3AED' }} />
                                        )}
                                        <span>{opt}</span>
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveCustomOption(attr.slug, opt)}
                                          className="text-zinc-500 hover:text-red-400 transition-all flex items-center"
                                        >
                                          <span className="material-symbols-outlined text-[12px]">close</span>
                                        </button>
                                      </div>
                                    ))}
                                    {attr.options.length === 0 && (
                                      <span className="text-[10px] text-zinc-500 italic">No hay opciones añadidas aún.</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8 border border-dashed border-white/5 rounded-2xl bg-zinc-950/25">
                              <span className="material-symbols-outlined text-zinc-500 text-3xl mb-1.5">dashboard_customize</span>
                              <p className="text-xs text-zinc-450 font-bold">Crea tus propios atributos personalizados</p>
                              <p className="text-[10px] text-zinc-500 mt-1 max-w-[280px] mx-auto">Define cosas como fragancia, voltaje, tamaño o cualquier propiedad para generar variantes.</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* COLUMNA DERECHA: MULTIMEDIA E INVENTARIO (5 de 12 columnas) */}
                  <div className="lg:col-span-5 space-y-6">
                    {/* Fotos de Producto Premium Box */}
                    <div className="bg-zinc-900/30 border border-white/5 rounded-2xl p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black tracking-wider text-primary uppercase flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px] text-primary">photo_camera</span>
                          Galería del Producto
                        </h3>
                        {autoImageFound && (
                          <span className="bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-full text-[9px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px] animate-pulse">auto_awesome</span>
                            Conectado
                          </span>
                        )}
                      </div>

                      <input
                        type="file"
                        ref={newImageFileRef}
                        accept="image/*"
                        multiple
                        onChange={handleNewImageUpload}
                        className="hidden"
                      />

                      {/* Caja Principal / Carrusel Premium */}
                      <div className="space-y-3">
                        {newProductImages.length === 0 ? (
                          <div 
                            className="aspect-[4/3] rounded-2xl border-2 border-dashed border-white/10 hover:border-primary/40 bg-[#121214] hover:bg-zinc-950/80 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group"
                            onClick={() => newImageFileRef.current?.click()}
                          >
                            {uploadingNewImage ? (
                              <div className="flex flex-col items-center gap-2">
                                <span className="material-symbols-outlined animate-spin text-primary text-3xl">sync</span>
                                <span className="text-[11px] text-zinc-400 font-bold">Subiendo a Cloudinary...</span>
                              </div>
                            ) : (
                              <div className="text-center p-4">
                                <div className="w-12 h-12 rounded-full bg-white/5 border border-white/5 group-hover:border-primary/20 flex items-center justify-center mx-auto mb-2.5 transition-all">
                                  <span className="material-symbols-outlined text-zinc-500 group-hover:text-primary transition-colors text-2xl">add_photo_alternate</span>
                                </div>
                                <p className="text-xs text-white font-bold group-hover:text-primary transition-colors">Añadir Fotos</p>
                                <p className="text-[10px] text-zinc-600 mt-1">Soporta JPG, PNG o WEBP (máx. 2MB)</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {/* Vista previa principal */}
                            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-white/10 group bg-zinc-950">
                              <img 
                                src={newProductImages[0]} 
                                alt="Principal" 
                                className="w-full h-full object-cover" 
                              />
                              {!autoImageFound && (
                                <button
                                  type="button"
                                  onClick={() => deleteNewProductImage(0)}
                                  className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-red-500/90 text-white rounded-xl backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all border border-white/10 shrink-0"
                                >
                                  <span className="material-symbols-outlined text-[16px] block">delete</span>
                                </button>
                              )}
                              <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-lg text-[9px] font-black text-white uppercase tracking-wider border border-white/5">
                                Portada Principal
                              </div>
                            </div>

                            {/* Miniaturas secundarias */}
                            <div className="grid grid-cols-4 gap-2">
                              {newProductImages.slice(1).map((url, index) => (
                                <div key={index + 1} className="relative aspect-square rounded-xl overflow-hidden border border-white/5 group bg-zinc-950">
                                  <img src={url} alt={`Miniatura ${index + 2}`} className="w-full h-full object-cover" />
                                  <button
                                    type="button"
                                    onClick={() => deleteNewProductImage(index + 1)}
                                    className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity animate-in fade-in"
                                  >
                                    <span className="material-symbols-outlined text-[10px]">close</span>
                                  </button>
                                </div>
                              ))}
                              
                              {newProductImages.length < 4 && (
                                <button
                                  type="button"
                                  onClick={() => newImageFileRef.current?.click()}
                                  className="aspect-square rounded-xl border border-dashed border-white/10 hover:border-primary/40 bg-zinc-950/40 hover:bg-zinc-950 flex items-center justify-center transition-all group"
                                >
                                  {uploadingNewImage ? (
                                    <span className="material-symbols-outlined animate-spin text-zinc-500 text-sm">sync</span>
                                  ) : (
                                    <span className="material-symbols-outlined text-zinc-500 group-hover:text-primary transition-colors text-lg">add</span>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Precios, stock e inventario */}
                    <div className="bg-zinc-900/30 border border-white/5 rounded-2xl p-5 space-y-4">
                      <h3 className="text-xs font-black tracking-wider text-primary uppercase flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-primary">payments</span>
                        Valores y Stock
                      </h3>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-zinc-400 mb-1.5">Precio (ARS) *</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-bold">$</span>
                            <input
                              type="number"
                              required
                              min="0"
                              value={formData.price_ars}
                              onChange={(e) => setFormData({...formData, price_ars: e.target.value})}
                              className="w-full bg-[#121214] border border-white/10 rounded-xl pl-7 pr-3 py-3 text-white placeholder:text-zinc-700 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium"
                              placeholder="350000"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-zinc-400 mb-1.5">Stock Inicial *</label>
                          <input
                            type="number"
                            required
                            min="0"
                            value={formData.stock}
                            onChange={(e) => setFormData({...formData, stock: e.target.value})}
                            className="w-full bg-[#121214] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-700 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm font-medium"
                            placeholder="12"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="sticky bottom-0 bg-[#070708] border-t border-white/5 p-5 flex gap-3 z-10">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-5 py-3.5 bg-zinc-900/80 border border-white/5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all font-bold text-xs uppercase tracking-wider"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-5 py-3.5 bg-gradient-to-r from-primary to-purple-600 text-white rounded-xl hover:from-[#6D28D9] hover:to-purple-700 transition-all font-bold text-xs uppercase tracking-wider disabled:opacity-50 flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98]"
                >
                  {saving ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[16px]">sync</span>
                      Guardando Ficha...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">save</span>
                      Registrar Producto
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Importar CSV */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-[#1A1A1A] border-b border-white/10 p-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white">Importar CSV</h2>
                <p className="text-zinc-500 text-sm mt-1">Sube un archivo CSV con los productos a importar</p>
              </div>
              <button 
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                  setImportPreview([]);
                }}
                className="p-2 hover:bg-white/5 rounded-xl transition-colors"
              >
                <span className="material-symbols-outlined text-zinc-400">close</span>
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Dropzone */}
              <div 
                className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => document.getElementById('csv-upload')?.click()}
              >
                <span className="material-symbols-outlined text-4xl text-zinc-600 mb-2">upload_file</span>
                <p className="text-zinc-400 text-sm mb-1">Arrastra un archivo CSV aquí o haz clic para seleccionar</p>
                <p className="text-zinc-600 text-xs">Formato: Producto, SKU, Precio, Stock, Barcode</p>
                <input 
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              {importFile && (
                <div className="flex items-center gap-3 p-3 bg-zinc-900/50 rounded-xl border border-white/5">
                  <span className="material-symbols-outlined text-primary">description</span>
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">{importFile.name}</p>
                    <p className="text-zinc-500 text-xs">{(importFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button 
                    onClick={() => {
                      setImportFile(null);
                      setImportPreview([]);
                    }}
                    className="p-1 hover:bg-white/5 rounded-lg"
                  >
                    <span className="material-symbols-outlined text-zinc-500 text-sm">close</span>
                  </button>
                </div>
              )}

              {/* Preview */}
              {importPreview.length > 0 && (
                <div>
                  <p className="text-zinc-400 text-sm font-medium mb-2">Vista previa ({importPreview.length} filas):</p>
                  <div className="bg-zinc-900/50 rounded-xl border border-white/5 overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-white/5 text-zinc-500">
                          {Object.keys(importPreview[0]).map(key => (
                            <th key={key} className="px-3 py-2 font-medium">{key}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {importPreview.map((row, i) => (
                          <tr key={i} className="border-b border-white/5 last:border-0">
                            {Object.values(row).map((value: any, j) => (
                              <td key={j} className="px-3 py-2 text-zinc-300">{value}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {importing && importProgress.total > 0 && (
                <div className="space-y-2 p-4 bg-zinc-900/80 border border-white/5 rounded-xl">
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span className="font-medium">Progreso de importación</span>
                    <span className="font-mono">{importProgress.current} de {importProgress.total} ({Math.round((importProgress.current / importProgress.total) * 100)}%)</span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-primary-container h-full transition-all duration-200" 
                      style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportFile(null);
                    setImportPreview([]);
                  }}
                  disabled={importing}
                  className="flex-1 px-5 py-3 bg-zinc-900 border border-white/10 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all font-bold text-sm disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleImportCSV}
                  disabled={!importFile || importing}
                  className="flex-1 px-5 py-3 bg-primary-container text-white rounded-xl hover:bg-[#6D28D9] transition-all font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {importing ? (
                    <>
                      <span className="material-symbols-outlined animate-spin">refresh</span>
                      <span>Importando ({importProgress.current}/{importProgress.total})...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined">upload</span>
                      <span>Importar</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Producto */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-[#1A1A1A] border-b border-white/10 p-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white">Editar Producto</h2>
                <p className="text-zinc-500 text-sm mt-1">Modifica los datos del producto</p>
              </div>
              <button 
                onClick={() => setShowEditModal(false)}
                className="p-2 hover:bg-white/5 rounded-xl transition-colors"
              >
                <span className="material-symbols-outlined text-zinc-400">close</span>
              </button>
            </div>

            <form onSubmit={handleEditProduct} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Nombre del Producto *</label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">SKU *</label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({...formData, sku: e.target.value})}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Slug (URL)</label>
                  <input
                    type="text"
                    disabled
                    value={formData.slug}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-zinc-500 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Precio (ARS) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.price_ars}
                    onChange={(e) => setFormData({...formData, price_ars: e.target.value})}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Stock *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.stock}
                    onChange={(e) => setFormData({...formData, stock: e.target.value})}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Código de Barras</label>
                <input
                  type="text"
                  value={formData.barcode}
                  onChange={(e) => setFormData({...formData, barcode: e.target.value})}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Fotos del Producto</label>
                <input
                  type="file"
                  ref={(el) => {
                    if (el) setImageFileRef(el);
                  }}
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <div className="grid grid-cols-4 gap-2">
                  {productImages.map((url, index) => (
                    <div key={index} className="relative group aspect-square">
                      <img src={url} alt={`Foto ${index + 1}`} className="w-full h-full object-cover rounded-lg" />
                      <button
                        type="button"
                        onClick={() => deleteProductImage(index)}
                        className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <span className="material-symbols-outlined text-xs">close</span>
                      </button>
                    </div>
                  ))}
                  <label className="aspect-square rounded-lg border-2 border-dashed border-white/20 flex items-center justify-center cursor-pointer hover:border-white/40 transition-colors" onClick={() => newImageFileRef.current?.click()}>
                    {uploadingImage ? (
                      <span className="material-symbols-outlined animate-spin text-zinc-500">sync</span>
                    ) : (
                      <span className="material-symbols-outlined text-zinc-500">add_photo_alternate</span>
                    )}
                  </label>
                </div>
                <p className="text-xs text-zinc-500 mt-1">Click para agregar fotos</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Descripción</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
              </div>

              <div className="flex items-center gap-3 p-4 bg-zinc-900/50 border border-white/10 rounded-xl">
                <input
                  type="checkbox"
                  id="available_online_edit"
                  checked={formData.available_online || false}
                  onChange={(e) => setFormData({...formData, available_online: e.target.checked})}
                  className="w-5 h-5 rounded border-white/20 bg-zinc-800 text-primary-container focus:ring-primary/50"
                />
                <label htmlFor="available_online_edit" className="text-sm">
                  <span className="font-medium text-white">Disponible en tienda online</span>
                  <span className="text-zinc-500 ml-2">(los clientes podrán comprar este producto)</span>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-5 py-3 bg-zinc-900 border border-white/10 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all font-bold text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-5 py-3 bg-primary-container text-white rounded-xl hover:bg-[#6D28D9] transition-all font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <span className="material-symbols-outlined animate-spin">refresh</span>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined">save</span>
                      Guardar Cambios
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ajustar Stock */}
      {showStockModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white">Ajustar Stock</h2>
                <p className="text-zinc-500 text-sm mt-1">{selectedItem.product_variants?.products?.nombre}</p>
              </div>
              <button 
                onClick={() => setShowStockModal(false)}
                className="p-2 hover:bg-white/5 rounded-xl transition-colors"
              >
                <span className="material-symbols-outlined text-zinc-400">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-zinc-900/50 rounded-xl p-3 text-center border border-white/5">
                  <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">Actual</p>
                  <p className="text-white font-black text-lg">{selectedItem.on_hand || 0}</p>
                </div>
                <div className="bg-zinc-900/50 rounded-xl p-3 text-center border border-white/5">
                  <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">Reservado</p>
                  <p className="text-secondary font-black text-lg">{selectedItem.committed || 0}</p>
                </div>
                <div className="bg-zinc-900/50 rounded-xl p-3 text-center border border-white/5">
                  <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">Disponible</p>
                  <p className="text-emerald-400 font-black text-lg">{selectedItem.available || 0}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Nuevo Stock Total</label>
                <input
                  type="number"
                  min="0"
                  id="new-stock-input"
                  defaultValue={selectedItem.on_hand || 0}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white text-center text-2xl font-black focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowStockModal(false)}
                  className="flex-1 px-5 py-3 bg-zinc-900 border border-white/10 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all font-bold text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    const input = document.getElementById('new-stock-input') as HTMLInputElement;
                    const newStock = parseInt(input.value) || 0;
                    handleAdjustStock(selectedItem, newStock);
                  }}
                  className="flex-1 px-5 py-3 bg-primary-container text-white rounded-xl hover:bg-[#6D28D9] transition-all font-bold text-sm flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">save</span>
                  Actualizar Stock
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {actionModalItem && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-md p-6 overflow-hidden shadow-2xl flex flex-col gap-6 relative">
            <button 
              onClick={() => setActionModalItem(null)}
              className="absolute right-4 top-4 p-2 text-zinc-500 hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>

            <div>
              <h3 className="text-lg font-black tracking-wider uppercase text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">apps</span>
                Opciones de Producto
              </h3>
              <p className="text-zinc-500 text-xs font-black uppercase tracking-widest mt-1">
                {actionModalItem.product_variants?.products?.nombre || 'Gestionar Producto'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setPreviewItem(actionModalItem);
                  setShowPreviewModal(true);
                  setActionModalItem(null);
                }}
                className="p-4 bg-white/5 border border-white/10 hover:border-blue-500/50 hover:bg-blue-500/5 rounded-2xl transition-all flex flex-col items-center justify-center text-center gap-2 group"
              >
                <span className="material-symbols-outlined text-3xl text-blue-400 group-hover:scale-110 transition-transform">visibility</span>
                <div>
                  <p className="text-white text-xs font-black uppercase tracking-wider">Ver</p>
                  <p className="text-zinc-500 text-[10px] uppercase tracking-widest mt-0.5">Vista previa</p>
                </div>
              </button>

              <button
                onClick={() => {
                  handleOpenEditModal(actionModalItem);
                  setActionModalItem(null);
                }}
                className="p-4 bg-white/5 border border-white/10 hover:border-primary/50 hover:bg-primary/5 rounded-2xl transition-all flex flex-col items-center justify-center text-center gap-2 group"
              >
                <span className="material-symbols-outlined text-3xl text-primary-container group-hover:scale-110 transition-transform">edit</span>
                <div>
                  <p className="text-white text-xs font-black uppercase tracking-wider">Editar</p>
                  <p className="text-zinc-500 text-[10px] uppercase tracking-widest mt-0.5">Modificar datos</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setSelectedItem(actionModalItem);
                  setShowStockModal(true);
                  setActionModalItem(null);
                }}
                className="p-4 bg-white/5 border border-white/10 hover:border-amber-500/50 hover:bg-amber-500/5 rounded-2xl transition-all flex flex-col items-center justify-center text-center gap-2 group"
              >
                <span className="material-symbols-outlined text-3xl text-amber-400 group-hover:scale-110 transition-transform">inventory_2</span>
                <div>
                  <p className="text-white text-xs font-black uppercase tracking-wider">Ajustar Stock</p>
                  <p className="text-zinc-500 text-[10px] uppercase tracking-widest mt-0.5">Actualizar inventario</p>
                </div>
              </button>

              <button
                onClick={() => {
                  handleExportCSV();
                  setActionModalItem(null);
                }}
                className="p-4 bg-white/5 border border-white/10 hover:border-emerald-500/50 hover:bg-emerald-500/5 rounded-2xl transition-all flex flex-col items-center justify-center text-center gap-2 group"
              >
                <span className="material-symbols-outlined text-3xl text-emerald-400 group-hover:scale-110 transition-transform">download</span>
                <div>
                  <p className="text-white text-xs font-black uppercase tracking-wider">Exportar CSV</p>
                  <p className="text-zinc-500 text-[10px] uppercase tracking-widest mt-0.5">Descargar datos</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setSelectedItem(actionModalItem);
                  fetchStockHistory(actionModalItem.variant_id);
                  setShowHistoryModal(true);
                  setActionModalItem(null);
                }}
                className="p-4 bg-white/5 border border-white/10 hover:border-violet-500/50 hover:bg-violet-500/5 rounded-2xl transition-all flex flex-col items-center justify-center text-center gap-2 group"
              >
                <span className="material-symbols-outlined text-3xl text-violet-400 group-hover:scale-110 transition-transform">history</span>
                <div>
                  <p className="text-white text-xs font-black uppercase tracking-wider">Historial</p>
                  <p className="text-zinc-500 text-[10px] uppercase tracking-widest mt-0.5">Auditoría Kardex</p>
                </div>
              </button>

              <button
                onClick={() => {
                  handleDeleteProduct(actionModalItem);
                  setActionModalItem(null);
                }}
                className="p-4 bg-white/5 border border-white/10 hover:border-red-500/50 hover:bg-red-500/5 rounded-2xl transition-all flex flex-col items-center justify-center text-center gap-2 group"
              >
                <span className="material-symbols-outlined text-3xl text-red-400 group-hover:scale-110 transition-transform">delete</span>
                <div>
                  <p className="text-white text-xs font-black uppercase tracking-wider">Eliminar</p>
                  <p className="text-zinc-500 text-[10px] uppercase tracking-widest mt-0.5">Borrar del sistema</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vista Previa Modal */}
      {showPreviewModal && previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="relative">
              {(previewItem.product_variants?.images?.[0] || previewItem.product_variants?.products?.images?.[0]) ? (
                <img 
                  src={previewItem.product_variants?.images?.[0] || previewItem.product_variants?.products?.images?.[0]}
                  alt={previewItem.product_variants?.products?.nombre}
                  className="w-full h-64 object-cover"
                />
              ) : (
                <div className="w-full h-64 bg-zinc-900 flex items-center justify-center">
                  <span className="material-symbols-outlined text-6xl text-zinc-700">image</span>
                </div>
              )}
              <button 
                onClick={() => setShowPreviewModal(false)}
                className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="p-6">
              <h2 className="text-2xl font-black text-white">{previewItem.product_variants?.products?.nombre || 'Sin nombre'}</h2>
              <p className="text-zinc-500 text-sm mt-1">SKU: {previewItem.product_variants?.sku || 'N/A'}</p>
              
              {previewItem.product_variants?.barcode && (
                <p className="text-zinc-600 text-xs mt-1">Código: {previewItem.product_variants.barcode}</p>
              )}
              
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="bg-zinc-900 rounded-xl p-4 text-center">
                  <p className="text-zinc-500 text-xs uppercase">En Mano</p>
                  <p className="text-2xl font-black text-white">{previewItem.on_hand || 0}</p>
                </div>
                <div className="bg-zinc-900 rounded-xl p-4 text-center">
                  <p className="text-zinc-500 text-xs uppercase">Reservado</p>
                  <p className="text-2xl font-black text-amber-400">{previewItem.committed || 0}</p>
                </div>
                <div className="bg-zinc-900 rounded-xl p-4 text-center">
                  <p className="text-zinc-500 text-xs uppercase">Disponible</p>
                  <p className="text-2xl font-black text-emerald-400">{previewItem.available || 0}</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
                <div>
                  <p className="text-zinc-500 text-xs uppercase">Precio</p>
                  <p className="text-xl font-black text-white">${previewItem.product_variants?.price_ars || 0}</p>
                </div>
                <div className="text-right">
                  <p className="text-zinc-500 text-xs uppercase">Estado</p>
                  <span className={`inline-flex px-3 py-1 rounded-full text-xs font-black ${previewItem.available > 10 ? 'bg-emerald-500/20 text-emerald-400' : previewItem.available > 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>
                    {previewItem.available > 10 ? 'Óptimo' : previewItem.available > 0 ? 'Bajo Stock' : 'Agotado'}
                  </span>
                </div>
              </div>
              
              <button 
                onClick={() => {
                  setShowPreviewModal(false);
                  handleOpenEditModal(previewItem);
                }}
                className="w-full mt-6 py-3 bg-primary text-white font-black rounded-xl hover:bg-[#6D28D9] transition-colors"
              >
                Editar Producto
              </button>
            </div>
          </div>
        </div>
      )}
      {showHistoryModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl flex flex-col">
            <div className="sticky top-0 bg-[#1A1A1A] border-b border-white/10 p-6 flex items-center justify-between z-10">
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-violet-400">history</span>
                  Historial de Stock (Kardex)
                </h2>
                <p className="text-zinc-500 text-sm mt-1">
                  {selectedItem.product_variants?.products?.nombre || 'Producto'} — SKU: <span className="font-mono text-zinc-300">{selectedItem.product_variants?.sku || 'N/A'}</span>
                </p>
              </div>
              <button 
                onClick={() => {
                  setShowHistoryModal(false);
                  setSelectedItem(null);
                  setHistoryItems([]);
                }}
                className="p-2 hover:bg-white/5 rounded-xl transition-colors"
              >
                <span className="material-symbols-outlined text-zinc-400">close</span>
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto min-h-[300px]">
              {loadingHistory ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <span className="material-symbols-outlined text-4xl text-primary animate-spin">sync</span>
                  <p className="text-zinc-500 text-xs font-black uppercase tracking-widest">Cargando transacciones...</p>
                </div>
              ) : historyItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-center border-2 border-dashed border-white/5 rounded-xl bg-zinc-900/30">
                  <span className="material-symbols-outlined text-4xl text-zinc-700">history</span>
                  <div>
                    <p className="text-zinc-400 text-sm font-medium">Sin movimientos registrados</p>
                    <p className="text-zinc-600 text-xs mt-1">El stock aún no ha registrado modificaciones en el sistema.</p>
                  </div>
                </div>
              ) : (
                <div className="bg-zinc-900/50 rounded-xl border border-white/5 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/5 text-zinc-500 bg-zinc-900/80">
                        <th className="px-5 py-3 font-medium uppercase tracking-wider">Fecha / Hora</th>
                        <th className="px-5 py-3 font-medium uppercase tracking-wider">Motivo</th>
                        <th className="px-5 py-3 font-medium uppercase tracking-wider text-right">Variación</th>
                        <th className="px-5 py-3 font-medium uppercase tracking-wider text-right">Detalle</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {historyItems.map((tx) => {
                        const dateStr = new Date(tx.created_at).toLocaleString('es-AR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        });
                        
                        let reasonLabel = 'Ajuste Manual';
                        let reasonColor = 'zinc';
                        if (tx.reason === 'sale') {
                          reasonLabel = 'Venta (POS)';
                          reasonColor = 'emerald';
                        } else if (tx.reason === 'purchase') {
                          reasonLabel = 'Compra / Carga';
                          reasonColor = 'blue';
                        } else if (tx.reason === 'loss') {
                          reasonLabel = 'Pérdida / Rotura';
                          reasonColor = 'red';
                        }

                        const sign = tx.quantity_changed > 0 ? '+' : '';
                        const quantityColor = tx.quantity_changed > 0 ? 'text-emerald-400' : 'text-red-400';

                        return (
                          <tr key={tx.id} className="hover:bg-white/[0.01] transition-colors">
                            <td className="px-5 py-3 text-zinc-300 font-medium">{dateStr}</td>
                            <td className="px-5 py-3">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border bg-${reasonColor}-500/10 text-${reasonColor}-400 border-${reasonColor}-500/20`}>
                                {reasonLabel}
                              </span>
                            </td>
                            <td className={`px-5 py-3 text-right font-black text-sm ${quantityColor}`}>
                              {sign}{tx.quantity_changed}
                            </td>
                            <td className="px-5 py-3 text-right text-zinc-500">
                              {tx.reference_id ? 'Ref: ' + tx.reference_id.substring(0, 8) : 'N/A'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-white/10 bg-zinc-900/50 flex justify-end">
              <button
                onClick={() => {
                  setShowHistoryModal(false);
                  setSelectedItem(null);
                  setHistoryItems([]);
                }}
                className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold text-sm transition-all"
              >
                Cerrar Historial
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </FeatureGate>
  );
}
