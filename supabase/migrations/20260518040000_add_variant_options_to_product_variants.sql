-- Migration: Add variant_options jsonb column to product_variants
-- Date: 2026-05-18

ALTER TABLE "public"."product_variants" ADD COLUMN IF NOT EXISTS "variant_options" jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Create GIN index for rapid key-value variants searches in catalog listings
CREATE INDEX IF NOT EXISTS "idx_product_variants_options_gin" ON "public"."product_variants" USING gin ("variant_options");
