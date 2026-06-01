# Improve Failed Checks Fix

This patch changes the post editor improvement flow so the button is safer to use and does not spend AI credits unnecessarily.

## Changed

- `Improve Failed Checks` now tries local deterministic fixes first.
- AI is used at most once per button click, only if local fixes cannot pass the checklist.
- After the optional single AI pass, the route only runs local cleanup passes.
- Missing or generic stock-host featured images are replaced with a generated owned SVG cover during the same improvement run.
- The API response now reports whether AI was used and whether a cover was generated.
- The admin toast now shows whether the fix used AI or local-only checks.

## Files changed

- `lib/ai/improve-article.ts`
- `app/api/admin/improve-post/route.ts`
- `components/admin/post-editor.tsx`

## Important

The button can now fix the common checklist failures in one run:

- title length
- meta title length
- meta description length
- keyword placement
- internal links
- FAQ
- headings/structure
- examples
- conclusion/next steps
- robotic filler phrases
- duplicate sections
- minimum word count
- missing or generic featured image

If it still fails after one run, the remaining failed items are likely caused by missing data, database/storage permissions, or an editorial rule that needs a code-level change rather than another AI rewrite.
