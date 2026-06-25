-- Optional cleanup for the rejected keyword blocklist.
-- This removes duplicate blocklist rows and adds a unique constraint so future inserts stay clean.

create table if not exists public.content_keyword_blocks (
  id uuid primary key default gen_random_uuid(),
  keyword text not null,
  normalized_keyword text not null,
  intent_key text,
  reason text default 'rejected',
  created_at timestamptz default now()
);

alter table public.content_keyword_blocks
add column if not exists normalized_keyword text;

update public.content_keyword_blocks
set keyword = lower(trim(keyword))
where keyword is not null;

update public.content_keyword_blocks
set normalized_keyword = lower(trim(keyword))
where normalized_keyword is null
  and keyword is not null;

delete from public.content_keyword_blocks a
using public.content_keyword_blocks b
where a.id > b.id
  and lower(trim(a.keyword)) = lower(trim(b.keyword));

delete from public.content_keyword_blocks
where keyword is null
   or lower(trim(keyword)) = ''
   or normalized_keyword is null
   or lower(trim(normalized_keyword)) = '';

alter table public.content_keyword_blocks
alter column normalized_keyword set not null;

create unique index if not exists content_keyword_blocks_normalized_keyword_unique
  on public.content_keyword_blocks(normalized_keyword);

create unique index if not exists content_keyword_blocks_keyword_unique
  on public.content_keyword_blocks(keyword);

create index if not exists content_keyword_blocks_intent_key_idx
  on public.content_keyword_blocks(intent_key);
