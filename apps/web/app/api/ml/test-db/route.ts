import { NextResponse } from 'next/server';

/**
 * Este endpoint de debug fue eliminado por seguridad.
 * Exponía datos de tenants y productos sin autenticación.
 */
export async function GET() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
