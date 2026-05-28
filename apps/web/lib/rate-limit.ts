/**
 * lib/rate-limit.ts
 *
 * Rate limiter en memoria con ventana deslizante.
 *
 * LIMITACIÓN: En entornos serverless (Vercel) con múltiples instancias,
 * este límite aplica por instancia. Para límites globales usar Upstash Redis.
 *
 * Uso:
 *   const { allowed, retryAfter } = checkRateLimit(`register:${ip}`, 5, 3600_000);
 *   if (!allowed) return NextResponse.json({ error: '...' }, { status: 429 });
 */

const store = new Map<string, number[]>();

interface RateLimitResult {
  allowed: boolean;
  /** Segundos hasta que se pueda reintentar (0 si allowed) */
  retryAfter: number;
  /** Cuántos intentos quedan antes del límite */
  remaining: number;
}

/**
 * @param key       Clave única (ej: `register:${ip}`, `checkout:${tenantId}`)
 * @param max       Máximo de requests permitidos en la ventana
 * @param windowMs  Tamaño de la ventana en milisegundos
 */
export function checkRateLimit(
  key: string,
  max: number = 30,
  windowMs: number = 60_000
): RateLimitResult {
  const now = Date.now();
  const windowStart = now - windowMs;

  // Filtrar timestamps expirados
  const attempts = (store.get(key) || []).filter((t) => t > windowStart);

  if (attempts.length >= max) {
    const oldestAttempt = attempts[0] ?? now;
    const retryAfter = Math.ceil((oldestAttempt + windowMs - now) / 1000);
    store.set(key, attempts);
    return { allowed: false, retryAfter: Math.max(1, retryAfter), remaining: 0 };
  }

  attempts.push(now);
  store.set(key, attempts);

  return { allowed: true, retryAfter: 0, remaining: max - attempts.length };
}

/**
 * Extrae la IP del cliente desde los headers de la request.
 * Funciona detrás de proxies/Vercel Edge.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() ?? 'unknown';
  return request.headers.get('x-real-ip') ?? 'unknown';
}
