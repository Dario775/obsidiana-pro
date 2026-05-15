import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return new Response('URL is required', { status: 400 });
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    let html = await response.text();

    // 1. Inject <base> tag to fix relative assets (CSS, Images)
    const baseUrl = new URL(targetUrl).origin;
    html = html.replace('<head>', `<head><base href="${baseUrl}/">`);

    // 2. Remove security headers that prevent iframing
    const headers = new Headers();
    headers.set('Content-Type', 'text/html; charset=utf-8');
    // We explicitly DON'T set X-Frame-Options or CSP to allow iframing

    return new Response(html, { headers });
  } catch (error) {
    return new Response('Failed to proxy URL', { status: 500 });
  }
}
