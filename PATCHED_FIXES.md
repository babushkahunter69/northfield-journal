# Patched fixes

- Made `getSiteUrl()` fall back to `https://www.northfieldjournal.com` instead of localhost.
- Changed the root layout to use `getSiteUrl()` so metadata/canonicals match the production env var.
- Made sitemap generation safe if Supabase/post loading fails, so static pages still appear instead of failing.
- Removed the robots.txt query-string block that can cause SEO scanners to miss crawlable pages.
- Added canonical metadata and favicon metadata.
- Added `public/favicon.svg`.

After deploying, verify `/robots.txt` and `/sitemap.xml` on the canonical live domain. SPF, DKIM, and DMARC still must be fixed in DNS, not in the codebase.
- Updated the admin logout route to use the canonical site URL helper instead of `http://localhost:3000`.
