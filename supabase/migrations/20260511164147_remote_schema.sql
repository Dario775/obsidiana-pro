


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."increment_ml_clicks"("p_item_id" "text", "p_tenant_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE ml_products
  SET clicks = COALESCE(clicks, 0) + 1,
      updated_at = NOW()
  WHERE ml_item_id = p_item_id AND tenant_id = p_tenant_id;
END;
$$;


ALTER FUNCTION "public"."increment_ml_clicks"("p_item_id" "text", "p_tenant_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."customers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "nombre" "text" NOT NULL,
    "email" "text",
    "phone" "text",
    "document_type" "text",
    "document_number" "text",
    "address" "text",
    "city" "text",
    "province" "text",
    "zip_code" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."customers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."global_catalog" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ml_item_id" "text",
    "title" "text",
    "category_id" "text",
    "category_name" "text",
    "price" numeric,
    "thumbnail" "text",
    "pictures" "jsonb",
    "attributes" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."global_catalog" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."inventory_levels" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "branch_id" "uuid",
    "variant_id" "uuid" NOT NULL,
    "on_hand" integer DEFAULT 0,
    "committed" integer DEFAULT 0,
    "reorder_point" integer DEFAULT 0,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "available" integer GENERATED ALWAYS AS (("on_hand" - "committed")) STORED
);


ALTER TABLE "public"."inventory_levels" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ml_clicks_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "ml_item_id" "text" NOT NULL,
    "clicked_at" timestamp with time zone DEFAULT "now"(),
    "source_url" "text",
    "user_agent" "text"
);


ALTER TABLE "public"."ml_clicks_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ml_products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "ml_item_id" "text" NOT NULL,
    "title" "text",
    "price" numeric,
    "currency" "text",
    "thumbnail" "text",
    "pictures" "jsonb",
    "condition" "text",
    "listing_type_id" "text",
    "category_id" "text",
    "attributes" "jsonb",
    "description" "text",
    "permalink" "text",
    "affiliate_url" "text",
    "clicks" integer DEFAULT 0,
    "imported_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ml_products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "product_id" "uuid",
    "variant_id" "uuid",
    "quantity" integer DEFAULT 1,
    "unit_price_ars" numeric DEFAULT 0,
    "total_ars" numeric DEFAULT 0
);


ALTER TABLE "public"."order_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "customer_id" "uuid",
    "status" "text" DEFAULT 'pending'::"text",
    "subtotal_ars" numeric DEFAULT 0,
    "shipping_ars" numeric DEFAULT 0,
    "total_ars" numeric DEFAULT 0,
    "payment_method" "text",
    "shipping_method" "text",
    "notes" "text",
    "shipping_address" "text",
    "shipped_at" timestamp with time zone,
    "delivered_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "number" integer NOT NULL,
    "tax_ars" numeric DEFAULT 0,
    "financial_status" "text" DEFAULT 'pending'::"text",
    "channel" "text" DEFAULT 'pos'::"text",
    "placed_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."orders_number_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."orders_number_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."orders_number_seq" OWNED BY "public"."orders"."number";



CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "order_id" "uuid",
    "method" "text" NOT NULL,
    "amount" numeric NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "transaction_id" "text",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."plans" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "monthly_price" numeric DEFAULT 0,
    "yearly_price" numeric DEFAULT 0,
    "features" "jsonb" DEFAULT '[]'::"jsonb",
    "max_products" integer,
    "max_branches" integer,
    "online_store" boolean DEFAULT false,
    "pos" boolean DEFAULT false
);


ALTER TABLE "public"."plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."platform_config" (
    "key" "text" NOT NULL,
    "value" "jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."platform_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."platform_settings" (
    "key" "text" NOT NULL,
    "value" "jsonb" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."platform_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_attribute_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "variant_id" "uuid" NOT NULL,
    "attribute_id" "uuid" NOT NULL,
    "option_id" "uuid" NOT NULL
);


ALTER TABLE "public"."product_attribute_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_attribute_options" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "attribute_id" "uuid" NOT NULL,
    "value" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "sort_order" integer DEFAULT 0
);


ALTER TABLE "public"."product_attribute_options" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_attributes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."product_attributes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_global_refs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "global_product_id" "uuid",
    "tenant_id" "uuid",
    "product_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."product_global_refs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_variants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "sku" "text",
    "price_ars" numeric DEFAULT 0,
    "price_usd" numeric DEFAULT 0,
    "cost_ars" numeric DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."product_variants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "nombre" "text" NOT NULL,
    "description" "text",
    "sku" "text",
    "status" "text" DEFAULT 'active'::"text",
    "category_id" "uuid",
    "images" "jsonb" DEFAULT '[]'::"jsonb",
    "available_online" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stock_movements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "variant_id" "uuid" NOT NULL,
    "branch_id" "uuid",
    "quantity" integer NOT NULL,
    "type" "text" NOT NULL,
    "reference_id" "uuid",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."stock_movements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stock_reservations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "variant_id" "uuid" NOT NULL,
    "quantity" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."stock_reservations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscription_payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "amount" numeric NOT NULL,
    "currency" "text" DEFAULT 'ARS'::"text",
    "status" "text" DEFAULT 'pending'::"text",
    "payment_method" "text",
    "transaction_id" "text",
    "paid_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."subscription_payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."suppliers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "nombre" "text" NOT NULL,
    "email" "text",
    "phone" "text",
    "address" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."suppliers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenant_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'member'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tenant_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "nombre" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text",
    "status_reason" "text",
    "address" "text",
    "phone" "text",
    "email" "text",
    "logo_url" "text",
    "banner_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "store_name" "text",
    "store_description" "text",
    "store_domain" "text",
    "store_active" boolean DEFAULT false,
    "store_theme" "text" DEFAULT 'violet'::"text",
    "store_template" "text" DEFAULT 'classic'::"text",
    "store_banners" "jsonb" DEFAULT '[]'::"jsonb",
    "store_tagline" "text",
    "store_currency" "text" DEFAULT 'ARS'::"text",
    "store_min_order_amount" numeric DEFAULT 0,
    "store_shipping_enabled" boolean DEFAULT true,
    "store_shipping_cost" numeric DEFAULT 0,
    "store_shipping_free_threshold" numeric DEFAULT 0,
    "store_social_instagram" "text",
    "store_social_facebook" "text",
    "store_social_whatsapp" "text",
    "ml_affiliate_id" "text",
    "ml_access_token" "text",
    "ml_refresh_token" "text",
    "ml_token_expires_at" timestamp with time zone,
    "ml_user_id" "text",
    "plan_id" "text",
    "subscription_status" "text",
    "subscription_expires_at" timestamp with time zone,
    "online_store_enabled" boolean DEFAULT false,
    "is_demo" boolean DEFAULT false,
    "is_platform_admin" boolean DEFAULT false,
    "ml_affiliate_word" "text"
);


ALTER TABLE "public"."tenants" OWNER TO "postgres";


ALTER TABLE ONLY "public"."orders" ALTER COLUMN "number" SET DEFAULT "nextval"('"public"."orders_number_seq"'::"regclass");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."global_catalog"
    ADD CONSTRAINT "global_catalog_ml_item_id_key" UNIQUE ("ml_item_id");



ALTER TABLE ONLY "public"."global_catalog"
    ADD CONSTRAINT "global_catalog_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_levels"
    ADD CONSTRAINT "inventory_levels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ml_clicks_log"
    ADD CONSTRAINT "ml_clicks_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ml_products"
    ADD CONSTRAINT "ml_products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ml_products"
    ADD CONSTRAINT "ml_products_tenant_id_ml_item_id_key" UNIQUE ("tenant_id", "ml_item_id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."plans"
    ADD CONSTRAINT "plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."platform_config"
    ADD CONSTRAINT "platform_config_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."platform_settings"
    ADD CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."product_attribute_assignments"
    ADD CONSTRAINT "product_attribute_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_attribute_options"
    ADD CONSTRAINT "product_attribute_options_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_attributes"
    ADD CONSTRAINT "product_attributes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_global_refs"
    ADD CONSTRAINT "product_global_refs_global_product_id_tenant_id_key" UNIQUE ("global_product_id", "tenant_id");



ALTER TABLE ONLY "public"."product_global_refs"
    ADD CONSTRAINT "product_global_refs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_variants"
    ADD CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stock_reservations"
    ADD CONSTRAINT "stock_reservations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_payments"
    ADD CONSTRAINT "subscription_payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenant_members"
    ADD CONSTRAINT "tenant_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_slug_key" UNIQUE ("slug");



CREATE INDEX "idx_customers_tenant" ON "public"."customers" USING "btree" ("tenant_id");



CREATE INDEX "idx_inventory_tenant" ON "public"."inventory_levels" USING "btree" ("tenant_id");



CREATE INDEX "idx_inventory_variant" ON "public"."inventory_levels" USING "btree" ("variant_id");



CREATE INDEX "idx_ml_clicks_date" ON "public"."ml_clicks_log" USING "btree" ("clicked_at" DESC);



CREATE INDEX "idx_ml_clicks_item" ON "public"."ml_clicks_log" USING "btree" ("ml_item_id");



CREATE INDEX "idx_ml_clicks_tenant" ON "public"."ml_clicks_log" USING "btree" ("tenant_id");



CREATE INDEX "idx_ml_products_item" ON "public"."ml_products" USING "btree" ("ml_item_id");



CREATE INDEX "idx_ml_products_tenant" ON "public"."ml_products" USING "btree" ("tenant_id");



CREATE INDEX "idx_order_items_order" ON "public"."order_items" USING "btree" ("order_id");



CREATE INDEX "idx_orders_status" ON "public"."orders" USING "btree" ("status");



CREATE INDEX "idx_orders_tenant" ON "public"."orders" USING "btree" ("tenant_id");



CREATE INDEX "idx_products_status" ON "public"."products" USING "btree" ("status");



CREATE INDEX "idx_products_tenant" ON "public"."products" USING "btree" ("tenant_id");



CREATE INDEX "idx_variants_product" ON "public"."product_variants" USING "btree" ("product_id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_levels"
    ADD CONSTRAINT "inventory_levels_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_levels"
    ADD CONSTRAINT "inventory_levels_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ml_clicks_log"
    ADD CONSTRAINT "ml_clicks_log_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ml_products"
    ADD CONSTRAINT "ml_products_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_attribute_assignments"
    ADD CONSTRAINT "product_attribute_assignments_attribute_id_fkey" FOREIGN KEY ("attribute_id") REFERENCES "public"."product_attributes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_attribute_assignments"
    ADD CONSTRAINT "product_attribute_assignments_option_id_fkey" FOREIGN KEY ("option_id") REFERENCES "public"."product_attribute_options"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_attribute_assignments"
    ADD CONSTRAINT "product_attribute_assignments_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_attribute_assignments"
    ADD CONSTRAINT "product_attribute_assignments_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_attribute_options"
    ADD CONSTRAINT "product_attribute_options_attribute_id_fkey" FOREIGN KEY ("attribute_id") REFERENCES "public"."product_attributes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_attributes"
    ADD CONSTRAINT "product_attributes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_global_refs"
    ADD CONSTRAINT "product_global_refs_global_product_id_fkey" FOREIGN KEY ("global_product_id") REFERENCES "public"."global_catalog"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_global_refs"
    ADD CONSTRAINT "product_global_refs_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_global_refs"
    ADD CONSTRAINT "product_global_refs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_variants"
    ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_movements"
    ADD CONSTRAINT "stock_movements_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_reservations"
    ADD CONSTRAINT "stock_reservations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_reservations"
    ADD CONSTRAINT "stock_reservations_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscription_payments"
    ADD CONSTRAINT "subscription_payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenant_members"
    ADD CONSTRAINT "tenant_members_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inventory_levels" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ml_clicks_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ml_products" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."platform_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "platform_settings_all" ON "public"."platform_settings" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "platform_settings_read" ON "public"."platform_settings" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."product_variants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "service_role_full" ON "public"."customers" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_full" ON "public"."inventory_levels" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_full" ON "public"."ml_clicks_log" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_full" ON "public"."ml_products" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_full" ON "public"."order_items" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_full" ON "public"."orders" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_full" ON "public"."product_variants" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_full" ON "public"."products" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_full" ON "public"."tenants" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."tenants" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tenants_all_service" ON "public"."tenants" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "tenants_insert_anon" ON "public"."tenants" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "tenants_insert_for_signup" ON "public"."tenants" FOR INSERT TO "authenticated", "anon" WITH CHECK (("auth"."role"() = ANY (ARRAY['anon'::"text", 'authenticated'::"text", 'service_role'::"text"])));



CREATE POLICY "tenants_read_for_signup" ON "public"."tenants" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "tenants_select_anon" ON "public"."tenants" FOR SELECT TO "anon" USING (true);





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."increment_ml_clicks"("p_item_id" "text", "p_tenant_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_ml_clicks"("p_item_id" "text", "p_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_ml_clicks"("p_item_id" "text", "p_tenant_id" "uuid") TO "service_role";


















GRANT ALL ON TABLE "public"."customers" TO "anon";
GRANT ALL ON TABLE "public"."customers" TO "authenticated";
GRANT ALL ON TABLE "public"."customers" TO "service_role";



GRANT ALL ON TABLE "public"."global_catalog" TO "anon";
GRANT ALL ON TABLE "public"."global_catalog" TO "authenticated";
GRANT ALL ON TABLE "public"."global_catalog" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_levels" TO "anon";
GRANT ALL ON TABLE "public"."inventory_levels" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_levels" TO "service_role";



GRANT ALL ON TABLE "public"."ml_clicks_log" TO "anon";
GRANT ALL ON TABLE "public"."ml_clicks_log" TO "authenticated";
GRANT ALL ON TABLE "public"."ml_clicks_log" TO "service_role";



GRANT ALL ON TABLE "public"."ml_products" TO "anon";
GRANT ALL ON TABLE "public"."ml_products" TO "authenticated";
GRANT ALL ON TABLE "public"."ml_products" TO "service_role";



GRANT ALL ON TABLE "public"."order_items" TO "anon";
GRANT ALL ON TABLE "public"."order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."order_items" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON SEQUENCE "public"."orders_number_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."orders_number_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."orders_number_seq" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON TABLE "public"."plans" TO "anon";
GRANT ALL ON TABLE "public"."plans" TO "authenticated";
GRANT ALL ON TABLE "public"."plans" TO "service_role";



GRANT ALL ON TABLE "public"."platform_config" TO "anon";
GRANT ALL ON TABLE "public"."platform_config" TO "authenticated";
GRANT ALL ON TABLE "public"."platform_config" TO "service_role";



GRANT ALL ON TABLE "public"."platform_settings" TO "anon";
GRANT ALL ON TABLE "public"."platform_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."platform_settings" TO "service_role";



GRANT ALL ON TABLE "public"."product_attribute_assignments" TO "anon";
GRANT ALL ON TABLE "public"."product_attribute_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."product_attribute_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."product_attribute_options" TO "anon";
GRANT ALL ON TABLE "public"."product_attribute_options" TO "authenticated";
GRANT ALL ON TABLE "public"."product_attribute_options" TO "service_role";



GRANT ALL ON TABLE "public"."product_attributes" TO "anon";
GRANT ALL ON TABLE "public"."product_attributes" TO "authenticated";
GRANT ALL ON TABLE "public"."product_attributes" TO "service_role";



GRANT ALL ON TABLE "public"."product_global_refs" TO "anon";
GRANT ALL ON TABLE "public"."product_global_refs" TO "authenticated";
GRANT ALL ON TABLE "public"."product_global_refs" TO "service_role";



GRANT ALL ON TABLE "public"."product_variants" TO "anon";
GRANT ALL ON TABLE "public"."product_variants" TO "authenticated";
GRANT ALL ON TABLE "public"."product_variants" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."stock_movements" TO "anon";
GRANT ALL ON TABLE "public"."stock_movements" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_movements" TO "service_role";



GRANT ALL ON TABLE "public"."stock_reservations" TO "anon";
GRANT ALL ON TABLE "public"."stock_reservations" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_reservations" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_payments" TO "anon";
GRANT ALL ON TABLE "public"."subscription_payments" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_payments" TO "service_role";



GRANT ALL ON TABLE "public"."suppliers" TO "anon";
GRANT ALL ON TABLE "public"."suppliers" TO "authenticated";
GRANT ALL ON TABLE "public"."suppliers" TO "service_role";



GRANT ALL ON TABLE "public"."tenant_members" TO "anon";
GRANT ALL ON TABLE "public"."tenant_members" TO "authenticated";
GRANT ALL ON TABLE "public"."tenant_members" TO "service_role";



GRANT ALL ON TABLE "public"."tenants" TO "anon";
GRANT ALL ON TABLE "public"."tenants" TO "authenticated";
GRANT ALL ON TABLE "public"."tenants" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";

drop policy "tenants_insert_for_signup" on "public"."tenants";


  create policy "tenants_insert_for_signup"
  on "public"."tenants"
  as permissive
  for insert
  to anon, authenticated
with check ((auth.role() = ANY (ARRAY['anon'::text, 'authenticated'::text, 'service_role'::text])));



