-- Keeps rejected and duplicate keyword intents out of future generation.
create table if not exists public.content_keyword_blocks (
  id uuid primary key default gen_random_uuid(),
  keyword text not null unique,
  intent_key text,
  reason text not null default 'rejected',
  created_at timestamptz not null default now()
);

create index if not exists content_keyword_blocks_intent_key_idx
  on public.content_keyword_blocks(intent_key);

-- Archive currently rejected/skipped keywords before removing them from the active queue.
insert into public.content_keyword_blocks (keyword, intent_key, reason)
select distinct
  lower(trim(keyword)) as keyword,
  null as intent_key,
  coalesce(status, 'rejected') as reason
from public.content_keywords
where status in ('skipped', 'rejected')
  and keyword is not null
  and trim(keyword) <> ''
on conflict (keyword) do nothing;

delete from public.content_keywords
where status in ('skipped', 'rejected');
