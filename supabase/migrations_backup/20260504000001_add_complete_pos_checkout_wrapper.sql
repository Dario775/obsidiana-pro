-- Wrapper RPC to accept a single jsonb payload and call the strongly-typed RPC
create or replace function public.complete_pos_checkout_rpc(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid := (p ->> 'p_tenant_id')::uuid;
  v_customer uuid := (p ->> 'p_customer_id')::uuid;
  v_items jsonb := p -> 'p_items';
  v_discount numeric := nullif(p ->> 'p_discount_percent', '')::numeric;
  v_payment_method text := nullif(p ->> 'p_payment_method', '')::text;
  v_cash numeric := nullif(p ->> 'p_cash_received', '')::numeric;
  v_is_credit boolean := (p ->> 'p_is_credit_sale')::boolean;
  v_location uuid := nullif(p ->> 'p_location_id', '')::uuid;
begin
  -- Delegate to the typed function
  return public.complete_pos_checkout(
    v_tenant,
    v_customer,
    v_items,
    coalesce(v_discount, 0),
    v_payment_method,
    v_cash,
    coalesce(v_is_credit, false),
    coalesce(v_location, '00000000-0000-0000-0000-000000000001'::uuid)
  );
end;
$$;

grant execute on function public.complete_pos_checkout_rpc(jsonb) to authenticated;
