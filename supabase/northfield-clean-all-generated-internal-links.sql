-- Northfield Journal: one-click cleanup for generated/broken internal-link text across ALL posts.
-- Safe to run more than once.
-- It removes AI-generated related-reading snippets and the known broken fake link phrases
-- that were causing /blog/404 pages.

begin;

-- Remove whole HTML paragraphs that start like generated internal-link helper text.
update posts
set content = regexp_replace(
  content,
  '<p[^>]*>\s*(Related reading|Recommended reading|Further reading):[\s\S]*?</p>',
  '',
  'gi'
)
where content ~* '<p[^>]*>\s*(Related reading|Recommended reading|Further reading):';

update posts
set content = regexp_replace(
  content,
  '<p[^>]*>\s*For more (advice|guidance|support)[\s\S]*?</p>',
  '',
  'gi'
)
where content ~* '<p[^>]*>\s*For more (advice|guidance|support)';

-- Remove plain text related-reading sentences.
update posts
set content = regexp_replace(
  content,
  '(Related reading|Recommended reading|Further reading):[^\n.]+(\.|\n|$)',
  '',
  'gi'
)
where content ~* '(Related reading|Recommended reading|Further reading):';

-- Remove plain text generated "for more ... see/explore ..." sentences.
update posts
set content = regexp_replace(
  content,
  'For more (advice|guidance|support)[^\n.]*?(see|explore)[^\n.]+(\.|\n|$)',
  '',
  'gi'
)
where content ~* 'For more (advice|guidance|support)';

-- Remove known fake generated-link phrases, including when they are wrapped in anchors.
update posts
set content = regexp_replace(
  content,
  '<a[^>]*href=[''\"]([^''\"]*)?(building-motivation-in-students|effective-parent-teacher-communication|time-management-for-students|effective-study-habits)[^''\"]*[''\"][^>]*>[\s\S]*?</a>',
  '',
  'gi'
)
where content ~* '(building-motivation-in-students|effective-parent-teacher-communication|time-management-for-students|effective-study-habits)';

update posts
set content = regexp_replace(
  content,
  '\[[^\]]*\]\(([^)]*)?(building-motivation-in-students|effective-parent-teacher-communication|time-management-for-students|effective-study-habits)[^)]*\)',
  '',
  'gi'
)
where content ~* '(building-motivation-in-students|effective-parent-teacher-communication|time-management-for-students|effective-study-habits)';

-- Remove sentences containing known fake generated link labels.
update posts
set content = regexp_replace(
  content,
  '[^.!?]*(building motivation in students|effective parent-teacher communication|time management for students|effective study habits)[^.!?]*[.!?]',
  '',
  'gi'
)
where content ~* '(building motivation in students|effective parent-teacher communication|time management for students|effective study habits)';

-- Last-resort phrase cleanup if a phrase remains outside sentence punctuation.
update posts
set content = regexp_replace(
  content,
  '(building motivation in students|effective parent-teacher communication|time management for students|effective study habits)',
  '',
  'gi'
)
where content ~* '(building motivation in students|effective parent-teacher communication|time management for students|effective study habits)';

-- Remove repeated blank paragraphs/extra whitespace left by cleanup.
update posts
set content = regexp_replace(content, '<p>\s*</p>', '', 'gi')
where content ~* '<p>\s*</p>';

update posts
set content = regexp_replace(content, E'\n{3,}', E'\n\n', 'g')
where content ~ E'\n{3,}';

update posts
set updated_at = now()
where content ~* '(Related reading|Recommended reading|Further reading|For more (advice|guidance|support)|building motivation in students|effective parent-teacher communication|time management for students|effective study habits|building-motivation-in-students|effective-parent-teacher-communication|time-management-for-students|effective-study-habits)';

commit;

-- Quick verification. This should return 0 rows if cleanup worked.
select slug, title
from posts
where content ~* '(Related reading|Recommended reading|Further reading|building motivation in students|effective parent-teacher communication|time management for students|effective study habits|building-motivation-in-students|effective-parent-teacher-communication|time-management-for-students|effective-study-habits)'
order by updated_at desc;
