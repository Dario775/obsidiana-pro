async function main() {
  try {
    const mp_client_secret = "DQZiz0BjBXEMKuhUJEMryPnNamGNwrEp";
    
    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mp_client_secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [
          {
            title: 'Suscripción Obsidiana de Prueba',
            quantity: 1,
            unit_price: 15000,
            currency_id: 'ARS',
          },
        ]
      }),
    });

    const data = await response.json();
    console.log('Status code:', response.status);
    console.log('Response body:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
