-- Northfield Journal duplicate guard cleanup
-- Run once after deploying the cron duplicate guard.
-- This marks approved/queued keywords as skipped if they already match an existing post.

with post_topics as (
  select
    id,
    title,
    slug,
    status,
    lower(coalesce(title, '') || ' ' || coalesce(slug, '') || ' ' || coalesce(excerpt, '') || ' ' || array_to_string(coalesce(keywords, array[]::text[]), ' ')) as topic_text
  from public.posts
), keyword_matches as (
  select
    ck.id as keyword_id,
    ck.keyword,
    pt.title as matched_title,
    pt.status as matched_status
  from public.content_keywords ck
  join post_topics pt
    on lower(coalesce(ck.keyword, '')) = any(string_to_array(pt.topic_text, ' '))
    or pt.topic_text like '%' || lower(coalesce(ck.keyword, '')) || '%'
    or lower(coalesce(ck.keyword, '')) like '%' || lower(coalesce(pt.slug, '')) || '%'
  where ck.status in ('review', 'queued')
    and coalesce(ck.keyword, '') <> ''
), deduped as (
  select distinct on (keyword_id)
    keyword_id,
    keyword,
    matched_title,
    matched_status
  from keyword_matches
  order by keyword_id
)
update public.content_keywords ck
set
  status = 'skipped',
  last_error = 'Skipped duplicate: keyword already matches existing post "' || left(deduped.matched_title, 120) || '"',
  last_attempted_at = now()
from deduped
where ck.id = deduped.keyword_id;

select status, count(*)
from public.content_keywords
group by status
order by status;
