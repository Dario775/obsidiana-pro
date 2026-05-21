export function getStoreUrl(slug: string, customDomain?: string | null): string {
  if (typeof window === 'undefined') return `/tienda/${slug}`;
  
  const hostname = window.location.hostname;
  const isLocalhost = hostname.includes('localhost');
  const isVercelPreview = hostname.includes('vercel.app');
  
  if (isLocalhost || isVercelPreview) {
    return `/tienda/${slug}`;
  }
  
  if (customDomain) {
    return `https://${customDomain}`;
  }
  
  const rootDomain = hostname.replace('www.', '');
  return `https://${slug}.${rootDomain}`;
}
