# Obsidiana Pro - Retail SaaS

## Overview

Multi-tenant retail management system with online store, inventory control, POS, subscription billing, and ML Affiliate integration.

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS 3.4
- **Database**: Supabase (PostgreSQL + Auth + Realtime)
- **Deployment**: Vercel (frontend), GitHub (CI/CD)
- **Package Manager**: pnpm 9.x
- **Monorepo**: Turborepo

## Project Structure

```
obsidiana-pro/
├── apps/web/              # Next.js frontend
│   ├── app/            # App router pages
│   │   ├── (admin)/    # Dashboard routes
│   │   ├── (platform)/ # Super admin routes
│   │   ├── (store)/   # Online store routes
│   │   └── api/       # API routes
│   ├── components/     # Shared components
│   ├── hooks/         # Custom hooks
│   └── lib/           # Utilities
├── packages/           # Shared packages
│   ├── config-tailwind/
│   ├── eslint-config/
│   ├── shared/
│   ├── typescript-config/
│   └── ui/
└── supabase/
    └── migrations/     # DB migrations
```

## Deployment

### Vercel

1. Connect GitHub repo to Vercel
2. Settings:
   - Framework Preset: Other
   - Build Command: `pnpm run build`
   - Output Directory: `apps/web/.next`

### Environment Variables

Required in Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`: https://fjgwenrebdwssquebfay.supabase.co
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: (from Supabase Settings → API)
- `SUPABASE_SERVICE_ROLE_KEY`: (from Supabase Settings → API)
- `DATABASE_URL`: (from Supabase Settings → Connection)

### Supabase Setup

1. Create new project at supabase.com
2. Run migrations in `supabase/migrations/`
3. Configure RLS policies

## Key Features

### Multi-Tenant Architecture

- Each tenant has unique `slug` and `tenant_id`
- Users linked via `tenant_members` table
- Row-level security (RLS) per tenant

### ML Affiliate Integration

- OAuth flow via Mercado Libre API
- Tokens stored per tenant (`ml_access_token`, `ml_refresh_token`)
- Click tracking via `/api/ml/track`
- Live prices via `/api/ml/prices`

### Online Store

- Public store at `/tienda/[slug]`
- Product catalog synced per tenant
- Affiliate links: `?ref={affiliate_id}&source=affiliate`

### Super Admin

- Access via `tenant.is_platform_admin = true`
- Routes: `/overview`, `/subscriptions`, `/settings/ml`
- Manage all tenants and platform config

## Pages & Routes

| Route | Description |
|-------|------------|
| `/login` | User login |
| `/register` | New tenant signup |
| `/dashboard` | Tenant admin panel |
| `/overview` | Super admin overview |
| `/subscriptions` | Subscription management |
| `/settings/ml` | Platform ML config |
| `/settings/ml-affiliate` | Tenant ML affiliate |
| `/tienda/[slug]` | Public store |

## Database Schema

### Core Tables

- `tenants`: Multi-tenant stores
- `tenant_members`: User-tenant relationships
- `products`: Product catalog
- `product_variants`: SKU-level inventory
- `customers`: Customer database
- `orders`: Sales orders
- `subscription_payments`: Payment history
- `plans`: Subscription plans
- `platform_settings`: Platform config

### ML Tables

- `ml_products`: Imported ML items
- `ml_clicks_log`: Click analytics

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ml/track` | POST | Log ML affiliate click |
| `/api/ml/prices` | GET | Fetch live ML prices |

## Development

```bash
# Install
pnpm install

# Dev server
pnpm dev

# Build
pnpm build

# Lint
pnpm lint
```

## ML OAuth Flow

1. User clicks "Conectar con Mercado Libre"
2. Redirect to ML auth URL with `client_id` and `redirect_uri`
3. ML redirects to `/auth/callback?code=...&state=...`
4. Exchange code for tokens via ML API
5. Store tokens in `tenants` table

## Production Checklist

- [ ] Supabase project created
- [ ] Migrations executed
- [ ] Vercel connected
- [ ] Environment variables set
- [ ] RLS policies enabled
- [ ] Platform admin tenant created
- [ ] ML app registered in Mercado Libre Developers
- [ ] Redirect URI configured in ML app