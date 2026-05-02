-- Northfield Journal cleanup for old AI-slop content.
-- Run once after deploying the no-slop improve flow.
-- This removes common generated related-reading junk and obvious duplicated headings.

update posts
set content = regexp_replace(
  content,
  '(Related reading|Recommended reading|Further reading):[^\n.]+(\.|\n|$)',
  '',
  'gi'
)
where content ~* '(Related reading|Recommended reading|Further reading):';

update posts
set content = regexp_replace(
  content,
  'For more (advice|guidance|support)[^\n.]+(see|explore)[^\n.]+(\.|\n|$)',
  '',
  'gi'
)
where content ~* 'For more (advice|guidance|support)';

update posts
set content = regexp_replace(
  content,
  '(building motivation in students|effective parent-teacher communication|time management for students|effective study habits)',
  '',
  'gi'
)
where content ~* '(building motivation in students|effective parent-teacher communication|time management for students|effective study habits)';

update posts
set content = regexp_replace(
  content,
  '(<h2[^>]*>Start with the learner''s current challenge</h2>\s*){2,}',
  '<h2>Start with the learner''s current challenge</h2>',
  'gi'
)
where content ~* 'Start with the learner''s current challenge';

update posts
set content = regexp_replace(
  content,
  '(<h2[^>]*>Final quality check</h2>\s*<p[^>]*>[^<]+</p>\s*){2,}',
  '<h2>Final quality check</h2>',
  'gi'
)
where content ~* 'Final quality check';
