async function testScrape() {
  const url = 'https://www.mercadolibre.com.ar/heladera-inverter-midea-combi-no-frost-300-l-inox/p/MLA52110436';
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });
  const html = await response.text();
  
  const getMeta = (property) => {
    const regex = new RegExp(`<meta[^>]+(?:property|name)="${property}"[^>]+content="([^"]+)"`, 'i');
    const match = html.match(regex);
    return match ? match[1] : null;
  };

  console.log('og:title:', getMeta('og:title'));
  console.log('product:price:amount:', getMeta('product:price:amount'));
  console.log('og:price:amount:', getMeta('og:price:amount'));
  console.log('twitter:data1:', getMeta('twitter:data1'));
  
  const priceRegex = /itemprop="price"\s+content="([^"]+)"/i;
  const priceMatch = html.match(priceRegex);
  console.log('itemprop price:', priceMatch ? priceMatch[1] : 'not found');
}

testScrape();
