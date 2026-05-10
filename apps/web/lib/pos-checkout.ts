export const DEFAULT_POS_LOCATION_ID = '00000000-0000-0000-0000-000000000001';

export interface PosCheckoutCartItem {
  id: string;
  quantity: number;
}

export interface PosCheckoutPayload {
  p_tenant_id: string;
  p_customer_id: string;
  p_items: Array<{
    variant_id: string;
    quantity: number;
  }>;
  p_discount_percent: number;
  p_payment_method: string | null;
  p_cash_received: number | null;
  p_is_credit_sale: boolean;
  p_location_id: string;
}

export function buildPosCheckoutPayload(input: {
  tenantId: string;
  customerId: string;
  cart: PosCheckoutCartItem[];
  discountPercent: number;
  paymentMethod: string | null;
  cashReceived: string;
  isCreditSale: boolean;
  locationId?: string;
}): PosCheckoutPayload {
  return {
    p_tenant_id: input.tenantId,
    p_customer_id: input.customerId,
    p_items: input.cart.map((item) => ({
      variant_id: item.id,
      quantity: item.quantity,
    })),
    p_discount_percent: input.discountPercent,
    p_payment_method: input.isCreditSale ? null : input.paymentMethod,
    p_cash_received: input.isCreditSale ? null : Number.parseFloat(input.cashReceived || '0'),
    p_is_credit_sale: input.isCreditSale,
    p_location_id: input.locationId ?? DEFAULT_POS_LOCATION_ID,
  };
}
