async function testScrape(url) {
  console.log('Testing URL:', url);
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
    redirect: 'follow'
  });
  const html = await response.text();
  
  const mainPriceSection = html.match(/class="ui-pdp-container__row--price"[^>]*>(.*?)<\/div>/is) || 
                           html.match(/class="ui-pdp-price"[^>]*>(.*?)<\/div>/is);
  
  if (!mainPriceSection) {
    console.log('Main price section NOT found');
    return;
  }
  
  const searchArea = mainPriceSection[1];
  const amounts = [];
  const fractionRegex = /class="andes-money-amount__fraction"[^>]*>([^<]+)<\/span>/gi;
  let m;
  while ((m = fractionRegex.exec(searchArea)) !== null) {
    amounts.push(m[1].replace(/[.$ ]/g, '').replace(',', '.').trim());
  }
  
  console.log('Found amounts in main section:', amounts);
  if (amounts.length > 0) {
    console.log('Final price chosen (last one):', amounts[amounts.length - 1]);
  }
}

testScrape('https://meli.la/1rdXNfe');
