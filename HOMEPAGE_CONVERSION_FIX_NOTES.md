# Homepage Conversion and UX Fix

This patch addresses the Favors.dev audit issues:

- Adds an above-the-fold newsletter email capture form in the hero.
- Makes newsletter signup the primary CTA.
- Removes the competing hero CTA for guest submissions.
- Keeps a secondary Browse Articles link.
- Removes the duplicated Featured Stories section so Latest Articles is the only dynamic article feed on the homepage.
- Replaces vague fallback label "Subjects" with "Education".
- Keeps the existing Supabase newsletter endpoint and persists subscribers to `newsletter_subscribers`.

Validation:

- `npx tsc --noEmit` passed.
- `next build` compiled and type-checked successfully, but the sandbox timed out during page-data collection because the build reads live data. Vercel should complete it with production environment access.
