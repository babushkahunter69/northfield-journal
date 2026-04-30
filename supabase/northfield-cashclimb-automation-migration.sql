-- Cashclimb-style automation migration for Northfield Journal
-- Safe to run after the base schema. Adds the columns/routes need for automated keyword queue, drafts, SEO fixing, and generation logs.

create extension if not exists pgcrypto;

alter table public.posts add column if not exists og_image_url text;
alter table public.posts add column if not exists canonical_url text;
alter table public.posts add column if not exists source_type text default 'editorial';
alter table public.posts add column if not exists generation_status text default 'manual';
alter table public.posts add column if not exists faq_json jsonb;

create table if not exists public.content_keywords (
  id uuid primary key default gen_random_uuid(),
  keyword text not null unique,
  cluster text,
  search_intent text,
  audience text,
  priority integer not null default 80,
  country_code text default 'US',
  status text not null default 'queued',
  last_generated_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.content_keywords add column if not exists grade_band text;
alter table public.content_keywords add column if not exists subject_area text;
alter table public.content_keywords add column if not exists content_type text;
alter table public.content_keywords add column if not exists target_country text;
alter table public.content_keywords add column if not exists curriculum text;
alter table public.content_keywords add column if not exists learning_objective text;
alter table public.content_keywords add column if not exists tone text;
alter table public.content_keywords add column if not exists attempt_count integer not null default 0;
alter table public.content_keywords add column if not exists last_attempted_at timestamptz;
alter table public.content_keywords add column if not exists last_error text;

create index if not exists content_keywords_queue_idx
  on public.content_keywords (status, priority desc, created_at asc);

create table if not exists public.content_briefs (
  id uuid primary key default gen_random_uuid(),
  keyword_id uuid references public.content_keywords(id) on delete cascade,
  working_title text not null,
  slug text not null,
  angle text,
  outline_json jsonb,
  seo_title text,
  seo_description text,
  target_word_count integer default 1400,
  internal_links_json jsonb,
  external_sources_json jsonb,
  status text not null default 'draft',
  created_at timestamptz not null default now()
);

create index if not exists content_briefs_slug_idx on public.content_briefs (slug);

create table if not exists public.content_generation_runs (
  id uuid primary key default gen_random_uuid(),
  keyword_id uuid references public.content_keywords(id) on delete set null,
  brief_id uuid references public.content_briefs(id) on delete set null,
  post_id uuid references public.posts(id) on delete set null,
  run_type text not null,
  status text not null,
  model_name text,
  input_snapshot jsonb,
  output_snapshot jsonb,
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists public.automation_logs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  event_type text not null,
  status text not null default 'info',
  message text not null,
  meta jsonb,
  created_at timestamptz not null default now()
);

alter table public.content_keywords enable row level security;
alter table public.content_briefs enable row level security;
alter table public.content_generation_runs enable row level security;
alter table public.automation_logs enable row level security;

drop policy if exists "Service role can manage automation logs" on public.automation_logs;
create policy "Service role can manage automation logs"
on public.automation_logs for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
