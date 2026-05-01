-- Northfield Journal deterministic author cleanup
-- Run after deploying the author routing patch.
-- This aligns existing published/draft posts with the same keyword/content rules used by the app.

update posts
set
  author_name = 'Dr. Samuel Brooks',
  author_bio = 'Dr. Samuel Brooks focuses on inclusive education, learning differences, classroom accommodations, IEP support, ADHD, dyslexia, and practical support for diverse learners.',
  updated_at = now()
where lower(coalesce(title, '') || ' ' || coalesce(excerpt, '') || ' ' || coalesce(content, '') || ' ' || array_to_string(coalesce(keywords, array[]::text[]), ' ')) ~
  '(learning disabilit|learning difference|inclusive education|inclusion|diverse learner|neurodiverse|special education|special needs|\biep\b|504 plan|accommodation|adhd|dyslexia|autism|individualized education|differentiated instruction|assistive technology)';

update posts
set
  author_name = 'Laura Bennett',
  author_bio = 'Laura Bennett writes practical guides for parents on homework routines, school support, homeschooling, and helping children build confidence as learners.',
  updated_at = now()
where lower(coalesce(title, '') || ' ' || coalesce(excerpt, '') || ' ' || coalesce(content, '') || ' ' || array_to_string(coalesce(keywords, array[]::text[]), ' ')) ~
  '(parent|parents|parenting|homework|homeschool|home school|family|families|guardian|child|children|at home|home learning|help your child)'
  and not lower(coalesce(title, '') || ' ' || coalesce(excerpt, '') || ' ' || coalesce(content, '') || ' ' || array_to_string(coalesce(keywords, array[]::text[]), ' ')) ~
  '(learning disabilit|learning difference|inclusive education|inclusion|diverse learner|neurodiverse|special education|special needs|\biep\b|504 plan|accommodation|adhd|dyslexia|autism|individualized education|differentiated instruction|assistive technology)';

update posts
set
  author_name = 'Aisha Patel',
  author_bio = 'Aisha Patel writes about exam preparation, revision planning, study schedules, test confidence, and practical strategies for performing well under pressure.',
  updated_at = now()
where lower(coalesce(title, '') || ' ' || coalesce(excerpt, '') || ' ' || coalesce(content, '') || ' ' || array_to_string(coalesce(keywords, array[]::text[]), ' ')) ~
  '(exam|exams|test prep|exam prep|revision|study schedule|sat|act|gcse|finals|midterms|assessment|practice test|test anxiety|exam anxiety|standardized test)'
  and not lower(coalesce(title, '') || ' ' || coalesce(excerpt, '') || ' ' || coalesce(content, '') || ' ' || array_to_string(coalesce(keywords, array[]::text[]), ' ')) ~
  '(learning disabilit|learning difference|inclusive education|inclusion|diverse learner|neurodiverse|special education|special needs|\biep\b|504 plan|accommodation|adhd|dyslexia|autism|individualized education|differentiated instruction|assistive technology|parent|parents|parenting|homework|homeschool|home school|family|families|guardian|child|children|at home|home learning|help your child)';

update posts
set
  author_name = 'Mark Reyes',
  author_bio = 'Mark Reyes covers academic writing, essays, research projects, thesis statements, citations, outlines, and practical ways students can communicate ideas clearly.',
  updated_at = now()
where lower(coalesce(title, '') || ' ' || coalesce(excerpt, '') || ' ' || coalesce(content, '') || ' ' || array_to_string(coalesce(keywords, array[]::text[]), ' ')) ~
  '(essay|essays|academic writing|thesis|thesis statement|research paper|citation|bibliography|outline|paragraph|introduction|conclusion)'
  and not lower(coalesce(title, '') || ' ' || coalesce(excerpt, '') || ' ' || coalesce(content, '') || ' ' || array_to_string(coalesce(keywords, array[]::text[]), ' ')) ~
  '(learning disabilit|learning difference|inclusive education|inclusion|diverse learner|neurodiverse|special education|special needs|\biep\b|504 plan|accommodation|adhd|dyslexia|autism|individualized education|differentiated instruction|assistive technology|parent|parents|parenting|homework|homeschool|home school|family|families|guardian|child|children|at home|home learning|help your child|exam|exams|test prep|exam prep|revision|sat|act|gcse|finals|midterms|assessment|practice test|test anxiety|exam anxiety|standardized test)';

update posts
set
  author_name = 'Emily Carter',
  author_bio = 'Emily Carter writes about study skills, learning systems, productivity, motivation, and academic improvement for students and lifelong learners.',
  updated_at = now()
where lower(coalesce(title, '') || ' ' || coalesce(excerpt, '') || ' ' || coalesce(content, '') || ' ' || array_to_string(coalesce(keywords, array[]::text[]), ' ')) ~
  '(study skills|study habits|study effectively|student success|motivation|focus|productivity|time management|memory|note taking|notetaking|learning habits|learning systems|active recall|spaced repetition|organization|academic improvement)'
  and not lower(coalesce(title, '') || ' ' || coalesce(excerpt, '') || ' ' || coalesce(content, '') || ' ' || array_to_string(coalesce(keywords, array[]::text[]), ' ')) ~
  '(learning disabilit|learning difference|inclusive education|inclusion|diverse learner|neurodiverse|special education|special needs|\biep\b|504 plan|accommodation|adhd|dyslexia|autism|individualized education|differentiated instruction|assistive technology|parent|parents|parenting|homework|homeschool|home school|family|families|guardian|child|children|at home|home learning|help your child|exam|exams|test prep|exam prep|revision|sat|act|gcse|finals|midterms|assessment|practice test|test anxiety|exam anxiety|standardized test|essay|essays|academic writing|thesis|thesis statement|research paper|citation|bibliography|outline|paragraph|introduction|conclusion)';

select author_name, count(*)
from posts
group by author_name
order by author_name;
