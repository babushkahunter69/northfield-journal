-- Stores deleted/rejected keyword intents so the generator does not bring them back.
create table if not exists public.content_keyword_blocks (
  id uuid primary key default gen_random_uuid(),
  keyword text not null,
  normalized_keyword text not null,
  intent_key text not null,
  reason text not null default 'rejected',
  original_status text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create unique index if not exists content_keyword_blocks_intent_key_uidx
  on public.content_keyword_blocks (intent_key);

create index if not exists content_keyword_blocks_normalized_keyword_idx
  on public.content_keyword_blocks (normalized_keyword);

-- One-time cleanup: archive rejected/skipped keywords, then remove them from the active keyword table.
insert into public.content_keyword_blocks (
  keyword,
  normalized_keyword,
  intent_key,
  reason,
  original_status,
  last_seen_at
)
select distinct on (lower(trim(keyword)))
  keyword,
  lower(regexp_replace(trim(keyword), '[^a-zA-Z0-9]+', ' ', 'g')),
  lower(regexp_replace(trim(keyword), '[^a-zA-Z0-9]+', ' ', 'g')),
  'rejected',
  status,
  now()
from public.content_keywords
where status in ('skipped', 'rejected')
  and coalesce(trim(keyword), '') <> ''
on conflict (intent_key) do update set
  last_seen_at = excluded.last_seen_at,
  reason = excluded.reason,
  original_status = excluded.original_status;

delete from public.content_keywords
where status in ('skipped', 'rejected');
