-- Optional one-time database cleanup after deploying the keyword diversity patch.
-- This removes exact duplicate keyword text only. Near-duplicate intent cleanup is handled by
-- the Admin > Automation > Clean Duplicates button because the app uses TypeScript logic
-- for semantic matching.

delete from public.content_keywords a
using public.content_keywords b
where a.id <> b.id
  and lower(trim(coalesce(a.keyword, ''))) = lower(trim(coalesce(b.keyword, '')))
  and a.status in ('review', 'queued')
  and b.status in ('review', 'queued')
  and (
    coalesce(a.priority, 0) < coalesce(b.priority, 0)
    or (
      coalesce(a.priority, 0) = coalesce(b.priority, 0)
      and a.created_at > b.created_at
    )
  );

select status, count(*)
from public.content_keywords
group by status
order by status;
