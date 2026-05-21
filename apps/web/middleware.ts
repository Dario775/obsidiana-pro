import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const hostname = request.headers.get('host') || '';
  
  // 1. Lógica de Subdominios (Multi-tenancy)
  const isLocalhost = hostname.includes('localhost');
  const isVercel = hostname.includes('vercel.app');
  const isCustomDomain = hostname.includes('obsidiana.com.ar');
  
  // Extract subdomain if present
  let currentHost = hostname;
  if (isLocalhost) {
    currentHost = hostname.replace(':3000', '');
  } else if (isVercel) {
    currentHost = hostname.replace('.vercel.app', '').split('.')[0] || hostname;
  } else if (isCustomDomain) {
    currentHost = hostname.replace('.obsidiana.com.ar', '');
  }
  
  // Root domain detection
  let isRootDomain = false;
  if (isLocalhost) {
    isRootDomain = true; // localhost is always root
  } else if (isVercel) {
    isRootDomain = true; // Vercel preview URLs are always root
  } else if (isCustomDomain) {
    isRootDomain = currentHost === '' || currentHost === 'www'; // Only www or bare domain
  } else {
    isRootDomain = currentHost === 'www' || currentHost === '' || currentHost === hostname;
  }

  // Si es un subdominio de tienda (ej: kiosko24hs.obsidiana.com.ar)
  if (!isRootDomain) {
    // Evitar bucles y proteger rutas internas
    if (url.pathname.startsWith('/_next') || url.pathname.startsWith('/api') || url.pathname.includes('.')) {
      return NextResponse.next();
    }
    // Reescribir subdominio a la ruta de la tienda
    return NextResponse.rewrite(new URL(`/tienda/${currentHost}${url.pathname}`, request.url));
  }

  // 2. Lógica de Autenticación (Solo para el dominio principal)
  const response = NextResponse.next({
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
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
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
    request.nextUrl.pathname === '/forgot-password' ||
    request.nextUrl.pathname === '/reset-password' ||
    request.nextUrl.pathname.startsWith('/auth/') ||
    request.nextUrl.pathname.startsWith('/tienda/');

  // Redirect authenticated users away from auth pages to dashboard
  const authPages = ['/login', '/register', '/forgot-password', '/reset-password'];
  if (user && authPages.includes(request.nextUrl.pathname)) {
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
