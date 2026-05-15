import { supabase } from './supabase';
import { 
  uploadImageToCloudinary, 
  extractPublicId,
  getCloudinaryUrl,
  getThumbnailUrl,
  getPreviewUrl,
  isGlobalImage 
} from './cloudinary';

export interface GlobalCatalogImage {
  id: string;
  barcode_ean13: string | null;
  normalized_name: string;
  normalized_slug: string;
  cloudinary_public_id: string;
  cloudinary_url: string;
  width: number | null;
  height: number | null;
  format: string | null;
  quality_score: number | null;
  usage_count: number;
  status: string;
  brand: string | null;
  category: string | null;
}

export interface ImageMatchResult {
  id: string | null;
  cloudinary_url: string | null;
  normalized_name: string | null;
  quality_score: number | null;
  match_type: 'barcode' | 'name' | 'none';
  confidence: number;
  public_id: string | null;
  description?: string | null;
  default_price?: number | null;
  barcode_ean13?: string | null;
  all_matches?: ImageMatchResult[];
}

export function normalizeForPublicId(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^\w\d]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 50);
}

export function getOptimizedImageUrl(
  cloudinaryPublicId: string,
  usage: 'list' | 'detail' | 'thumbnail' | 'full' | 'pos' = 'detail'
): string {
  if (!cloudinaryPublicId) return '';
  
  if (cloudinaryPublicId.startsWith('http')) {
    const pid = extractPublicId(cloudinaryPublicId);
    if (pid) {
      return buildImageUrlByUsage(pid, usage);
    }
    return cloudinaryPublicId;
  }
  
  return buildImageUrlByUsage(cloudinaryPublicId, usage);
}

function buildImageUrlByUsage(publicId: string, usage: string): string {
  switch (usage) {
    case 'thumbnail':
      return getThumbnailUrl(publicId, 150);
    case 'full':
      return getCloudinaryUrl(publicId, {});
    case 'pos':
      return getThumbnailUrl(publicId, 200);
    case 'list':
      return getPreviewUrl(publicId, 400);
    default:
      return getPreviewUrl(publicId, 800);
  }
}

export async function findGlobalImage(
  barcode: string | null,
  productName: string | null
): Promise<ImageMatchResult> {
  try {
    if (barcode && barcode.length >= 12) {
      const { data, error } = await supabase
        .from('global_catalog')
        .select('id, cloudinary_url, normalized_name, status, description, barcode_ean13, quality_score, default_price')
        .eq('barcode_ean13', barcode)
        .in('status', ['approved', 'featured'])
        .limit(1)
        .single();
      
      if (!error && data) {
        const pid = extractPublicId(data.cloudinary_url);
        return {
          id: data.id,
          cloudinary_url: data.cloudinary_url,
          normalized_name: data.normalized_name,
          quality_score: (data as any).quality_score || null,
          match_type: 'barcode',
          confidence: 1.0,
          public_id: pid || null,
          barcode_ean13: data.barcode_ean13,
          description: (data as any).description || null,
          default_price: (data as any).default_price || null,
        };
      }
    }

    if (productName && productName.length >= 3) {
      const normalizedSearch = productName
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      const { data, error } = await supabase
        .from('global_catalog')
        .select('id, cloudinary_url, normalized_name, status, description, barcode_ean13, quality_score, default_price')
        .in('status', ['approved', 'featured'])
        .ilike('normalized_name', `%${normalizedSearch}%`)
        .limit(5);

      if (!error && data && data.length > 0) {
        // Return first one as primary, but we'll use all for suggestions
        const matches: ImageMatchResult[] = data.map(item => ({
          id: item.id,
          cloudinary_url: item.cloudinary_url,
          normalized_name: item.normalized_name,
          quality_score: (item as any).quality_score || null,
          match_type: 'name',
          confidence: 0.7,
          public_id: extractPublicId(item.cloudinary_url) || null,
          barcode_ean13: item.barcode_ean13,
          description: (item as any).description || null,
          default_price: (item as any).default_price || null,
        }));
        
        // For backward compatibility, return first match with extra properties
        const firstMatch = matches[0] as ImageMatchResult;
        return {
          ...firstMatch,
          all_matches: matches
        };
      }
    }

    return {
      id: null,
      public_id: '',
      cloudinary_url: null,
      normalized_name: null,
      quality_score: null,
      match_type: 'none',
      confidence: 0
    };
  } catch (error) {
    console.error('findGlobalImage error:', error);
    return {
      id: null,
      public_id: '',
      cloudinary_url: null,
      normalized_name: null,
      quality_score: null,
      match_type: 'none',
      confidence: 0
    };
  }
}

export async function getGlobalImageForProduct(
  tenantId: string,
  variantId: string
): Promise<{ tenantImage: string | null; globalImage: string | null }> {
  try {
    const { data: variant } = await supabase
      .from('product_variants')
      .select('tenant_image_override, global_catalog_id, use_global_image')
      .eq('id', variantId)
      .eq('tenant_id', tenantId)
      .single();

    if (!variant) {
      return { tenantImage: null, globalImage: null };
    }

    const tenantImage = variant.tenant_image_override || null;

    let globalImage: string | null = null;
    if (variant.use_global_image && variant.global_catalog_id) {
      const { data: globalCatalog } = await supabase
        .from('global_catalog')
        .select('cloudinary_url')
        .eq('id', variant.global_catalog_id)
        .single();

      globalImage = globalCatalog?.cloudinary_url || null;
    }

    return { tenantImage, globalImage };
  } catch (error) {
    console.error('getGlobalImageForProduct error:', error);
    return { tenantImage: null, globalImage: null };
  }
}

export async function contributeImageToGlobal(
  tenantId: string,
  variantId: string,
  imageData: {
    cloudinary_public_id: string;
    cloudinary_url: string;
    width?: number;
    height?: number;
    format?: string;
    bytes?: number;
  },
  barcode?: string,
  productName?: string
): Promise<{ success: boolean; globalCatalogId?: string; message?: string }> {
  try {
    const { data: variant } = await supabase
      .from('product_variants')
      .select('product_id')
      .eq('id', variantId)
      .eq('tenant_id', tenantId)
      .single();

    if (!variant) {
      return { success: false, message: 'Variant not found' };
    }

    const { data: product } = await supabase
      .from('products')
      .select('title, nombre')
      .eq('id', variant.product_id)
      .single();

    const name = productName || product?.title || product?.nombre || 'Unknown Product';

    const { data: existingRef } = await supabase
      .from('product_global_refs')
      .select('id, global_catalog_id')
      .eq('tenant_id', tenantId)
      .eq('global_catalog_id', imageData.cloudinary_public_id)
      .single();

    if (existingRef) {
      return { 
        success: true, 
        globalCatalogId: existingRef.global_catalog_id,
        message: 'Already linked to global catalog' 
      };
    }

    const { data: newRef, error: insertError } = await supabase
      .from('global_catalog')
      .insert({
        tenant_id: tenantId,
        global_catalog_id: null,
        ref_type: 'contribution',
        contribution_status: 'pending',
        barcode_ean13: barcode,
        normalized_name: name,
        cloudinary_public_id: imageData.cloudinary_public_id,
        cloudinary_url: imageData.cloudinary_url,
        width: imageData.width,
        height: imageData.height,
        format: imageData.format,
        bytes: imageData.bytes,
        status: 'pending'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Contribute error:', insertError);
      return { success: false, message: insertError.message };
    }

    await supabase
      .from('product_variants')
      .update({ 
        global_catalog_id: newRef.id,
        use_global_image: true
      })
      .eq('id', variantId);

    return { 
      success: true, 
      globalCatalogId: newRef.id,
      message: 'Image submitted for review' 
    };
  } catch (error) {
    console.error('contributeImageToGlobal error:', error);
    return { success: false, message: 'Internal error' };
  }
}

export async function setProductGlobalImage(
  tenantId: string,
  variantId: string,
  globalCatalogId: string,
  useGlobal: boolean = true
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('product_variants')
      .update({
        global_catalog_id: globalCatalogId,
        use_global_image: useGlobal
      })
      .eq('id', variantId)
      .eq('tenant_id', tenantId);

    return !error;
  } catch (error) {
    console.error('setProductGlobalImage error:', error);
    return false;
  }
}