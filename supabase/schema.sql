create extension if not exists pgcrypto;

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text not null,
  content text not null,
  featured_image_url text,
  author_name text not null,
  author_bio text,
  category_id uuid references categories(id) on delete set null,
  meta_title text,
  meta_description text,
  keywords text[] default '{}',
  is_featured boolean not null default false,
  status text not null check (status in ('draft', 'published')) default 'draft',
  reading_time_minutes integer not null default 1,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists guest_post_submissions (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  bio text,
  proposed_title text not null,
  topic_category text not null,
  target_keyword text,
  article_angle text,
  target_audience text,
  source_links text,
  portfolio_url text,
  linkedin_url text,
  article_content text not null,
  notes text,
  consent_original boolean not null default false,
  status text not null check (status in ('pending', 'accepted', 'rejected')) default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text,
  status text not null check (status in ('subscribed', 'unsubscribed')) default 'subscribed',
  created_at timestamptz not null default now()
);

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists posts_set_updated_at on posts;
create trigger posts_set_updated_at
before update on posts
for each row
execute function update_updated_at_column();

alter table categories enable row level security;
alter table posts enable row level security;
alter table guest_post_submissions enable row level security;
alter table newsletter_subscribers enable row level security;

create policy "Public can read published posts"
on posts for select
using (status = 'published');

create policy "Public can read categories"
on categories for select
using (true);

create policy "Anyone can create guest post submissions"
on guest_post_submissions for insert
with check (true);

create policy "Anyone can subscribe to newsletter"
on newsletter_subscribers for insert
with check (true);

insert into storage.buckets (id, name, public)
values ('post-media', 'post-media', true)
on conflict (id) do nothing;

create policy "Public can view post media"
on storage.objects for select
using (bucket_id = 'post-media');

create policy "Service role can manage post media"
on storage.objects for all
using (bucket_id = 'post-media')
with check (bucket_id = 'post-media');

insert into categories (name, slug, description)
values
  ('Student Success', 'student-success', 'Study systems, focus, revision, and academic confidence.'),
  ('Teaching Craft', 'teaching-craft', 'Classroom practice, tutoring, and lesson design.'),
  ('EdTech', 'edtech', 'Useful digital tools and implementation ideas.'),
  ('School Leadership', 'school-leadership', 'Communication, systems, and school operations.'),
  ('Scholarships & Access', 'scholarships-access', 'Funding, admissions, and college-access advice.'),
  ('Academic Writing', 'academic-writing', 'Research, writing, and argumentation skills.')
on conflict (slug) do nothing;

insert into posts (
  title,
  slug,
  excerpt,
  content,
  featured_image_url,
  author_name,
  author_bio,
  category_id,
  meta_title,
  meta_description,
  keywords,
  is_featured,
  status,
  reading_time_minutes,
  published_at
)
select
  'How to Build a Weekly Study Routine That Actually Sticks',
  'weekly-study-routine',
  'A practical framework students can use to study consistently without turning every evening into a guilt spiral.',
  E'## Start smaller than your ambition\nMost students fail not because they are lazy but because they build schedules for an imaginary version of themselves. Start with a routine you can repeat on an average week.\n\n## Match your hardest work to your best hours\nPut problem-solving, writing, or memorization into the hours when your brain still has something to give. Save lighter review tasks for lower-energy windows.\n\n## Build a simple review loop\n- Preview before class\n- Review within 24 hours\n- Revisit at the end of the week\n\n## Leave room for recovery\nA good study plan includes stopping points. People who never plan recovery usually end up skipping the whole system after one rough week.\n\n> Consistency feels less dramatic than motivation, but it wins more semesters.\n\n## Track what actually happened\nAt the end of each week, compare the plan to reality. Keep what worked, adjust what did not, and avoid turning one bad week into a character judgment.',
  'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1400&q=80',
  'Editorial Team',
  'Northfield Journal editors',
  (select id from categories where slug = 'student-success'),
  'How to Build a Weekly Study Routine That Actually Sticks',
  'A practical guide to building a realistic weekly study routine with better planning, review loops, and less burnout.',
  array['weekly study routine', 'study plan for students'],
  true,
  'published',
  5,
  now()
where not exists (select 1 from posts where slug = 'weekly-study-routine');

insert into posts (
  title,
  slug,
  excerpt,
  content,
  featured_image_url,
  author_name,
  author_bio,
  category_id,
  meta_title,
  meta_description,
  keywords,
  is_featured,
  status,
  reading_time_minutes,
  published_at
)
select
  'What Good Formative Assessment Looks Like in a Busy Classroom',
  'formative-assessment-busy-classroom',
  'Fast, low-friction ways teachers can check understanding without turning every lesson into a paperwork exercise.',
  E'## Start with the decision you need to make\nAssessment becomes lighter when it is tied to a real teaching decision. Are students ready to move on, do they need another example, or is a small group intervention enough?\n\n## Use quick checks with a purpose\nMini whiteboards, one-sentence summaries, retrieval questions, and exit slips all work when you know what you are looking for.\n\n## Keep the signal clean\nToo many prompts at once create noise. Ask fewer, better questions and look for patterns, not perfection.\n\n## Close the loop visibly\nStudents trust formative assessment more when they can see that their responses changed something about the lesson.\n\n## Keep a few routines, not twenty\nOne or two reliable feedback structures used well will usually beat an endless rotation of clever tools.',
  'https://images.unsplash.com/photo-1453738773917-9c3eff1db985?auto=format&fit=crop&w=1400&q=80',
  'Maya Ellison',
  'Former department head and curriculum coach',
  (select id from categories where slug = 'teaching-craft'),
  'What Good Formative Assessment Looks Like in a Busy Classroom',
  'Practical formative assessment routines that help teachers check understanding quickly and respond in real time.',
  array['formative assessment strategies', 'checking for understanding'],
  true,
  'published',
  4,
  now() - interval '2 days'
where not exists (select 1 from posts where slug = 'formative-assessment-busy-classroom');
