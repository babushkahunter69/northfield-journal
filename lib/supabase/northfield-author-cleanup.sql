-- Northfield Journal author cleanup and category-based assignment.
-- Run this once in Supabase SQL editor to fix existing posts.

update posts
set
  author_name = case
    when lower(coalesce(title, '') || ' ' || coalesce(meta_title, '') || ' ' || coalesce(excerpt, '')) similar to '%(special education|inclusive|learning difference|learning disability|dyslexia|adhd|autism|iep|504|accommodation|intervention|struggling learner)%'
      then 'Dr. Samuel Brooks'
    when lower(coalesce(title, '') || ' ' || coalesce(meta_title, '') || ' ' || coalesce(excerpt, '')) similar to '%(parent|parents|homework|homeschool|home school|family|guardian|child|children)%'
      then 'Laura Bennett'
    when lower(coalesce(title, '') || ' ' || coalesce(meta_title, '') || ' ' || coalesce(excerpt, '')) similar to '%(exam|test|revision|finals|assessment|quiz|sat|act|gcse|test anxiety)%'
      then 'Aisha Patel'
    when lower(coalesce(title, '') || ' ' || coalesce(meta_title, '') || ' ' || coalesce(excerpt, '')) similar to '%(essay|writing|thesis|research|paper|assignment|citation|outline|paragraph)%'
      then 'Mark Reyes'
    else 'Emily Carter'
  end,
  author_bio = case
    when lower(coalesce(title, '') || ' ' || coalesce(meta_title, '') || ' ' || coalesce(excerpt, '')) similar to '%(special education|inclusive|learning difference|learning disability|dyslexia|adhd|autism|iep|504|accommodation|intervention|struggling learner)%'
      then 'Dr. Samuel Brooks focuses on inclusive education, learning differences, classroom accommodations, and practical support for diverse learners.'
    when lower(coalesce(title, '') || ' ' || coalesce(meta_title, '') || ' ' || coalesce(excerpt, '')) similar to '%(parent|parents|homework|homeschool|home school|family|guardian|child|children)%'
      then 'Laura Bennett writes practical guides for parents on homework routines, school support, homeschooling, and helping children build confidence as learners.'
    when lower(coalesce(title, '') || ' ' || coalesce(meta_title, '') || ' ' || coalesce(excerpt, '')) similar to '%(exam|test|revision|finals|assessment|quiz|sat|act|gcse|test anxiety)%'
      then 'Aisha Patel writes about exam preparation, revision planning, test confidence, and practical strategies for performing well under pressure.'
    when lower(coalesce(title, '') || ' ' || coalesce(meta_title, '') || ' ' || coalesce(excerpt, '')) similar to '%(essay|writing|thesis|research|paper|assignment|citation|outline|paragraph)%'
      then 'Mark Reyes covers academic writing, essays, research projects, thesis statements, and practical ways students can communicate ideas clearly.'
    else 'Emily Carter writes about study skills, learning systems, productivity, and academic improvement for students and lifelong learners.'
  end,
  updated_at = now()
where
  author_name is null
  or author_bio is null
  or lower(author_name) like '%editorial%'
  or lower(author_name) like '%northfield journal%'
  or (
    author_name = 'Mark Reyes'
    and lower(coalesce(author_bio, '')) like '%emily carter%'
  )
  or (
    author_name = 'Emily Carter'
    and lower(coalesce(title, '') || ' ' || coalesce(meta_title, '') || ' ' || coalesce(excerpt, '')) similar to '%(parent|parents|homework|homeschool|exam|test|revision|essay|writing|thesis|research|special education|inclusive|learning difference|dyslexia|adhd|iep|accommodation)%'
  );

select author_name, count(*) as post_count
from posts
group by author_name
order by post_count desc, author_name;
