-- Northfield Journal automation support schema
-- Run this in Supabase SQL editor if these tables or columns are missing.

create table if not exists public.content_keywords (
  id uuid primary key default gen_random_uuid(),
  keyword text not null,
  cluster text,
  search_intent text,
  audience text,
  grade_band text,
  subject_area text,
  content_type text,
  target_country text,
  curriculum text,
  learning_objective text,
  tone text,
  priority integer not null default 80,
  country_code text,
  status text not null default 'queued',
  attempt_count integer not null default 0,
  last_attempted_at timestamptz,
  last_generated_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);

create unique index if not exists content_keywords_keyword_unique
  on public.content_keywords (lower(trim(keyword)));

create index if not exists content_keywords_queue_idx
  on public.content_keywords (status, priority desc, created_at asc);

create table if not exists public.content_briefs (
  id uuid primary key default gen_random_uuid(),
  keyword_id uuid references public.content_keywords(id) on delete set null,
  working_title text not null,
  slug text not null,
  angle text,
  outline_json jsonb,
  seo_title text,
  seo_description text,
  target_word_count integer,
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
  post_id uuid,
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

alter table public.posts add column if not exists source_type text;
alter table public.posts add column if not exists generation_status text;
alter table public.posts add column if not exists faq_json jsonb;
alter table public.posts add column if not exists og_image_url text;
alter table public.posts add column if not exists canonical_url text;
