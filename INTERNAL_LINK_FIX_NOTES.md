# Northfield Journal Internal Link Integrity Fix

This patch prevents the SEO/improve workflow from creating internal links to blog posts that do not exist.

What changed:
- Internal links are now selected from real published posts in Supabase.
- Imaginary `/blog/...` suggestions from briefs are no longer trusted.
- The improve/fix SEO routes clean broken blog links before saving.
- Added an admin repair endpoint to clean existing posts.

After deploying, run this once while logged in as admin:

```bash
curl -X POST https://northfieldjournal.com/api/admin/repair-internal-links \
  -H "Cookie: admin_auth=YOUR_ADMIN_COOKIE"
```

Simpler option:
- Open the live admin in your browser.
- Use the browser console or API client to send a POST request to `/api/admin/repair-internal-links`.

The endpoint returns how many posts were checked and repaired.
