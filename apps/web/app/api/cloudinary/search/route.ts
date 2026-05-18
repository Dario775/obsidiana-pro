import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    if (!query || query.length < 3) {
      return NextResponse.json({ matches: [] });
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;
    const apiSecret = process.env.NEXT_PUBLIC_CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      console.error('Cloudinary credentials missing in env');
      return NextResponse.json({ matches: [] });
    }

    // Expresión de búsqueda segura y compatible con Cloudinary (evita errores 400 de sintaxis)
    const cleanQuery = query.trim().replace(/[^\w\s-]/g, '');
    const expression = `folder:obsidiana/* AND ${cleanQuery}`;

    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/resources/search`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`,
        },
        body: JSON.stringify({
          expression,
          max_results: 8,
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('Cloudinary Search API Error:', errText);
      return NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }

    const data = await response.json();
    const resources = data.resources || [];

    // Formatear resultados al estándar ImageMatchResult
    const matches = resources.map((item: any) => {
      const filename = item.filename || '';
      let cleanName = filename
        .replace(/[_-]/g, ' ')
        .replace(/\b\w/g, (c: string) => c.toUpperCase());

      // Si el nombre es un número (como un código de barras), dale formato de código de barras
      const isBarcode = /^\d{12,14}$/.test(filename);
      if (isBarcode) {
        cleanName = `Producto EAN (${filename})`;
      }

      return {
        id: item.public_id,
        cloudinary_url: item.secure_url,
        normalized_name: cleanName,
        quality_score: 95,
        match_type: isBarcode ? 'barcode' : 'name',
        confidence: 0.9,
        public_id: item.public_id,
        barcode_ean13: isBarcode ? filename : null,
        description: `Imagen autodetectada desde tu librería de Cloudinary.`,
        default_price: null,
      };
    });

    return NextResponse.json({ matches });
  } catch (error: any) {
    console.error('Cloudinary Search Router Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
