# Keyword Priority Draft Fix

This patch makes the keyword workflow consistently prefer the highest-scored keywords first.

## What changed

- Drafting already used `priority desc`; this patch keeps that behavior and documents it.
- Keyword admin list/API now sort by `priority desc` before `created_at`, so the highest score appears first in the UI.
- Added a Supabase index for fast queue selection: `status, priority desc, created_at asc`.

## Draft selection rule

Daily cron, Draft Next, and Run Batch select queued keywords using:

1. `status = queued`
2. highest `priority` first
3. oldest `created_at` first when priority is tied

## Optional SQL

Run `supabase/northfield-keyword-priority-index.sql` once in Supabase SQL Editor.
