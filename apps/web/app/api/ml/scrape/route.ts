import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'es-AR,es;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }

    const html = await response.text();

    // Basic extraction using regex (faster than JSDOM for simple meta tags)
    const getMeta = (property: string) => {
      const regex = new RegExp(`<meta[^>]+(?:property|name)="${property}"[^>]+content="([^"]+)"`, 'i');
      const match = html.match(regex);
      return match ? match[1] : null;
    };

    const title = getMeta('og:title') || getMeta('twitter:title') || '';
    const description = getMeta('og:description') || getMeta('twitter:description') || '';
    const mainImage = getMeta('og:image') || getMeta('twitter:image:src') || '';
    
    let priceAmount: string | null = null;

    // Priority 1: JSON-LD (Schema.org) - This is the most reliable for real price
    try {
      const ldJsonRegex = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi;
      let ldMatch;
      while ((ldMatch = ldJsonRegex.exec(html)) !== null) {
        try {
          const data = JSON.parse(ldMatch[1] || '');
          // Handle both single object and array of objects
          const items = Array.isArray(data) ? data : [data];
          for (const item of items) {
            if (item['@type'] === 'Product' && item.offers && item.offers.price) {
              priceAmount = item.offers.price.toString();
              break;
            }
          }
          if (priceAmount) break;
        } catch (e) {}
      }
    } catch (e) {}

    // Priority 2: Standard Meta Tags
    if (!priceAmount) {
      priceAmount = getMeta('product:price:amount') || getMeta('og:price:amount') || getMeta('twitter:data1') || null;
    }
    
    // Fallback for price: search for itemprop="price"
    if (!priceAmount) {
      const priceRegex = /itemprop="price"\s+content="([^"]+)"/i;
      const priceMatch = html.match(priceRegex);
      priceAmount = (priceMatch && priceMatch[1]) ? priceMatch[1] : null;
    }

    // Second fallback: search for twitter:data1 which often has price in ML
    if (!priceAmount) {
      const twitterData = getMeta('twitter:data1'); // Usually "$ 123.456"
      if (twitterData) {
        priceAmount = twitterData.replace(/[.$ ]/g, '').replace(',', '.').trim();
      }
    }

    // Extreme fallback: search for standard ML fraction class
    if (!priceAmount || priceAmount === "0") {
      const mainPriceSection = html.match(/class="ui-pdp-container__row--price"[^>]*>(.*?)<\/div>/is) || 
                               html.match(/class="ui-pdp-price"[^>]*>(.*?)<\/div>/is) ||
                               html.match(/class="ui-pdp-price__main"[^>]*>(.*?)<\/div>/is);
      
      const searchArea = (mainPriceSection && mainPriceSection[1]) ? mainPriceSection[1] : html;

      // 2. Look for the fraction with the specific attribute the user mentioned
      const specificMatch = searchArea.match(/data-andes-money-amount-fraction="true"[^>]*>([^<]+)<\/span>/i);
      
      if (specificMatch) {
        priceAmount = (specificMatch[1] || '').replace(/[.$ ]/g, '').replace(',', '.').trim();
      } else {
        const amounts: string[] = [];
        const fractionRegex = /class="andes-money-amount__fraction"[^>]*>([^<]+)<\/span>/gi;
        let m;
        while ((m = fractionRegex.exec(searchArea)) !== null) {
          amounts.push((m[1] || '').replace(/[.$ ]/g, '').replace(',', '.').trim());
        }
        
        if (amounts.length > 0) {
          // NEW: Take the lowest numerical value in the section.
          // This always picks the offer over the regular price.
          const numericAmounts = amounts.map(a => parseFloat(a)).filter(a => !isNaN(a) && a > 0);
          if (numericAmounts.length > 0) {
            priceAmount = Math.min(...numericAmounts).toString();
          }
        }
      }
    }

    const priceCurrency = getMeta('product:price:currency') || 'ARS';

    // NEW: Discount Percentage detection
    // If we have a price but the page says there is a discount, we calculate it
    const discountRegex = /class="[^"]*andes-money-amount__discount[^"]*"[^>]*>(\d+)%\s*OFF/i;
    const discountMatch = html.match(discountRegex);
    
    if (discountMatch && priceAmount) {
      const discountPercent = parseInt(discountMatch[1] || '0');
      const currentPrice = parseFloat(priceAmount);
      
      // If we found a discount and the current price seems to be the original one
      // (Usually the original is much larger than what the discounted one would be)
      // Or we just calculate it to be safe if the price hasn't been "minimized" yet
      if (discountPercent > 0) {
        // We calculate what the discounted price SHOULD be
        const calculatedDiscountedPrice = Math.floor(currentPrice * (1 - discountPercent / 100));
        
        // If our current price is much higher than the calculated one, it means we have the base price
        if (currentPrice > calculatedDiscountedPrice * 1.1) {
          priceAmount = calculatedDiscountedPrice.toString();
        }
      }
    }

    // Improved Image Gallery extraction
    // Look for high-res images in the gallery
    const images: string[] = [];
    if (mainImage) images.push(mainImage);
    
    // Heuristic: ML images often follow a pattern like -O.webp or -F.webp
    // We can try to find more URLs that look like ML images
    const mlImageRegex = /https:\/\/http2\.mlstatic\.com\/D_NQ_NP_[^"]+-(?:O|F)\.(?:webp|jpg)/gi;
    const allMatches = html.match(mlImageRegex) || [];
    const uniqueImages = [...new Set(allMatches)].slice(0, 5); // Take first 5 unique images
    
    const finalImages = uniqueImages.length > 0 ? uniqueImages : images;

    return NextResponse.json({
      title: title.split(' | ')[0],
      description: description.length > 200 ? description.substring(0, 197) + '...' : description,
      price: priceAmount ? parseFloat(priceAmount) : 0,
      currency: priceCurrency,
      images: finalImages,
      url
    });

  } catch (error: any) {
    console.error('Scrape error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
