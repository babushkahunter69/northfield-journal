-- Aggressive one-time cleanup for generated/fallback internal-link snippets.
-- Safe to run more than once. It removes generated related-reading sentences/paragraphs,
-- but leaves normal article content alone.

update posts
set content = regexp_replace(
  content,
  '(?is)<p[^>]*>\s*(related reading|recommended reading|further reading):.*?</p>',
  '',
  'g'
)
where content ~* '(related reading|recommended reading|further reading)';

update posts
set content = regexp_replace(
  content,
  '(?is)<p[^>]*>\s*for more (advice|guidance|support).*?</p>',
  '',
  'g'
)
where content ~* 'for more (advice|guidance|support)';

update posts
set content = regexp_replace(
  content,
  '(?i)related reading:\s*[^\n.]+\.?',
  '',
  'g'
)
where content ~* 'related reading:';

update posts
set content = regexp_replace(
  content,
  '(?i)for more (advice|guidance|support)[^\n.]*?(see|explore)[^\n.]+\.?',
  '',
  'g'
)
where content ~* 'for more (advice|guidance|support)';

-- Specific cleanup for the article currently showing broken generated links.
update posts
set content = regexp_replace(
  content,
  '(?i)\s*For more advice on communication with educators,\s*see\s*effective parent-teacher communication\.?',
  '',
  'g'
)
where slug = 'practical-strategies-to-foster-effective-study-habits-in-middle-school';

update posts
set content = regexp_replace(
  content,
  '(?i)\s*They also encouraged her to use a digital planner recommended in building motivation in students to keep track of tasks\.',
  ' They also encouraged her to use a digital planner to keep track of tasks.',
  'g'
)
where slug = 'practical-strategies-to-foster-effective-study-habits-in-middle-school';
