# Keyword Exhaustion Fix

This patch expands the fallback keyword source while Google Ads API Basic Access is still pending.

## Fixed

- The internal keyword generator no longer depends on a small finite seed bank.
- Added a larger dynamic education keyword matrix across topics, audiences, grade bands, and search intents.
- Blank focus now produces thousands of candidate keyword intents before filtering.
- Existing active keywords, rejected/blocklisted keywords, and already-published post topics are still checked before insert.

## Why this was needed

The site had already drafted or blocked most of the small internal keyword pool, so new generations returned zero keywords with the message that all generated keywords already existed or matched existing posts.

This keeps the site running until Google Ads Keyword Planner access is approved and integrated.
