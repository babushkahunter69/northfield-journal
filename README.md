# Northfield Journal link/content integrity patch

Drop these files into the project:

- `lib/content/repairInternalLinks.ts`
- `lib/ai/improve-article.ts`

Then run:

```bash
rm -rf .next
npm run build
```

Run this SQL once in Supabase SQL Editor:

```text
supabase/northfield-clean-all-generated-internal-links.sql
```

The SQL is safe to run more than once. It removes generated related-reading snippets and known fake internal links across all posts.
