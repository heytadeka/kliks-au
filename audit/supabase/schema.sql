-- Run this in your Supabase SQL editor

create extension if not exists "pgcrypto";

create table if not exists prospects (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  brand_name text not null,
  store_url text not null,
  prospect_email text not null,
  prospect_name text not null,
  niche text not null,
  cta_link text not null default '/book',
  created_at timestamptz not null default now(),
  last_accessed_at timestamptz,
  access_count integer not null default 0,
  is_active boolean not null default true
);

create table if not exists audit_content (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references prospects(id) on delete cascade,
  section_ads_headline text,
  section_ads_body text,
  section_strategy_headline text,
  section_strategy_body text,
  section_seo_headline text,
  section_seo_body text,
  section_opportunity_headline text,
  section_opportunity_body text,
  section_closing_body text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists audit_data_cache (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null unique references prospects(id) on delete cascade,
  pagespeed_mobile jsonb,
  pagespeed_desktop jsonb,
  dataforseo_overview jsonb,
  dataforseo_keywords jsonb,
  dataforseo_gaps jsonb,
  google_ads_planner jsonb,
  meta_ads jsonb,
  cro_checklist jsonb,
  crawled_at timestamptz,
  pagespeed_fetched_at timestamptz
);

create table if not exists admin_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  name text not null,
  created_at timestamptz not null default now(),
  is_active boolean not null default true
);

-- AI commentary columns (added after initial release)
-- Run this block in Supabase SQL editor if upgrading an existing database:
--
-- ALTER TABLE audit_content
--   ADD COLUMN IF NOT EXISTS ai_performance_commentary text,
--   ADD COLUMN IF NOT EXISTS ai_cro_commentary text,
--   ADD COLUMN IF NOT EXISTS ai_seo_commentary text,
--   ADD COLUMN IF NOT EXISTS ai_opportunity_commentary text,
--   ADD COLUMN IF NOT EXISTS ai_closing_commentary text;
--
-- ALTER TABLE audit_data_cache
--   ADD COLUMN IF NOT EXISTS dataforseo_competitors jsonb,
--   ADD COLUMN IF NOT EXISTS dataforseo_serp_features jsonb,
--   ADD COLUMN IF NOT EXISTS dataforseo_content_gap jsonb;

-- Rescan overlap lock (added to prevent concurrent rescans of the same
-- prospect from interleaving their writes - see rescan/route.ts and
-- generate-commentary/route.ts). Run this block in Supabase SQL editor if
-- upgrading an existing database:
--
-- ALTER TABLE prospects
--   ADD COLUMN IF NOT EXISTS rescan_locked_at timestamptz;

-- Persisted commentary-readiness outcome (added so whether
-- dataforseo-enrichment's readiness poll resolved ready or hit its timeout
-- cap is a queryable fact instead of only a console.log/warn line that log
-- retention has repeatedly rotated out before it could be checked). Run
-- this block in Supabase SQL editor if upgrading an existing database:
--
-- ALTER TABLE audit_data_cache
--   ADD COLUMN IF NOT EXISTS commentary_readiness_status text,
--   ADD COLUMN IF NOT EXISTS commentary_readiness_ms integer,
--   ADD COLUMN IF NOT EXISTS commentary_readiness_at timestamptz;

-- Seed test prospect
insert into prospects (slug, brand_name, store_url, prospect_email, prospect_name, niche)
values ('test-brand', 'Test Brand', 'https://apple.com', 'wearekliks@gmail.com', 'Adam', 'Consumer Electronics')
on conflict (slug) do nothing;

insert into audit_content (prospect_id, section_ads_headline, section_ads_body, section_strategy_headline, section_strategy_body, section_seo_headline, section_seo_body, section_opportunity_headline, section_opportunity_body, section_closing_body)
select id,
  'Placeholder Ads Headline',
  'Placeholder content for testing. Replace before sending.',
  'Placeholder Strategy Headline',
  'Placeholder content for testing. Replace before sending.',
  'Placeholder SEO Headline',
  'Placeholder content for testing. Replace before sending.',
  'Placeholder Opportunity Headline',
  'Placeholder content for testing. Replace before sending.',
  'Placeholder content for testing. Replace before sending.'
from prospects where slug = 'test-brand'
on conflict do nothing;

insert into audit_data_cache (prospect_id)
select id from prospects where slug = 'test-brand'
on conflict do nothing;
