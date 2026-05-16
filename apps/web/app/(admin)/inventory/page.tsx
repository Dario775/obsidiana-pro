'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/hooks/use-tenant';
import { uploadImageToCloudinary, buildImageUrl, getThumbnailUrl, getPreviewUrl, getCloudinaryUrl } from '@/lib/cloudinary';
import { findGlobalImage, contributeImageToGlobal } from '@/lib/global-catalog';
import { FeatureGate } from '@/components/feature-gate';

export default function InventoryPage() {
  const { tenant, plan } = useTenant();
  const [items, setItems] = useState<any[]>([]);
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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

  const getThumb = (url: string | undefined) => {
    if (!url) return null;
    try {
      const pid = url.match(/upload\/(?:v\d+\/)?([^\.]+)/)?.[1];
      if (!pid) return url;
      return getThumbnailUrl(pid, 64);
    } catch { return url; }
  };

  useEffect(() => {
    fetchInventory();
  }, [tenant]);

  async function fetchInventory() {
    if (!tenant?.id) return;
    setLoading(true);
    
    // First get inventory with product variant info

    const { data: inventoryData, error: invError } = await supabase
      .from('inventory_levels')
      .select('*')
      .eq('tenant_id', tenant.id);
    

    
    if (invError) {
      console.error('Error fetching inventory:', invError);
      setLoading(false);
      return;
    }
    
    // Get variant IDs
    const variantIds = (inventoryData || []).map(item => item.variant_id);
    
    if (variantIds.length === 0) {
      setItems([]);
      setFilteredItems([]);
      setLoading(false);
      return;
    }
    
    // Get variants with their products
    const { data: variantsData, error: varError } = await supabase
      .from('product_variants')
      .select('id, sku, price_ars, product_id')
      .in('id', variantIds);
    
    if (varError) {
      console.error('Error fetching variants:', varError.message, varError.details, varError.code);
      setLoading(false);
      return;
    }
    
    const productIds = variantsData?.map(v => v.product_id).filter(Boolean) || [];
    
    let productsMap: Record<string, any> = {};
    
    if (productIds.length > 0) {
      const { data: productsData } = await supabase
        .from('products')
        .select('id, nombre, available_online, online_reserved, images')
        .in('id', productIds);
      
      productsData?.forEach(p => {
        productsMap[p.id] = p;
      });
    }
    
    // Merge data
    const enrichedData = inventoryData?.map(item => {
      const variant = variantsData?.find(v => v.id === item.variant_id);
      const product = variant ? productsMap[variant.product_id] : null;
      return {
        ...item,
        available: (item.on_hand || 0) - (item.committed || 0),
        product_variants: {
          ...variant,
          products: { ...product, nombre: product?.nombre || product?.title }
        }
      };
    }) || [];
    
    // Filtramos productos de MercadoLibre (SKU empieza con ML-) ya que no son para el POS
    const filteredEnrichedData = (enrichedData || []).filter(item => {
      const sku = item.product_variants?.sku || '';
      return !sku.startsWith('ML-');
    });
    
    setItems(filteredEnrichedData);
    setLoading(false);

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

      // 1. Insertar producto
      const { data: product, error: productError } = await supabase
        .from('products')
        .insert({
          tenant_id: tenantId,
          nombre: formData.nombre,
          slug: uniqueSlug,
          description: formData.description,
          status: 'active',
          images: newProductImages,
          available_online: formData.available_online || false
        })
        .select()
        .single();

      if (productError) throw productError;

      // 2. Insertar variante
      const { data: variant, error: variantError } = await supabase
        .from('product_variants')
        .insert({
          product_id: product.id,
          sku: formData.sku,
          price_ars: parseInt(formData.price_ars) || 0
        })
        .select()
        .single();

      if (variantError) throw variantError;

      // 3. Insertar inventario
      // NOTA: 'available' es una columna GENERADA (on_hand - committed)
      // NO enviar 'available' en el insert, PostgreSQL lo calcula automáticamente
      const { error: inventoryError } = await supabase
        .from('inventory_levels')
        .insert({
          tenant_id: tenantId,
          variant_id: variant.id,
          on_hand: parseInt(formData.stock) || 0,
          committed: 0
        });

      if (inventoryError) throw inventoryError;

      // 4. Insertar attribute assignments si hay atributos seleccionados
      if (selectedAttributeIds.length > 0 && product) {
        const assignments = selectedAttributeIds.map((attrId, index) => ({
          product_id: product.id,
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
          product?.nombre?.toLowerCase().includes(search) ||
          variant?.sku?.toLowerCase().includes(search) ||
          variant?.barcode?.toLowerCase().includes(search)
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
  
  // Buscar imagen global por código de barras (13 dígitos)
  const searchGlobalImageByBarcode = useCallback(async (barcode: string) => {
    if (!barcode || barcode.length < 12) {
      if (autoImageFound) {
        setNewProductImages([]);
        setAutoImageFound(false);
        setDetectedGlobalId(null);
      }
      return;
    }
    
    setImageSearchLoading(true);
    try {
      const result = await findGlobalImage(barcode, null);
      
      if (result.id && result.cloudinary_url) {
        setNewProductImages([result.cloudinary_url]);
        setAutoImageFound(true);
        setDetectedGlobalId(result.id);
        setImageSearchLoading(false);
        
        const applyData = confirm(
          `Encontrado: ${result.normalized_name}\n\n` +
          `Precio guía: $${result.default_price || 'N/A'}\n` +
          `¿Rellenar los campos del formulario con estos datos?`
        );
        
        if (applyData) {
          setFormData(prev => ({
            ...prev,
            nombre: result.normalized_name || prev.nombre,
            barcode: result.barcode_ean13 || barcode,
            price_ars: result.default_price?.toString() || prev.price_ars,
            description: result.description || prev.description
          }));
        }
        return;
      }
      
      setAutoImageFound(false);
      setDetectedGlobalId(null);
    } catch (err) {
      console.error('Error searching global image:', err);
    }
    setImageSearchLoading(false);
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

      // 3. Actualizar stock
      const { error: inventoryError } = await supabase
        .from('inventory_levels')
        .update({ on_hand: parseInt(formData.stock) || 0 })
        .eq('tenant_id', tenantId)
        .eq('variant_id', variant.id);

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
        
        for (const row of rows) {
          try {
            const title = row['Producto'] || row['Nombre'] || row['Title'] || '';
            const sku = row['SKU'] || row['sku'] || '';
            const price = parseInt(row['Precio'] || row['Price'] || row['price_ars'] || '0');
            const stock = parseInt(row['Stock'] || row['stock'] || row['En Mano'] || '0');
            const barcode = row['Barcode'] || row['barcode'] || row['Código de Barras'] || '';
            
            if (!title || !sku) continue;
            
            const baseSlug = title.toLowerCase().replace(/\s+/g, '-');
            const uniqueSlug = await generateUniqueSlug(tenantId, baseSlug);
            
            // Insertar producto
            const { data: product } = await supabase
              .from('products')
              .insert({
                tenant_id: tenantId,
                nombre: title,
                slug: uniqueSlug,
                description: row['Descripción'] || row['Description'] || '',
                status: 'active',
                images: [],
                available_online: false
              })
              .select()
              .single();
            
            if (!product) continue;
            
            // Insertar variante
            const { data: variant } = await supabase
              .from('product_variants')
              .insert({
                tenant_id: tenantId,
                product_id: product.id,
                sku,
                barcode,
                options: {},
                price_ars: price,
                requires_shipping: true
              })
              .select()
              .single();
            
            if (!variant) continue;
            
            // Insertar inventario
            await supabase
              .from('inventory_levels')
              .insert({
                tenant_id: tenantId,
                variant_id: variant.id,
                on_hand: stock,
                committed: 0
              });
            
            imported++;
          } catch (err) {
            errors++;
            console.error('Error importando fila:', err);
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
      
      await supabase
        .from('inventory_levels')
        .update({ on_hand: newStock })
        .eq('tenant_id', tenantId)
        .eq('variant_id', item.variant_id);
      
      await fetchInventory();
      setShowStockModal(false);
      alert('Stock actualizado exitosamente');
    } catch (error: any) {
      console.error('Error al ajustar stock:', error);
      alert('Error: ' + error.message);
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
              <tr className="bg-[#1E1E1E]/50 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                <th className="py-4 px-8">Producto / SKU</th>
                <th className="py-4 px-8">Variante</th>
                <th className="py-4 px-8 text-right">En Mano</th>
                <th className="py-4 px-8 text-right">Reservado POS</th>
                <th className="py-4 px-8 text-right text-amber-400">Reservado Web</th>
                <th className="py-4 px-8 text-right text-primary-container">Disponible</th>
                <th className="py-4 px-8 text-center">Estado</th>
                <th className="py-4 px-8 text-center">Online</th>
                <th className="py-4 px-8 w-20"></th>
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
              ) : filteredItems.map((item, i) => {
                const product = item.product_variants?.products;
                const variant = item.product_variants;
                const onlineReserved = product?.online_reserved || 0;
                const available = item.available || 0;
                // Disponible para POS = available - online_reserved (only if published)
                const posAvailable = product?.available_online 
                  ? Math.max(0, available - onlineReserved)
                  : available;
                const status = item.on_hand > 10 ? 'Óptimo' : item.on_hand > 0 ? 'Bajo Stock' : 'Agotado';
                const color = item.on_hand > 10 ? 'emerald' : item.on_hand > 0 ? 'amber' : 'red';
                const itemKey = `${item.tenant_id}-${item.variant_id}-${item.location_id}`;
                
                const variantImages = variant?.images as string[] | undefined;
                const productImages = product?.images as string[] | undefined;
                const firstImage = variantImages?.[0] || productImages?.[0];
                const thumbSrc = firstImage ? getThumb(firstImage) : null;

                return (
                  <tr key={itemKey} className="hover:bg-white/[0.02] transition-colors group relative">
                    <td className="py-5 px-8">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-white/5 flex items-center justify-center shrink-0 overflow-hidden">
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
                          <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mt-0.5">
                            SKU: {variant?.sku || 'N/A'}
                            {variant?.barcode && <span className="ml-2">• EAN: {variant.barcode}</span>}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-5 px-8 text-zinc-400 font-bold text-xs">
                      {variant?.sku || 'Única'}
                    </td>
                    <td className="py-5 px-8 text-right font-black text-white">{item.on_hand || 0}</td>
                    <td className="py-5 px-8 text-right font-black text-secondary">{item.committed || 0}</td>
                    <td className="py-5 px-8 text-right font-black text-amber-400">{onlineReserved}</td>
                    <td className={`py-5 px-8 text-right font-black text-lg text-${color}-400`}>
                      {product?.available_online ? posAvailable : available}
                    </td>
                    <td className="py-5 px-8 text-center">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border bg-${color}-500/10 text-${color}-400 border-${color}-500/20`}>
                        {status}
                      </span>
                    </td>
                    <td className="py-5 px-8 text-center">
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
                    <td className="py-5 px-8 text-right relative">
                      <button 
                        onClick={() => setActionModalItem(item)}
                        className="p-2 text-zinc-600 hover:text-white transition-colors"
                      >
                        <span className="material-symbols-outlined">more_vert</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nuevo Producto */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-[#1A1A1A] border-b border-white/10 p-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white">Nuevo Producto</h2>
                <p className="text-zinc-500 text-sm mt-1">Completa los datos del producto y stock inicial</p>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-white/5 rounded-xl transition-colors"
              >
                <span className="material-symbols-outlined text-zinc-400">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-5">
              <div className="relative">
                <label className="block text-sm font-medium text-zinc-400 mb-2">Nombre del Producto *</label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) => {
                    setFormData({...formData, nombre: e.target.value});
                    searchGlobalSuggestions(e.target.value);
                  }}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Ej: Auriculares Sony WH-1000XM4"
                />
                {showGlobalSuggestions && globalImageSuggestions.length > 0 && (
                  <div className="absolute z-10 left-0 right-0 mt-1 bg-zinc-800 border border-white/10 rounded-xl overflow-hidden shadow-xl">
                    <p className="text-xs text-zinc-500 px-3 py-2 border-b border-white/5">
                      Sugerencias del catálogo global
                    </p>
                    {globalImageSuggestions.map((suggestion) => (
                      <button
                        key={suggestion.id}
                        type="button"
                        onClick={async () => {
                          const confirmApply = confirm(
                            `¿Usar "${suggestion.normalized_name}" y auto-completar el formulario?`
                          );
                          if (confirmApply) {
                            const fullData = await findGlobalImage(null, suggestion.normalized_name);
                            setNewProductImages([suggestion.cloudinary_url]);
                            setAutoImageFound(true);
                            setDetectedGlobalId(suggestion.id);
                            setFormData(prev => ({
                              ...prev,
                              nombre: fullData.normalized_name || suggestion.normalized_name,
                              barcode: fullData.barcode_ean13 || prev.barcode,
                              description: fullData.description || prev.description,
                              price_ars: fullData.default_price?.toString() || prev.price_ars
                            }));
                          }
                          setShowGlobalSuggestions(false);
                          setGlobalImageSuggestions([]);
                        }}
                        className="w-full px-3 py-2 flex items-center gap-3 hover:bg-white/5 text-left transition-colors"
                      >
                        <img 
                          src={suggestion.cloudinary_url} 
                          alt={suggestion.normalized_name}
                          className="w-10 h-10 object-cover rounded-lg" 
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm truncate">{suggestion.normalized_name}</p>
                          <p className="text-zinc-500 text-xs">
                            {suggestion.match_type === 'barcode' ? 'Código de barras' : 'Por nombre'}
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
                  <label className="block text-sm font-medium text-zinc-400 mb-2">SKU *</label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({...formData, sku: e.target.value})}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="Ej: SNY-1000-B"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Slug (URL)</label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({...formData, slug: e.target.value})}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="auto-generado"
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
                    placeholder="350000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Stock Inicial *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.stock}
                    onChange={(e) => setFormData({...formData, stock: e.target.value})}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="12"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Código de Barras (EAN-13)</label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => {
                      setFormData({...formData, barcode: e.target.value});
                      if (e.target.value.length >= 12) {
                        searchGlobalImageByBarcode(e.target.value);
                      }
                    }}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="7123456789012"
                  />
                  {imageSearchLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <span className="material-symbols-outlined text-primary animate-spin">sync</span>
                    </div>
                  )}
                </div>
                {autoImageFound && (
                  <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                    Imagen encontrada en catálogo global
                  </p>
                )}
              </div>

              {/* Attribute Selector */}
              {productAttributes.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">
                    Atributos del Producto
                    <span className="text-zinc-600 text-xs ml-2">(opcional)</span>
                  </label>
                  <div className="space-y-3">
                    {productAttributes.map((attr) => (
                      <div key={attr.id}>
                        <p className="text-xs text-zinc-500 font-bold uppercase mb-1">{attr.name}</p>
                        <div className="flex flex-wrap gap-2">
                          {attr.options.map((opt: any) => (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                setSelectedAttributeIds((prev) => 
                                  prev.includes(opt.id)
                                    ? prev.filter(id => id !== opt.id)
                                    : [...prev, opt.id]
                                );
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                selectedAttributeIds.includes(opt.id)
                                  ? 'bg-primary-container text-white'
                                  : 'bg-zinc-800 text-zinc-400 hover:text-white'
                              }`}
                            >
                              {attr.type === 'color' && opt.color && (
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
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Fotos del Producto
                  {autoImageFound && (
                    <span className="ml-2 text-xs text-emerald-400 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                      Global
                    </span>
                  )}
                </label>
                <input
                  type="file"
                  ref={newImageFileRef}
                  accept="image/*"
                  multiple
                  onChange={handleNewImageUpload}
                  className="hidden"
                />
                <div className={`grid grid-cols-4 gap-2 relative ${autoImageFound ? 'ring-2 ring-emerald-500/50 ring-offset-2 ring-offset-zinc-900 rounded-xl' : ''}`}>
                  {newProductImages.map((url, index) => (
                    <div 
                      key={index} 
                      className={`relative group aspect-square rounded-lg overflow-hidden ${autoImageFound && index === 0 ? 'animate-pulse' : ''}`}
                      style={autoImageFound && index === 0 ? { 
                        boxShadow: '0 0 20px rgba(16, 185, 129, 0.4)',
                        animation: 'pulse 2s infinite'
                      } : {}}
                    >
                      <img src={url} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" />
                      {!autoImageFound && (
                        <button
                          type="button"
                          onClick={() => deleteNewProductImage(index)}
                          className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <span className="material-symbols-outlined text-xs">close</span>
                        </button>
                      )}
                      {autoImageFound && (
                        <div className="absolute bottom-1 left-1 right-1 bg-emerald-600/90 backdrop-blur-sm py-0.5 px-1.5 rounded text-[10px] text-white text-center">
                          Global
                        </div>
                      )}
                    </div>
                  ))}
<label 
                    className="aspect-square rounded-lg border-2 border-dashed border-white/20 flex items-center justify-center cursor-pointer hover:border-white/40 transition-colors"
                    onClick={() => {
                      newImageFileRef.current?.click();
                    }}
                  >
                    {uploadingNewImage ? (
                      <span className="material-symbols-outlined animate-spin text-zinc-500">sync</span>
                    ) : (
                      <span className="material-symbols-outlined text-zinc-500 text-3xl">add_photo_alternate</span>
                    )}
                  </label>
                </div>
                <style jsx>{`
                  @keyframes pulse {
                    0%, 100% { box-shadow: 0 0 20px rgba(16, 185, 129, 0.4); }
                    50% { box-shadow: 0 0 35px rgba(16, 185, 129, 0.6); }
                  }
                `}</style>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Descripción</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  placeholder="Descripción del producto..."
                />
              </div>

              <div className="flex items-center gap-3 p-4 bg-zinc-900/50 border border-white/10 rounded-xl">
                <input
                  type="checkbox"
                  id="available_online"
                  checked={formData.available_online || false}
                  onChange={(e) => setFormData({...formData, available_online: e.target.checked})}
                  className="w-5 h-5 rounded border-white/20 bg-zinc-800 text-primary-container focus:ring-primary/50"
                />
                <label htmlFor="available_online" className="text-sm">
                  <span className="font-medium text-white">Disponible en tienda online</span>
                  <span className="text-zinc-500 ml-2">(los clientes podrán comprar este producto)</span>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
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
                      Guardar Producto
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

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportFile(null);
                    setImportPreview([]);
                  }}
                  className="flex-1 px-5 py-3 bg-zinc-900 border border-white/10 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all font-bold text-sm"
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
                      Importando...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined">upload</span>
                      Importar
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
    </div>
    </FeatureGate>
  );
}
