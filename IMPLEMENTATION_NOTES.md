# Northfield Journal automation setup

## Added features
- Daily draft cron route at `/api/cron/daily-draft`
- AI brief + article generation utilities
- Branded stock cover generation uploaded to Supabase storage
- Admin keyword queue and draft queue screens
- Functional admin image upload route
- Extra post fields for automation metadata and FAQs
- Vercel cron config and `.env.example`

## Environment variables
See `.env.example`.

## Run order
1. Apply `supabase/schema.sql`
2. Set env vars
3. Deploy to Vercel
4. Verify `/admin/keywords`
5. Add `CRON_SECRET` in Vercel and use same secret for cron route
6. Test `/api/cron/daily-draft` with Bearer auth

## Admin URLs
- `/admin/posts`
- `/admin/queue`
- `/admin/keywords`

## Main new files
- `lib/ai/client.ts`
- `lib/ai/generate-brief.ts`
- `lib/ai/generate-article.ts`
- `lib/content/queue.ts`
- `lib/cover/templates.ts`
- `lib/cover/create-cover.ts`
- `app/api/cron/daily-draft/route.ts`
- `app/api/admin/keywords/route.ts`
- `app/api/admin/generate-draft/route.ts`
- `app/api/admin/generate-cover/route.ts`
- `app/admin/(dashboard)/queue/page.tsx`
- `app/admin/(dashboard)/keywords/page.tsx`
- `components/admin/queue-table.tsx`
- `components/admin/keyword-manager.tsx`

## Updated existing files
- `components/admin/post-editor.tsx`
- `components/admin/admin-sidebar.tsx`
- `app/api/admin/posts/route.ts`
- `app/api/admin/upload-image/route.ts`
- `lib/types.ts`
- `supabase/schema.sql`
- `vercel.json`
- `.env.example`
