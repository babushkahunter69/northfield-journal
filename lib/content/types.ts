export type ContentKeywordRow = {
  id: string;
  keyword: string;
  status: string;
  priority: number | null;
  created_at: string;
  audience: 'students' | 'teachers' | 'parents' | 'general' | null;
  grade_band:
    | 'elementary'
    | 'middle-school'
    | 'high-school'
    | 'college'
    | 'adult'
    | 'general'
    | null;
  subject_area: string | null;
  content_type:
    | 'study-guide'
    | 'exam-prep'
    | 'lesson-summary'
    | 'teaching-strategy'
    | 'parent-guide'
    | 'career-guidance'
    | 'edtech'
    | 'concept-explainer'
    | 'resource-roundup'
    | null;
  target_country: string | null;
  curriculum: string | null;
  learning_objective: string | null;
  tone: string | null;
  attempt_count: number | null;
  last_attempted_at: string | null;
  last_error: string | null;
};