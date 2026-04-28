-- Northfield author cleanup and assignment.
-- Run this in the Northfield Supabase SQL editor if old editorial names are still stored in posts.
-- This keeps your existing schema and assigns visible authors based on category/title signals.

update posts
set
  author_name = case
    when lower(coalesce(title, '')) like '%study%' then 'Emily Carter'
    when lower(coalesce(title, '')) like '%learning%' then 'Emily Carter'
    when lower(coalesce(title, '')) like '%memory%' then 'Emily Carter'
    when lower(coalesce(title, '')) like '%student%' then 'Emily Carter'
    when lower(coalesce(title, '')) like '%exam%' then 'Emily Carter'
    when lower(coalesce(title, '')) like '%academic%' then 'Emily Carter'
    else 'Mark Reyes'
  end,
  author_bio = case
    when lower(coalesce(title, '')) like '%study%' then 'Emily Carter writes about study skills, learning systems, productivity, and academic improvement for students and lifelong learners.'
    when lower(coalesce(title, '')) like '%learning%' then 'Emily Carter writes about study skills, learning systems, productivity, and academic improvement for students and lifelong learners.'
    when lower(coalesce(title, '')) like '%memory%' then 'Emily Carter writes about study skills, learning systems, productivity, and academic improvement for students and lifelong learners.'
    when lower(coalesce(title, '')) like '%student%' then 'Emily Carter writes about study skills, learning systems, productivity, and academic improvement for students and lifelong learners.'
    when lower(coalesce(title, '')) like '%exam%' then 'Emily Carter writes about study skills, learning systems, productivity, and academic improvement for students and lifelong learners.'
    when lower(coalesce(title, '')) like '%academic%' then 'Emily Carter writes about study skills, learning systems, productivity, and academic improvement for students and lifelong learners.'
    else 'Mark Reyes focuses on practical education strategies, student productivity, memory improvement, and exam preparation.'
  end
where
  author_name is null
  or lower(author_name) like '%editorial%'
  or lower(author_name) like '%northfield journal%';

select author_name, count(*)
from posts
group by author_name
order by count(*) desc;
