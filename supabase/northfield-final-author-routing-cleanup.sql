-- Northfield Journal final deterministic author cleanup
-- Run after deploying lib/seo-authors.ts.
-- Priority order: Dr. Samuel Brooks > Mark Reyes > Aisha Patel > Laura Bennett > Emily Carter.
-- Broad parent/general terms are checked against title/excerpt/keywords only, not full body text.

with source_text as (
  select
    id,
    lower(coalesce(title, '') || ' ' || coalesce(excerpt, '') || ' ' || array_to_string(coalesce(keywords, array[]::text[]), ' ')) as primary_text,
    lower(coalesce(content, '')) as body_text
  from posts
), routed as (
  select
    id,
    case
      when (primary_text || ' ' || body_text) ~ '(learning disabilit|learning difference|inclusive education|inclusive classroom|inclusion|diverse learner|neurodiverse|neurodiversity|special education|special needs|\biep\b|504 plan|\b504\b|accommodation|adhd|dyslexia|autism|individualized education|differentiated instruction|assistive technology|struggling reader|dyscalculia|dysgraphia)' then 'Dr. Samuel Brooks'
      when primary_text ~ '(essay|essays|essay writing|academic writing|writing assignment|thesis|thesis statement|research paper|citation|citations|bibliography|outline|outlining|paragraph|introduction|conclusion|drafting|revision writing)' then 'Mark Reyes'
      when primary_text ~ '(exam|exams|exam prep|exam preparation|test prep|test preparation|revision|study schedule|\bsat\b|\bact\b|gcse|finals|midterms|assessment|practice test|mock exam|standardized test|test anxiety|exam anxiety|test taking|test-taking)' then 'Aisha Patel'
      when primary_text ~ '(parent|parents|parenting|parent guide|parents guide|homework|homework help|supporting homework|homeschool|home school|family learning|families|guardian|guardians|at home|at-home|home learning|help your child|helping your child|support your child|supporting your child|child homework|children homework)' then 'Laura Bennett'
      else 'Emily Carter'
    end as author_name,
    case
      when (primary_text || ' ' || body_text) ~ '(learning disabilit|learning difference|inclusive education|inclusive classroom|inclusion|diverse learner|neurodiverse|neurodiversity|special education|special needs|\biep\b|504 plan|\b504\b|accommodation|adhd|dyslexia|autism|individualized education|differentiated instruction|assistive technology|struggling reader|dyscalculia|dysgraphia)' then 'Dr. Samuel Brooks focuses on inclusive education, learning differences, classroom accommodations, IEP support, ADHD, dyslexia, and practical support for diverse learners.'
      when primary_text ~ '(essay|essays|essay writing|academic writing|writing assignment|thesis|thesis statement|research paper|citation|citations|bibliography|outline|outlining|paragraph|introduction|conclusion|drafting|revision writing)' then 'Mark Reyes covers academic writing, essays, research projects, thesis statements, citations, outlines, and practical ways students can communicate ideas clearly.'
      when primary_text ~ '(exam|exams|exam prep|exam preparation|test prep|test preparation|revision|study schedule|\bsat\b|\bact\b|gcse|finals|midterms|assessment|practice test|mock exam|standardized test|test anxiety|exam anxiety|test taking|test-taking)' then 'Aisha Patel writes about exam preparation, revision planning, study schedules, test confidence, and practical strategies for performing well under pressure.'
      when primary_text ~ '(parent|parents|parenting|parent guide|parents guide|homework|homework help|supporting homework|homeschool|home school|family learning|families|guardian|guardians|at home|at-home|home learning|help your child|helping your child|support your child|supporting your child|child homework|children homework)' then 'Laura Bennett writes practical guides for parents on homework routines, school support, homeschooling, and helping children build confidence as learners.'
      else 'Emily Carter writes about study skills, learning systems, productivity, motivation, and academic improvement for students and lifelong learners.'
    end as author_bio,
    case
      when (primary_text || ' ' || body_text) ~ '(learning disabilit|learning difference|inclusive education|inclusive classroom|inclusion|diverse learner|neurodiverse|neurodiversity|special education|special needs|\biep\b|504 plan|\b504\b|accommodation|adhd|dyslexia|autism|individualized education|differentiated instruction|assistive technology|struggling reader|dyscalculia|dysgraphia)' then 'author_sb_learning_differences_and_inclusive_education'
      when primary_text ~ '(essay|essays|essay writing|academic writing|writing assignment|thesis|thesis statement|research paper|citation|citations|bibliography|outline|outlining|paragraph|introduction|conclusion|drafting|revision writing)' then 'author_mr_academic_writing_and_research'
      when primary_text ~ '(exam|exams|exam prep|exam preparation|test prep|test preparation|revision|study schedule|\bsat\b|\bact\b|gcse|finals|midterms|assessment|practice test|mock exam|standardized test|test anxiety|exam anxiety|test taking|test-taking)' then 'author_ap_exam_preparation_and_test_performance'
      when primary_text ~ '(parent|parents|parenting|parent guide|parents guide|homework|homework help|supporting homework|homeschool|home school|family learning|families|guardian|guardians|at home|at-home|home learning|help your child|helping your child|support your child|supporting your child|child homework|children homework)' then 'author_lb_parent_and_at_home_learning_support'
      else 'author_ec_study_skills_and_general_student_success'
    end as generation_status
  from source_text
)
update posts p
set
  author_name = routed.author_name,
  author_bio = routed.author_bio,
  generation_status = routed.generation_status,
  updated_at = now()
from routed
where p.id = routed.id;

select author_name, count(*)
from posts
group by author_name
order by author_name;
