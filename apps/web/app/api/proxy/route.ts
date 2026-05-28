import { NextResponse } from 'next/server';

/**
 * GET /api/proxy?url=<URL>
 *
 * Proxy de solo lectura para renderizar páginas de MercadoLibre en un iframe
 * durante la importación de productos. Restringido a dominios de ML únicamente.
 */

// Dominios permitidos — solo dominios de MercadoLibre
const ALLOWED_DOMAINS = [
  'mercadolibre.com.ar',
  'mercadolibre.com',
  'articulo.mercadolibre.com.ar',
  'www.mercadolibre.com.ar',
  'www.mercadolibre.com',
];

function isDomainAllowed(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);
    // Verificar que el protocolo sea https
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    return ALLOWED_DOMAINS.some(
      (allowed) => host === allowed || host.endsWith(`.${allowed}`)
    );
  } catch {
    return false;
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return new Response('URL is required', { status: 400 });
  }

  // ── Whitelist de seguridad ──────────────────────────────────────────────────
  if (!isDomainAllowed(targetUrl)) {
    return new Response(
      'Domain not allowed. Only MercadoLibre URLs are permitted.',
      { status: 403 }
    );
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      // Timeout de 10 segundos para evitar que el servidor quede colgado
      signal: AbortSignal.timeout(10_000),
    });

    let html = await response.text();

    // Inyectar <base> para arreglar rutas relativas de assets
    const baseUrl = new URL(targetUrl).origin;
    html = html.replace('<head>', `<head><base href="${baseUrl}/">`);

    const headers = new Headers();
    headers.set('Content-Type', 'text/html; charset=utf-8');
    // Restringir CSP para que el iframe no pueda ejecutar scripts propios
    headers.set(
      'Content-Security-Policy',
      "default-src 'none'; img-src https:; style-src 'unsafe-inline' https:; font-src https:;"
    );

    return new Response(html, { headers });
  } catch (error: any) {
    if (error.name === 'TimeoutError') {
      return new Response('Request timed out', { status: 504 });
    }
    return new Response('Failed to proxy URL', { status: 500 });
  }
}
