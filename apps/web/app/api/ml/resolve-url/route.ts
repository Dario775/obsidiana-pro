import { NextResponse } from 'next/server';

// ── Whitelist de dominios permitidos ─────────────────────────────────────────
const ALLOWED_RESOLVE_DOMAINS = [
  'mercadolibre.com.ar',
  'mercadolibre.com',
  'meli.com.ar',
  'www.mercadolibre.com.ar',
  'www.mercadolibre.com',
];

function isResolveAllowed(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    return ALLOWED_RESOLVE_DOMAINS.some(
      (d) => host === d || host.endsWith(`.${d}`)
    );
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 });

    // ── Validación de dominio ─────────────────────────────────────────────────
    if (!isResolveAllowed(url)) {
      return NextResponse.json(
        { error: 'Domain not allowed. Only MercadoLibre URLs are permitted.' },
        { status: 403 }
      );
    }

    // Use redirect: 'manual' to catch the redirect without following it
    const response = await fetch(url, {
      redirect: 'manual',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      signal: AbortSignal.timeout(8_000),
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (location) {
        // Solo retornar la URL resuelta si también es de ML
        return NextResponse.json({ url: location });
      }
    }

    // If no redirect, just return original
    return NextResponse.json({ url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
