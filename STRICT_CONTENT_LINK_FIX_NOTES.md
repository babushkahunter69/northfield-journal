# Northfield strict content/link fix

This patch makes internal-link repair clean-only:

- Removes broken HTML internal links.
- Removes broken Markdown internal links.
- Removes whole generated `Related reading:` and `For more support, explore...` paragraphs when they contain invalid targets.
- Converts valid bare article links like `/slug` to `/blog/slug`.
- Stops the repair route from adding replacement links automatically.
- Keeps the repeated-paragraph cleanup for generated filler sections.

After installing, run the repair route while logged in as admin:

```text
http://localhost:3000/api/admin/repair-internal-links
```

Then check the affected article again.
