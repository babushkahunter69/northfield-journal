# Keyword Rejection + Blocklist Fix

This patch changes rejected keyword handling so rejected topics are deleted from the active keyword table but remembered in a blocklist.

## What changed

- Rejecting a keyword now archives its keyword intent into `content_keyword_blocks`.
- Rejected keywords are deleted from `content_keywords` so the admin desk stays clean.
- New keyword generation checks active keywords, drafted/done keywords, existing posts, and the blocklist before showing results.
- Clean Duplicates now archives and deletes rejected/skipped/near-duplicate keyword intents.
- Blocked keyword intents will not be generated again even after they are deleted from the active table.

## Required one-time Supabase migration

Run this file in Supabase SQL Editor before using Reject or Clean Duplicates:

`supabase/northfield-keyword-blocklist-migration.sql`

## After deployment

1. Run the migration in Supabase.
2. Redeploy Vercel.
3. Go to `/admin/automation`.
4. Click `Clean Duplicates` once.
5. Go to `/admin/keywords` and generate new keywords.

