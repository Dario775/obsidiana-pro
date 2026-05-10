SELECT 
  il.id,
  il.variant_id,
  il.tenant_id,
  pv.id as variant_id_check,
  pv.product_id,
  p.id as product_id_check,
  p.title,
  p.available_online
FROM inventory_levels il
LEFT JOIN product_variants pv ON il.variant_id = pv.id
LEFT JOIN products p ON pv.product_id = p.id
WHERE il.tenant_id = '11111111-1111-1111-1111-111111111111';
