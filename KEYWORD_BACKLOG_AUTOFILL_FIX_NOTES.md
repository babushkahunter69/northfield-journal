# Keyword backlog autofill fix

This patch prevents the daily drafting workflow from stopping when the queued keyword table runs low.

## What changed

- Expanded the deterministic education keyword bank from a small fixed list into a larger evergreen topic and template bank.
- Raised the internal keyword generation cap from 120 to 500 candidates.
- Added `refillQueuedKeywordBacklog()` in `lib/automation/admin.ts`.
- Cron keyword refill now inserts directly into `queued` instead of requiring manual review.
- Daily draft cron now attempts to refill the queue when no draft can be created, then retries drafting in the same run.
- Manual `Draft Next` and `Run Batch` can also refill automatically before drafting.
- Duplicate topics that are skipped now remain `skipped` instead of being reset back to `queued`.

## Expected behavior

- `/api/cron/refill-keywords` keeps at least 45 queued keywords.
- `/api/cron/daily-draft` can recover from an empty queue.
- The system no longer depends on the placeholder focus field.
- Keyword generation should cover students, teachers, parents, reading, writing, math, science, special education, edtech, career guidance, study skills, exam prep, and classroom strategies.

## After deploy

1. Open `/admin/automation`.
2. Click `Draft Next` or `Run Batch`.
3. The app should refill queued keywords automatically if the queue is empty.
4. Check `/admin/keywords` and Supabase `content_keywords` for new `queued` rows.

## Notes

This still does not use Google Ads Keyword Planner. It is the internal no-empty-queue fallback. Once Google approves Basic Access, Google Ads can be added as the first source, with this evergreen bank as fallback.
