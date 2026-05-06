-- Northfield Journal: remove old AI-generated external source blocks that may contain dead/404 links.
-- Run once after deploying the external-link validation patch.

update posts
set content = regexp_replace(
  content,
  '<h2[^>]*>\s*(Sources|Related Resources|Additional Resources|References)\s*</h2>[\s\S]*?(?=<h2[^>]*>|$)',
  '',
  'gi'
)
where content ~* '<h2[^>]*>\s*(Sources|Related Resources|Additional Resources|References)\s*</h2>';

update posts
set content = regexp_replace(
  content,
  E'(^|\\n)#{2,3}\\s*(Sources|Related Resources|Additional Resources|References)[\\s\\S]*?(?=\\n#{2,3}\\s|$)',
  E'\\n',
  'gi'
)
where content ~* E'(^|\\n)#{2,3}\\s*(Sources|Related Resources|Additional Resources|References)';

-- Remove the specific broken source labels already seen in generated articles if they were embedded mid-paragraph.
update posts
set content = regexp_replace(
  content,
  '(Understood\.org:\s*How to Help Your Child Catch Up in School|Edutopia:\s*Supporting Students Who Fall Behind|Edutopia:\s*5 Study Strategies Research Supports|American Psychological Association:\s*Study Skills for Students)',
  '',
  'gi'
)
where content ~* '(Understood\.org:\s*How to Help Your Child Catch Up in School|Edutopia:\s*Supporting Students Who Fall Behind|Edutopia:\s*5 Study Strategies Research Supports|American Psychological Association:\s*Study Skills for Students)';
