const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const customerId = '4b44ee92-4373-4f23-b6a5-26b7af2431ae';
  
  // Fetch orders
  const { data: ordersData } = await supabase
    .from('orders')
    .select('id, number, total_ars, subtotal_ars, tax_ars, status, financial_status, channel, placed_at')
    .eq('customer_id', customerId)
    .order('placed_at', { ascending: false });

  // Fetch payments
  const orderIds = ordersData.map(o => o.id);
  const { data: paymentsData } = await supabase
    .from('payments')
    .select('id, order_id, amount, status, method, created_at')
    .in('order_id', orderIds)
    .order('created_at', { ascending: false });

  const orders = ordersData;
  const payments = (paymentsData || []).map(p => ({
    ...p,
    amount_ars: p.amount,
    processed_at: p.created_at
  }));

  const transactions = [];

  // Agregar órdenes como cargos
  orders.forEach(order => {
    transactions.push({
      id: `order-${order.id}`,
      date: order.placed_at,
      concept: `Orden #${order.number}`,
      type: 'charge',
      amount: order.total_ars || 0,
      status: order.financial_status,
    });
  });

  // Agregar pagos como abonos (solo los completados/pagados)
  payments.forEach(payment => {
    if (payment.status !== 'paid') return;
    const order = orders.find(o => o.id === payment.order_id);
    transactions.push({
      id: `payment-${payment.id}`,
      date: payment.processed_at || payment.created_at || new Date().toISOString(),
      concept: `Pago - Orden #${order?.number || 'N/A'}`,
      type: 'payment',
      amount: payment.amount_ars || 0,
      method: payment.method,
      status: payment.status,
    });
  });

  // Ordenar
  transactions.sort((a, b) => {
    const timeA = new Date(a.date).getTime();
    const timeB = new Date(b.date).getTime();
    if (timeA !== timeB) {
      return timeA - timeB;
    }
    if (a.type === 'charge' && b.type !== 'charge') return -1;
    if (a.type !== 'charge' && b.type === 'charge') return 1;
    return 0;
  });

  console.log('Simulated Transactions:');
  console.table(transactions);
}

run().catch(console.error);
