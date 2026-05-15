async function testApi(itemId) {
  console.log('Testing Item API:', itemId);
  const response = await fetch(`https://api.mercadolibre.com/items/${itemId}`);
  const data = await response.json();
  
  console.log('Title:', data.title);
  console.log('Base Price:', data.price);
  console.log('Base Currency:', data.currency_id);
  
  // Check for discounts or special prices
  if (data.sale_price) console.log('Sale Price:', data.sale_price);
  if (data.prices) {
    console.log('Prices found in array:', data.prices.length);
    data.prices.forEach(p => console.log(`- Type: ${p.type}, Amount: ${p.amount}`));
  }
}

// Example ID from a typical search (needs to be a real one)
testApi('MLA1431633519'); 
