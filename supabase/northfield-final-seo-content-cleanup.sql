-- Northfield Journal final content cleanup
-- Run once after deploying the technical SEO/content-quality patch.
-- This removes old generated related-reading filler and obvious duplicated markdown artifacts.

update posts
set content = regexp_replace(
  content,
  '(Related reading|Recommended reading|Further reading):[^\n\.]+(\.|\n|$)',
  '',
  'gi'
)
where content ~* '(Related reading|Recommended reading|Further reading):';

update posts
set content = regexp_replace(
  content,
  'For more (advice|guidance|support)[^\n\.]*?(see|explore)[^\n\.]+(\.|\n|$)',
  '',
  'gi'
)
where content ~* 'For more (advice|guidance|support)';

update posts
set content = regexp_replace(
  content,
  '[^\.!\?]*\m(building motivation in students|effective parent-teacher communication|time management for students|effective study habits|guest post opportunities|more education guides)\M[^\.!\?]*[\.!\?]',
  '',
  'gi'
)
where content ~* '(building motivation in students|effective parent-teacher communication|time management for students|effective study habits|guest post opportunities|more education guides)';

update posts
set content = regexp_replace(
  content,
  '<h2[^>]*>\s*(Additional Resources|Related Resources|Related Reading)\s*</h2>[\s\S]*?(?=<h2|$)',
  '',
  'gi'
)
where content ~* '(Additional Resources|Related Resources|Related Reading)';

update posts
set content = regexp_replace(
  content,
  '^##\s*(Additional Resources|Related Resources|Related Reading)[\s\S]*?(?=^##\s+|$)',
  '',
  'gim'
)
where content ~* '(Additional Resources|Related Resources|Related Reading)';

update posts
set content = regexp_replace(content, '\n{3,}', E'\n\n', 'g')
where content ~ '\n{3,}';

update posts
set updated_at = now()
where content ~* '(Related reading|Recommended reading|Further reading|Additional Resources|Related Resources|building motivation in students|effective parent-teacher communication|time management for students|effective study habits|guest post opportunities|more education guides)';
