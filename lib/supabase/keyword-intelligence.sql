-- Northfield keyword intelligence columns.
-- Run this once in Supabase before using the upgraded keyword review screen.

alter table content_keywords
  add column if not exists quality_score integer,
  add column if not exists approval_recommendation text default 'review',
  add column if not exists scoring_notes jsonb default '{}'::jsonb,
  add column if not exists score_breakdown jsonb default '{}'::jsonb,
  add column if not exists pillar text,
  add column if not exists approved_at timestamptz,
  add column if not exists rejected_at timestamptz;

update content_keywords
set
  quality_score = coalesce(quality_score, priority),
  approval_recommendation = coalesce(approval_recommendation, 'review'),
  scoring_notes = coalesce(scoring_notes, '{}'::jsonb),
  score_breakdown = coalesce(score_breakdown, '{}'::jsonb)
where quality_score is null
   or approval_recommendation is null
   or scoring_notes is null
   or score_breakdown is null;
