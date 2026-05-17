import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const hostname = request.headers.get('host') || '';
  
  // 1. Lógica de Subdominios (Multi-tenancy)
  const rootDomains = ['obsidiana.com.ar', 'localhost:3000', 'obsidiana-pro.vercel.app'];
  const currentHost = hostname
    .replace(':3000', '')
    .replace('.obsidiana.com.ar', '')
    .replace('.obsidiana-pro.vercel.app', '');

  const isRootDomain = rootDomains.some(domain => hostname === domain) || currentHost === 'www' || currentHost === '';

  // Si es un subdominio de tienda (ej: tienda1.obsidiana.com.ar)
  if (!isRootDomain) {
    // Evitar bucles y proteger rutas internas
    if (url.pathname.startsWith('/tienda') || url.pathname.startsWith('/_next') || url.pathname.startsWith('/api') || url.pathname.includes('.')) {
      return NextResponse.next();
    }
    // Reescribir subdominio a la ruta de la tienda
    return NextResponse.rewrite(new URL(`/tienda/${currentHost}${url.pathname}`, request.url));
  }

  // 2. Lógica de Autenticación (Solo para el dominio principal)
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // 3. Logic to handle protected vs public routes
  const isPublicPath =
    request.nextUrl.pathname === '/' ||
    request.nextUrl.pathname === '/login' ||
    request.nextUrl.pathname === '/register' ||
    request.nextUrl.pathname.startsWith('/auth/') ||
    request.nextUrl.pathname.startsWith('/tienda/');

  // Redirect authenticated users away from login/register to dashboard
  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/register')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (!user && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all paths except for:
     * 1. /api (all API routes)
     * 2. /_next (Next.js internals)
     * 3. static files (images, etc)
     */
    '/((?!api|_next|_static|_vercel|[\\w-]+\\.\\w+).*)',
  ],
};
