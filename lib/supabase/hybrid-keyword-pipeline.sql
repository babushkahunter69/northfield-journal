-- Northfield Hybrid Keyword Pipeline
-- Run this once in Supabase SQL Editor before using the new hybrid keyword review flow.
-- It allows candidate/rejected statuses so generated ideas do not go straight into drafting.

alter table content_keywords
  drop constraint if exists content_keywords_status_check;

alter table content_keywords
  add constraint content_keywords_status_check
  check (status in ('candidate', 'queued', 'in_progress', 'done', 'rejected', 'skipped'));

-- Keep already queued items as-is. Future auto-generated ideas will be saved as candidates.
select status, count(*)
from content_keywords
group by status
order by status;
