# Keyword Diversity Fix

This patch changes keyword automation so blank/default focus no longer reuses the placeholder topic set.

## Changed

- Blank focus now generates across a diverse education topic pool.
- Added semantic near-duplicate detection for keyword intent.
- Limits keyword generation to a small number per cluster.
- Cron refill now inserts queued keywords from diverse intents automatically.
- Admin generation now inserts review keywords from diverse intents automatically.
- Clean Duplicates now removes near-duplicate review/queued keyword intents, not only exact duplicate strings.

## After deployment

1. Open `/admin/automation`.
2. Click `Clean Duplicates` once.
3. Click `Generate Keywords` with the focus box empty.
4. Check `/admin/keywords`.
5. Approve the best keywords or use `Approve all new` if you want full automation.

For automatic daily drafting, keep these Vercel env vars set:

```env
CRON_SECRET=
OPENAI_API_KEY=
```

The Google Ads Keyword Planner integration is still separate. This patch improves the existing internal automation while Google Ads API setup is pending.
