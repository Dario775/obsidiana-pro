SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict oeL6Ofa1ge7Xuwb50z1j3c9zQrtbbEcY2eHBuolHOuhj2WFuGKSCgvHI3TDiKML

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: custom_oauth_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token", "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin", "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change", "phone_change_token", "phone_change_sent_at", "email_change_token_current", "email_change_confirm_status", "banned_until", "reauthentication_token", "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous") VALUES
	('00000000-0000-0000-0000-000000000000', 'bc8d25a5-7fb1-47aa-ae52-7e804a279459', 'authenticated', 'authenticated', 'admin@admin.com', '$2a$10$Q58Rx7R7GpUzdNTNAUuXXOUq3N4psc8FMgODQgQedVuJ6WR6NLmXK', '2026-05-10 05:06:12.377797+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-05-11 04:55:58.429191+00', '{"provider": "email", "providers": ["email"]}', '{"tenant_id": "aacd50a6-f08a-488d-b8bc-c4013e527f47", "email_verified": true, "is_platform_admin": true}', NULL, '2026-05-10 05:06:12.357935+00', '2026-05-11 04:55:58.448302+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '17dafdee-0166-4d03-8ba1-a7ae8e115a94', 'authenticated', 'authenticated', 'tienda1@gmail.com', '$2a$10$j.JlqlkeBEDdyPVPnfmXNuNUkyfXZnp0XJ1gGn48b/3ggKknbDE6O', '2026-05-10 15:15:00.125824+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-05-11 14:51:59.551542+00', '{"provider": "email", "providers": ["email"]}', '{"tenant_id": "457915d4-b445-4300-840f-6f04749e644b", "store_name": "Tienda 1", "email_verified": true}', NULL, '2026-05-10 15:15:00.105698+00', '2026-05-11 14:51:59.585237+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false);


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."identities" ("provider_id", "user_id", "identity_data", "provider", "last_sign_in_at", "created_at", "updated_at", "id") VALUES
	('bc8d25a5-7fb1-47aa-ae52-7e804a279459', 'bc8d25a5-7fb1-47aa-ae52-7e804a279459', '{"sub": "bc8d25a5-7fb1-47aa-ae52-7e804a279459", "email": "admin@admin.com", "email_verified": false, "phone_verified": false}', 'email', '2026-05-10 05:06:12.374062+00', '2026-05-10 05:06:12.374112+00', '2026-05-10 05:06:12.374112+00', '9ba02aa8-163f-4e93-b38f-706af7ec2144'),
	('17dafdee-0166-4d03-8ba1-a7ae8e115a94', '17dafdee-0166-4d03-8ba1-a7ae8e115a94', '{"sub": "17dafdee-0166-4d03-8ba1-a7ae8e115a94", "email": "tienda1@gmail.com", "email_verified": false, "phone_verified": false}', 'email', '2026-05-10 15:15:00.121777+00', '2026-05-10 15:15:00.121833+00', '2026-05-10 15:15:00.121833+00', '0e287741-7930-458b-afe4-401fac6d7f96');


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."sessions" ("id", "user_id", "created_at", "updated_at", "factor_id", "aal", "not_after", "refreshed_at", "user_agent", "ip", "tag", "oauth_client_id", "refresh_token_hmac_key", "refresh_token_counter", "scopes") VALUES
	('d0171b41-fd3a-4688-b2d7-5bd8dcabaf36', 'bc8d25a5-7fb1-47aa-ae52-7e804a279459', '2026-05-10 19:08:54.401172+00', '2026-05-11 03:59:20.172092+00', NULL, 'aal1', NULL, '2026-05-11 03:59:20.171994', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '98.97.134.32', NULL, NULL, NULL, NULL, NULL),
	('a84b7c8e-ba34-443a-9c79-01d3e9fb436c', 'bc8d25a5-7fb1-47aa-ae52-7e804a279459', '2026-05-11 04:55:58.430448+00', '2026-05-11 04:55:58.430448+00', NULL, 'aal1', NULL, NULL, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '98.97.134.32', NULL, NULL, NULL, NULL, NULL);


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."mfa_amr_claims" ("session_id", "created_at", "updated_at", "authentication_method", "id") VALUES
	('d0171b41-fd3a-4688-b2d7-5bd8dcabaf36', '2026-05-10 19:08:54.41331+00', '2026-05-10 19:08:54.41331+00', 'password', '77f8be2c-85cb-4256-9742-ae78c82d27e2'),
	('a84b7c8e-ba34-443a-9c79-01d3e9fb436c', '2026-05-11 04:55:58.450669+00', '2026-05-11 04:55:58.450669+00', 'password', 'e60f506f-8f34-48e6-9a31-3475285d76ab');


--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_client_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."refresh_tokens" ("instance_id", "id", "token", "user_id", "revoked", "created_at", "updated_at", "parent", "session_id") VALUES
	('00000000-0000-0000-0000-000000000000', 45, '4e6spmtbmse7', 'bc8d25a5-7fb1-47aa-ae52-7e804a279459', true, '2026-05-10 19:08:54.410105+00', '2026-05-11 00:32:01.454009+00', NULL, 'd0171b41-fd3a-4688-b2d7-5bd8dcabaf36'),
	('00000000-0000-0000-0000-000000000000', 46, 'w4ti5swds3qf', 'bc8d25a5-7fb1-47aa-ae52-7e804a279459', true, '2026-05-11 00:32:01.47659+00', '2026-05-11 02:53:01.524251+00', '4e6spmtbmse7', 'd0171b41-fd3a-4688-b2d7-5bd8dcabaf36'),
	('00000000-0000-0000-0000-000000000000', 47, 'i5vpbily6wig', 'bc8d25a5-7fb1-47aa-ae52-7e804a279459', true, '2026-05-11 02:53:01.536475+00', '2026-05-11 03:59:20.151854+00', 'w4ti5swds3qf', 'd0171b41-fd3a-4688-b2d7-5bd8dcabaf36'),
	('00000000-0000-0000-0000-000000000000', 49, 'tsivnofvq33l', 'bc8d25a5-7fb1-47aa-ae52-7e804a279459', false, '2026-05-11 03:59:20.159497+00', '2026-05-11 03:59:20.159497+00', 'i5vpbily6wig', 'd0171b41-fd3a-4688-b2d7-5bd8dcabaf36'),
	('00000000-0000-0000-0000-000000000000', 51, 'zflntncq7lyw', 'bc8d25a5-7fb1-47aa-ae52-7e804a279459', false, '2026-05-11 04:55:58.445862+00', '2026-05-11 04:55:58.445862+00', NULL, 'a84b7c8e-ba34-443a-9c79-01d3e9fb436c');


--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: webauthn_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: webauthn_credentials; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: tenants; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."tenants" ("id", "nombre", "slug", "status", "status_reason", "address", "phone", "email", "logo_url", "banner_url", "created_at", "updated_at", "store_name", "store_description", "store_domain", "store_active", "store_theme", "store_template", "store_banners", "store_tagline", "store_currency", "store_min_order_amount", "store_shipping_enabled", "store_shipping_cost", "store_shipping_free_threshold", "store_social_instagram", "store_social_facebook", "store_social_whatsapp", "ml_affiliate_id", "ml_access_token", "ml_refresh_token", "ml_token_expires_at", "ml_user_id", "plan_id", "subscription_status", "subscription_expires_at", "online_store_enabled", "is_demo", "is_platform_admin", "ml_affiliate_word") VALUES
	('aacd50a6-f08a-488d-b8bc-c4013e527f47', 'Plataforma Obsidiana', 'plataforma', 'active', NULL, NULL, NULL, NULL, NULL, NULL, '2026-05-10 04:33:35.472799+00', '2026-05-10 04:33:35.472799+00', NULL, NULL, NULL, false, 'violet', 'classic', '[]', NULL, 'ARS', 0, true, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, false, true, NULL),
	('d93cd095-2324-46bc-b4d2-88874b900467', 'tienda 4 ', 'tienda-4-', 'active', NULL, NULL, NULL, NULL, NULL, NULL, '2026-05-10 06:49:52.001729+00', '2026-05-10 06:49:52.001729+00', NULL, NULL, NULL, false, 'violet', 'classic', '[]', NULL, 'ARS', 0, true, 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, false, false, NULL),
	('457915d4-b445-4300-840f-6f04749e644b', 'Tienda 1', 'tienda-1', 'active', NULL, NULL, NULL, NULL, NULL, NULL, '2026-05-10 15:14:59.755595+00', '2026-05-10 15:14:59.755595+00', NULL, NULL, NULL, false, 'violet', 'classic', '[]', NULL, 'ARS', 0, true, 0, 0, NULL, NULL, NULL, '27967988', 'APP_USR-4881459797480541-051102-5598d2e42787385df05ed2113758a6ad-74040993', 'TG-6a0175ef1a30b60001a4b6b7-74040993', '2026-05-11 12:23:43.439+00', '74040993', NULL, NULL, NULL, true, false, false, NULL);


--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: global_catalog; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: product_variants; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: inventory_levels; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: ml_clicks_log; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: ml_products; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: plans; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."plans" ("id", "name", "monthly_price", "yearly_price", "features", "max_products", "max_branches", "online_store", "pos") VALUES
	('free', 'Gratis', 0, 0, '["basic-pos", "low-stock-alerts"]', 50, 1, false, true),
	('starter', 'Inicial', 1999, 19990, '["full-pos", "online-store", "basic-reports"]', 200, 2, true, true),
	('pro', 'Profesional', 4999, 49990, '["multi-branch", "full-reports", "priority-support"]', 1000, 5, true, true),
	('enterprise', 'Empresarial', 9999, 99990, '["unlimited", "api-access", "dedicated-support"]', 999999, 999, true, true),
	('basic', 'Básico', 15000, 150000, '[]', 100, 1, true, false);


--
-- Data for Name: platform_config; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."platform_config" ("key", "value", "updated_at") VALUES
	('payment_config', '{"mp_link": "", "mp_enabled": false, "mp_client_id": "", "transfer_cbu": "", "transfer_bank": "", "transfer_alias": "", "mp_client_secret": "", "transfer_enabled": true}', '2026-05-10 05:54:10.589918+00');


--
-- Data for Name: platform_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."platform_settings" ("key", "value", "description", "created_at", "updated_at") VALUES
	('ml_app_config', '{"active": true, "app_client_id": "4881459797480541", "app_redirect_uri": "https://obsidiana-pro.vercel.app/auth/mercadolibre/callback", "app_client_secret": "EFPqhFtjPJ1K5ExS3ky374Al1YQ6ObCo"}', NULL, '2026-05-10 06:03:28.67472+00', '2026-05-10 15:51:18.831+00');


--
-- Data for Name: product_attributes; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: product_attribute_options; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: product_attribute_assignments; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: product_global_refs; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: stock_movements; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: stock_reservations; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: subscription_payments; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: suppliers; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: tenant_members; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."tenant_members" ("id", "tenant_id", "user_id", "role", "created_at") VALUES
	('2aaf6d9a-a680-4286-ba2d-e304069db639', 'aacd50a6-f08a-488d-b8bc-c4013e527f47', '10443973-e381-4286-9042-45e33d3f9fec', 'admin', '2026-05-10 05:22:51.227027+00'),
	('939f424b-a053-487f-80a2-5d522ff326a3', 'aacd50a6-f08a-488d-b8bc-c4013e527f47', '10443973-e381-4286-9042-45e33d3f9fec', 'admin', '2026-05-10 05:32:08.973585+00'),
	('f24b92da-bd0d-4be1-a8fd-d42e6d2f926c', 'aacd50a6-f08a-488d-b8bc-c4013e527f47', 'bc8d25a5-7fb1-47aa-ae52-7e804a279459', 'owner', '2026-05-10 05:46:08.197384+00');


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: buckets_vectors; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: vector_indexes; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 60, true);


--
-- Name: orders_number_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."orders_number_seq"', 1, false);


--
-- PostgreSQL database dump complete
--

-- \unrestrict oeL6Ofa1ge7Xuwb50z1j3c9zQrtbbEcY2eHBuolHOuhj2WFuGKSCgvHI3TDiKML

RESET ALL;
