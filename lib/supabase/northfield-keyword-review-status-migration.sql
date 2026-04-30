-- Allows generated keywords to sit in review before they can be drafted.
-- Draft generation only uses status = 'queued'.

alter table public.content_keywords
  drop constraint if exists content_keywords_status_check;

alter table public.content_keywords
  add constraint content_keywords_status_check
  check (status in ('review', 'queued', 'in_progress', 'done', 'skipped'));

-- Optional: send any previously generated queued keywords back to review if they have never been drafted.
-- Uncomment if you want to manually review your existing queue first.
-- update public.content_keywords
-- set status = 'review'
-- where status = 'queued' and last_generated_at is null;
