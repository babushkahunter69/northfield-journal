# Current Site Automation Fix Notes

This patch improves what the site can do before Google Ads API Basic Access is approved.

## Fixed now

- Automation Generate Keywords now adds fresh keywords directly to the draft queue.
- Daily cron now refills the keyword queue first if it is empty, then retries drafting.
- Manual Draft Next also refills the queue when needed.
- Rejected/skipped keyword rows are archived to a blocklist and removed from the active keyword table.
- Future keyword generation checks active keywords, blocked/rejected keywords, and existing posts before showing or queueing new ideas.
- The internal education keyword source is much larger and more varied while Google Keyword Planner is pending.
- Draft failures do not loop forever. Duplicate or repeatedly failing keywords are skipped instead of being retried endlessly.

## Required Supabase SQL

Run this once before or after deployment:

```sql
-- supabase/northfield-keyword-blocklist-migration.sql
```

## Still pending

Google Ads Keyword Planner integration still requires Google Ads API Basic Access approval. Until then, the site uses the improved internal SEO keyword fallback.
