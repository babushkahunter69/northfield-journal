# Northfield content integrity fix

This patch fixes two issues found in generated/improved articles:

1. Repeated padding paragraphs
   - The deterministic article expander no longer loops the same paragraph until it reaches the word target.
   - A duplicate paragraph cleanup is now applied after improvement and during repair.

2. Broken internal links
   - Internal links are validated against real published posts.
   - Bad `/slug` article links are either converted to `/blog/slug` when the post exists, or unlinked when it does not.
   - The repair route no longer references missing `category` or `category_slug` columns.
   - The repair route supports logged-in browser GET and POST.

After replacing files:

```bash
rm -rf .next
npm run build
```

To clean existing articles while logged into admin, open:

```text
http://localhost:3000/api/admin/repair-internal-links
```

Or run POST with an authenticated request from the admin UI. The route still requires the admin cookie.
