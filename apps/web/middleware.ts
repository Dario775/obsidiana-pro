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

  // Redirect authenticated users away from auth pages to dashboard
  const authPages = ['/login', '/register', '/forgot-password'];

  // Early tenant suspension check
  if (user) {
    const isProtectedRoute = 
      request.nextUrl.pathname.startsWith('/dashboard') ||
      request.nextUrl.pathname.startsWith('/overview') ||
      request.nextUrl.pathname.startsWith('/inventory') ||
      request.nextUrl.pathname.startsWith('/pos') ||
      request.nextUrl.pathname.startsWith('/suppliers') ||
      request.nextUrl.pathname.startsWith('/settings') ||
      request.nextUrl.pathname.startsWith('/customers') ||
      request.nextUrl.pathname.startsWith('/online-catalog') ||
      request.nextUrl.pathname.startsWith('/sales') ||
      request.nextUrl.pathname.startsWith('/branches') ||
      request.nextUrl.pathname.startsWith('/orders');

    const isAuthPage = authPages.includes(request.nextUrl.pathname);

    if (isProtectedRoute || isAuthPage) {
      let tenantId = user.user_metadata?.tenant_id;
      
      if (!tenantId) {
        const { data: member } = await supabase
          .from('tenant_members')
          .select('tenant_id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();
        if (member) {
          tenantId = member.tenant_id;
        }
      }

      if (tenantId) {
        const { data: tenant } = await supabase
          .from('tenants')
          .select('status, is_platform_admin')
          .eq('id', tenantId)
          .maybeSingle();

        if (tenant && tenant.status !== 'active' && tenant.is_platform_admin !== true) {
          console.warn(`[MIDDLEWARE] Intento de acceso a ruta protegida desde tenant suspendido. TenantID: ${tenantId}, Path: ${request.nextUrl.pathname}, Email: ${user.email}`);
          // Invalidate session from the middleware
          await supabase.auth.signOut();
          const loginUrl = new URL('/login', request.url);
          loginUrl.searchParams.set('error', 'Tu cuenta está suspendida. Contactá al soporte.');
          return NextResponse.redirect(loginUrl);
        }
      }
    }
  }

  // 3. Logic to handle protected vs public routes
  const isPublicPath =
    request.nextUrl.pathname === '/' ||
    request.nextUrl.pathname === '/login' ||
    request.nextUrl.pathname === '/register' ||
    request.nextUrl.pathname === '/forgot-password' ||
    request.nextUrl.pathname === '/reset-password' ||
    request.nextUrl.pathname === '/politica-afiliados' ||
    request.nextUrl.pathname === '/privacidad' ||
    request.nextUrl.pathname.startsWith('/auth/') ||
    request.nextUrl.pathname.startsWith('/tienda/');

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
