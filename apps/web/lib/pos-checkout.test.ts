import { describe, expect, it } from 'vitest';
import { DEFAULT_POS_LOCATION_ID, buildPosCheckoutPayload } from './pos-checkout';

describe('buildPosCheckoutPayload', () => {
  it('maps cart items to the transactional POS RPC contract', () => {
    const payload = buildPosCheckoutPayload({
      tenantId: 'tenant-1',
      customerId: 'customer-1',
      cart: [
        { id: 'variant-1', quantity: 2 },
        { id: 'variant-2', quantity: 1 },
      ],
      discountPercent: 10,
      paymentMethod: 'efectivo',
      cashReceived: '5000',
      isCreditSale: false,
    });

    expect(payload).toEqual({
      p_tenant_id: 'tenant-1',
      p_customer_id: 'customer-1',
      p_items: [
        { variant_id: 'variant-1', quantity: 2 },
        { variant_id: 'variant-2', quantity: 1 },
      ],
      p_discount_percent: 10,
      p_payment_method: 'efectivo',
      p_cash_received: 5000,
      p_is_credit_sale: false,
      p_location_id: DEFAULT_POS_LOCATION_ID,
    });
  });

  it('omits payment data for credit sales', () => {
    const payload = buildPosCheckoutPayload({
      tenantId: 'tenant-1',
      customerId: 'customer-2',
      cart: [{ id: 'variant-1', quantity: 1 }],
      discountPercent: 0,
      paymentMethod: 'tarjeta',
      cashReceived: '1000',
      isCreditSale: true,
    });

    expect(payload.p_payment_method).toBeNull();
    expect(payload.p_cash_received).toBeNull();
    expect(payload.p_is_credit_sale).toBe(true);
  });
});
