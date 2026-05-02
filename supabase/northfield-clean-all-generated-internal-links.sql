-- Northfield Journal: remove generated fake internal-link text from all posts.
-- Safe to run more than once.

update posts
set content = regexp_replace(
  content,
  '<a[^>]+href=["''](?:https?://(?:www\.)?northfieldjournal\.com)?/(?:blog/)?(?:building-motivation-in-students|effective-parent-teacher-communication|time-management-for-students|effective-study-habits)["''][^>]*>(.*?)</a>',
  '\1',
  'gi'
)
where content ~* '(building-motivation-in-students|effective-parent-teacher-communication|time-management-for-students|effective-study-habits)';

update posts
set content = regexp_replace(
  content,
  '\[([^\]]+)\]\((?:https?://(?:www\.)?northfieldjournal\.com)?/(?:blog/)?(?:building-motivation-in-students|effective-parent-teacher-communication|time-management-for-students|effective-study-habits)\)',
  '\1',
  'gi'
)
where content ~* '(building-motivation-in-students|effective-parent-teacher-communication|time-management-for-students|effective-study-habits)';

update posts
set content = regexp_replace(
  content,
  'Related reading:\s*[^\n.]*?(building motivation in students|effective parent-teacher communication|time management for students|effective study habits)[^\n.]*\.?',
  '',
  'gi'
)
where content ~* 'Related reading:';

update posts
set content = regexp_replace(
  content,
  '[^.!?]*(building motivation in students|effective parent-teacher communication|time management for students|effective study habits)[^.!?]*[.!?]',
  '',
  'gi'
)
where content ~* '(building motivation in students|effective parent-teacher communication|time management for students|effective study habits)';

update posts
set content = regexp_replace(
  content,
  'For more[^.!?]*(more education guides|guest post opportunities|Northfield Journal)[^.!?]*[.!?]',
  '',
  'gi'
)
where content ~* '(more education guides|guest post opportunities)';

update posts
set content = regexp_replace(content, E'\n{3,}', E'\n\n', 'g'),
    updated_at = now()
where content ~* '(building motivation in students|effective parent-teacher communication|time management for students|effective study habits|more education guides|guest post opportunities|Related reading:)';
