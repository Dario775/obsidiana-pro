async function testScrape(url) {
  console.log('Testing Social URL:', url);
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    }
  });
  const html = await response.text();
  
  // Look for product titles and prices
  const titles = html.match(/class="[^"]*product-title[^"]*"[^>]*>([^<]+)/gi);
  const prices = html.match(/class="[^"]*price-tag-fraction[^"]*"[^>]*>([^<]+)/gi);
  
  console.log('Titles found:', titles ? titles.length : 0);
  console.log('Prices found:', prices ? prices.length : 0);
  
  // Try to find the JSON data often hidden in these pages
  const preloadedState = html.match(/window\.__PRELOADED_STATE__\s*=\s*({.*?});/);
  if (preloadedState) {
    console.log('PRELOADED_STATE found!');
    // We won't log the whole thing as it's too big, but this confirms we can parse it.
  }
}

testScrape('https://www.mercadolibre.com.ar/social/daridavid?matt_word=daridavid&matt_tool=27967988&forceInApp=true');
