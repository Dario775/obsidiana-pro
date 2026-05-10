export interface TenantContext {
  tenantId: string;
  slug: string;
}

export async function resolveTenant(hostname: string): Promise<TenantContext | null> {
  const { supabase } = await import('../supabase');
  const { data, error } = await supabase
    .from('tenants')
    .select('id, slug')
    .eq('domain', hostname)
    .single();

  if (error || !data) return null;

  return {
    tenantId: data.id,
    slug: data.slug,
  };
}

export function getTenantIdFromRequest(req: Request): string | null {
  const url = new URL(req.url);
  const tenantId = url.searchParams.get('tenantId');
  if (tenantId) return tenantId;

  return req.headers.get('x-tenant-id');
}
