/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // Aplica a todas las rutas
        source: '/(.*)',
        headers: [
          // Previene clickjacking — nadie puede iframear la app
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // Previene MIME sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Controla información del referer en requests cross-origin
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Deshabilita features del navegador que no se usan
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()',
          },
          // Fuerza HTTPS en producción por 1 año
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          // Content Security Policy
          // Permite lo necesario para Next.js + Supabase + Cloudinary + MP
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Next.js requiere unsafe-eval y unsafe-inline en dev; en prod se puede endurecer
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://sdk.mercadopago.com https://www.googletagmanager.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https: http2.mlstatic.com",
              // Conexiones permitidas
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.cloudinary.com https://api.mercadopago.com https://api.mercadolibre.com https://www.mercadolibre.com.ar",
              // Iframes: solo MercadoPago (para el checkout) y nuestra proxy para ML
              "frame-src 'self' https://www.mercadopago.com https://www.mercadopago.com.ar",
              // Formularios solo al mismo origen
              "form-action 'self'",
              // base href solo al mismo origen
              "base-uri 'self'",
              // No se permiten plugins (Flash, etc.)
              "object-src 'none'",
            ].join('; '),
          },
        ],
      },
      // Rutas API: agregar CORS básico
      {
        source: '/api/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
        ],
      },
    ];
  },

  // Optimización de imágenes — dominios permitidos para next/image
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'http2.mlstatic.com' },
      { protocol: 'https', hostname: '**.mercadolibre.com' },
      { protocol: 'https', hostname: '**.mercadolibre.com.ar' },
    ],
  },
};

export default nextConfig;
