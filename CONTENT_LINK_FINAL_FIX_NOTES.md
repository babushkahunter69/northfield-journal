# Northfield content integrity final fix

This patch removes the last fallback behavior that created broken internal links and prevents repeated filler paragraphs from being added to article endings.

Changes:
- Internal links are only inserted when the target is a verified public post.
- A post is considered public only when `status = published` or `published = true`.
- Bad bare slug links such as `/building-motivation-in-students` are removed or canonicalized to `/blog/{slug}` only when the target is public.
- The one-click fixer no longer invents generic fallback links.
- The deterministic length fixer no longer repeats the same final-quality paragraph.
- Existing duplicate paragraphs are removed by the repair route.

Run after applying:

```bash
rm -rf .next
npm run build
```

Then, while logged into admin, open:

```text
http://localhost:3000/api/admin/repair-internal-links
```

If using curl, keep the auth block temporarily disabled only on local, run the POST, then restore it.
