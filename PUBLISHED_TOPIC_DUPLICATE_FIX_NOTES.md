# Published Topic Duplicate Guard Fix

This patch strengthens keyword generation and cleanup so approved/queued keywords are compared against already-published post intent, not only exact keyword strings.

## What changed

- Added semantic topic aliases in `lib/content/duplicate-guard.ts` for common Northfield Journal clusters:
  - research papers
  - study/homework routines
  - time management
  - note taking
  - exam prep and exam stress
  - formative assessment
  - parent-teacher conferences
  - reading comprehension
  - phonemic awareness
  - fractions
  - differentiated instruction
  - dyslexia support
  - classroom participation
  - science fair
  - student organization
  - career readiness
  - homeschool schedules
  - AI plagiarism
- `findExistingPostForTopic()` now checks:
  - exact keyword match
  - slug match
  - semantic topic overlap
  - keyword intent key match
  - near-duplicate title intent
  - stricter title/excerpt similarity
- `Clean Duplicates` now removes active review/queued keywords that already match a published post topic.
- Removed keywords are saved to `content_keyword_blocks` so they do not come back.

## After deploy

1. Open `/admin/automation`
2. Click `Clean Duplicates`
3. It should delete keywords that overlap with published article intent
4. Click `Generate Keywords`
5. New keywords should be checked against published post topics before appearing

This is still a fallback duplicate guard while Google Ads Keyword Planner access is pending.
