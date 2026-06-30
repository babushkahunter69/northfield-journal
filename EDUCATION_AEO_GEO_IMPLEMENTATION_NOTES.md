# Education AEO/GEO Implementation Notes

Implemented safely for Northfield Journal as an education-focused website.

## What changed

1. Article normalization now automatically adds education-friendly AEO structure:
   - Quick Answer
   - Quick Summary
   - Table of Contents
   - Classroom Application
   - FAQ preservation

2. Existing generated and improved articles are normalized through the same SEO finalizer, so admin repair/improve/regenerate flows now receive the same structure.

3. AI article generation prompt was updated for the education niche, not SEO/digital marketing:
   - direct answer section
   - practical classroom examples
   - student, teacher, and parent use cases
   - classroom application section

4. Structured data was expanded:
   - Organization
   - WebSite with SearchAction
   - Person
   - Article
   - LearningResource
   - FAQPage
   - BreadcrumbList

5. LearningResource schema is inferred conservatively from article content:
   - educational level
   - learning resource type
   - educational audience
   - educational use

## Files changed

- lib/seo/finalize-article.ts
- lib/ai/generate-article.ts
- lib/data.ts

## Validation

- TypeScript check passed with `./node_modules/.bin/tsc --noEmit`.
- Full `npm run build` could not be completed in this sandbox because Next attempted to download SWC and npm registry access is blocked here.
