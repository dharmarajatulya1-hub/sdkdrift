# @sdkdrift/landing

Landing page package scaffold for the SDKDrift MVP.

This package will host the public marketing page and waitlist flow.

## Commands
- `npm run --workspace @sdkdrift/landing dev`
- `npm run --workspace @sdkdrift/landing build`

## Environment
- `SUPABASE_URL`: Supabase project URL.
- `SUPABASE_SERVICE_ROLE_KEY`: service role key used by server route.
- `SUPABASE_WAITLIST_TABLE`: optional table name (default `waitlist_signups`).
- `NEXT_PUBLIC_SITE_URL`: optional site URL for SEO metadata.

## Suggested Table
```sql
create table if not exists public.waitlist_signups (
  email text primary key,
  source text not null,
  created_at timestamptz not null default now()
);
```
