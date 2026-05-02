# Northfield Journal internal link + content integrity fix

This patch is stricter than the prior cleanup.

It adds:

- `lib/content/repairInternalLinks.ts`
- a patched `lib/content/internal-links.ts`
- a patched `lib/ai/improve-article.ts`
- a patched `app/api/admin/repair-internal-links/route.ts`
- one aggressive Supabase cleanup SQL file

## What it fixes

- Removes generated fallback sections such as `Related reading:` and `For more advice... see...`.
- Unlinks internal links unless the target slug exists as a published/live post.
- Canonicalizes valid article links to `/blog/{slug}`.
- Removes repeated filler paragraphs.
- Stops the article improver from inventing related-reading links.
- Cleans AI output after rewriting, so even if AI tries to add bad links they are removed before save.

## After copying files

```bash
rm -rf .next
npm run build
npm run dev
```

Then run this SQL once in Supabase:

```text
supabase/northfield-force-remove-generated-related-links.sql
```

Then, while logged into admin, open:

```text
http://localhost:3000/api/admin/repair-internal-links
```

If you are running the route with curl, use browser cookies or temporarily disable the auth check, then restore it.
