async function testScrape(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    }
  });
  const html = await response.text();
  console.log(html.substring(0, 1000));
}

testScrape('https://www.mercadolibre.com.ar/social/daridavid?matt_word=daridavid&matt_tool=27967988&forceInApp=true');
