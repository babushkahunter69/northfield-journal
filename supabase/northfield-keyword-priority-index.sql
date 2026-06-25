-- Northfield Journal keyword drafting priority index
-- Ensures queue reads are fast and deterministic: highest priority first, older items first on ties.

create index if not exists content_keywords_status_priority_created_idx
  on public.content_keywords(status, priority desc, created_at asc);
