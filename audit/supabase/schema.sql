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

-- Never checked in until now, despite being live since early on - see
-- app/api/audit/admin/create/route.ts, app/api/outreach/update/route.ts,
-- app/api/audit/gate/route.ts. Documented here from a full audit of every
-- insert/select/update against it, not from a source-of-truth definition
-- that existed anywhere. One row per prospect in practice (no unique
-- constraint enforces it, but every write path treats it that way).
-- `status` is the pre-2026-08-14 stage field, being retired in favour of
-- `stage`/`declined_reason` below - see that migration block for why.
create table if not exists outreach_log (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references prospects(id) on delete cascade,
  domain text,
  brand_name text,
  prospect_name text,
  prospect_email text,
  audit_slug text,
  status text, -- legacy - superseded by `stage`, kept for historical rows only, no longer written
  notes text,
  follow_up_due_at date,
  deal_value numeric,
  lost_reason text, -- legacy - superseded by `declined_reason`
  email_sent_at timestamptz, -- set once, on first transition into stage 'first_email_sent'
  first_opened_at timestamptz,
  last_opened_at timestamptz,
  open_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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

-- Google Business expansion: reviews, Q&A, GBP posting activity (added for
-- the local-first reframe - these prospects are local businesses that
-- happen to have a store, not stores that happen to be local). Reviews and
-- updates are fetched async via DataForSEO task_post + postback_url, so
-- each gets its own _status/_task_id/_fetched_at trio to track an in-flight
-- task independent of whether it has landed yet - same shape as
-- commentary_readiness_status/_ms/_at below, reused rather than inventing a
-- new one. Q&A is synchronous (task_get not required), so it only needs a
-- fetched_at timestamp, same as pagespeed_fetched_at/crawled_at.
-- ai_gmb_commentary is unused until the AI pattern-finding phase of this
-- bundle is built, added now so this is the only migration this bundle
-- needs. Run this block in Supabase SQL editor if upgrading an existing
-- database:
--
-- ALTER TABLE audit_data_cache
--   ADD COLUMN IF NOT EXISTS gmb_reviews jsonb,
--   ADD COLUMN IF NOT EXISTS gmb_reviews_status text,
--   ADD COLUMN IF NOT EXISTS gmb_reviews_task_id text,
--   ADD COLUMN IF NOT EXISTS gmb_reviews_fetched_at timestamptz,
--   ADD COLUMN IF NOT EXISTS gmb_qa jsonb,
--   ADD COLUMN IF NOT EXISTS gmb_qa_fetched_at timestamptz,
--   ADD COLUMN IF NOT EXISTS gmb_updates jsonb,
--   ADD COLUMN IF NOT EXISTS gmb_updates_status text,
--   ADD COLUMN IF NOT EXISTS gmb_updates_task_id text,
--   ADD COLUMN IF NOT EXISTS gmb_updates_fetched_at timestamptz;
--
-- ALTER TABLE audit_content
--   ADD COLUMN IF NOT EXISTS ai_gmb_commentary text;

-- Google Business Phase 4 (AI commentary): ai_gmb_commentary was declared
-- text above, but this phase stores two distinct generated fields
-- (rating_framing, review_patterns) as one object - jsonb, not text. Column
-- is unwritten by any code as of this migration, so this is a safe type
-- change with no existing data to convert. Run this block in Supabase SQL
-- editor if upgrading an existing database:
--
-- ALTER TABLE audit_content
--   ALTER COLUMN ai_gmb_commentary TYPE jsonb USING ai_gmb_commentary::jsonb;

-- LLM Visibility Check: fires chat_gpt/claude/perplexity ai_optimization
-- llm_responses/live in parallel during the create/rescan fan-out (same
-- synchronous pattern as gmb_qa, not the task_post/webhook pattern used for
-- gmb_reviews/gmb_updates), asking a natural question built from the
-- prospect's niche/location and checking whether the response mentions the
-- prospect. This is raw fetched data (query, full response, mention
-- detection, cost, timestamp per provider), not AI-generated commentary -
-- belongs on audit_data_cache, not audit_content. Declared jsonb from the
-- start this time, not text - the Phase 4 ai_gmb_commentary migration above
-- was a lesson learned. Run this block in Supabase SQL editor if upgrading
-- an existing database:
--
-- ALTER TABLE audit_data_cache
--   ADD COLUMN IF NOT EXISTS llm_visibility_results jsonb;

-- Relevant Pages: dataforseo_labs/google/relevant_pages/live, fetched
-- alongside domain_rank_overview/ranked_keywords in dataforseo-core's
-- existing Phase 1 parallel batch (same category of Labs call as the other
-- six already in that route). Raw per-page items array (page_address,
-- metrics.organic.etv/count) - the traffic-concentration stat this feeds is
-- computed at render time from this raw data (lib/relevant-pages.ts), same
-- "store raw, compute derived stats in one shared place" pattern as
-- resolveOrganicStats(), not pre-baked into a second column that could
-- drift from the render logic. Declared jsonb from the start. Run this
-- block in Supabase SQL editor if upgrading an existing database:
--
-- ALTER TABLE audit_data_cache
--   ADD COLUMN IF NOT EXISTS dataforseo_relevant_pages jsonb;

-- Diagnostic tracing for the readiness/commentary-freshness investigation:
-- the atomic rescan-lock fix (see git history) didn't close a small
-- negative gap between commentary_readiness_at and pagespeed_fetched_at,
-- reproduced on 3 real prospects (bakealicious, enze, sebastien-sans-gluten)
-- after that fix was live - meaning the mechanism isn't a duplicate-rescan
-- race after all, or isn't only that. commentary_readiness_at only records
-- when the readiness POLL observed pagespeed_fetched_at as non-null - it
-- says nothing about what generate-commentary's own, separate fresh read
-- (a different HTTP invocation, moments later) actually saw. These columns
-- close that visibility gap so the next single, deliberate rescan produces
-- real evidence instead of another timestamp-based inference. Safe to drop
-- once the mechanism is confirmed and fixed. Run this block in Supabase SQL
-- editor if upgrading an existing database:
--
-- ALTER TABLE audit_data_cache
--   ADD COLUMN IF NOT EXISTS commentary_gen_invoked_at timestamptz,
--   ADD COLUMN IF NOT EXISTS commentary_gen_saw_pagespeed_at timestamptz,
--   ADD COLUMN IF NOT EXISTS commentary_gen_saw_tbt numeric,
--   ADD COLUMN IF NOT EXISTS commentary_gen_saw_speed_index numeric,
--   ADD COLUMN IF NOT EXISTS commentary_readiness_saw_pagespeed_at timestamptz;

-- Unified outreach stage model (2026-08-14): collapses the old 10-value
-- `status` (audit_created/email_sent/opened/no_response/responded/
-- call_booked/proposal_sent/won/lost/not_a_fit) down to 6 real values -
-- real usage data across all 26 live rows showed zero use of the
-- responded/call_booked/proposal_sent distinction, so they collapse to one.
-- `opened` is dropped as a stage entirely - it was always report-page-view
-- tracking (see gate/route.ts), not email-open tracking, and is now
-- correctly modelled as the independent "Viewed" badge (open_count > 0),
-- not a stage a prospect occupies. Additive: `status`/`lost_reason` stay in
-- the table, populated on historical rows, but the app stops reading or
-- writing them once this migration runs - see lib/outreach-stage.ts for the
-- values and the backfill mapping used to populate `stage` from `status`.
-- Run this block in Supabase SQL editor if upgrading an existing database:
--
-- ALTER TABLE outreach_log
--   ADD COLUMN IF NOT EXISTS stage text,
--   ADD COLUMN IF NOT EXISTS declined_reason text;
--
-- stage values: not_contacted | first_email_sent | second_email_sent |
--   responded | won | declined
-- declined_reason values (only set when stage = 'declined'): said_no | not_a_fit
