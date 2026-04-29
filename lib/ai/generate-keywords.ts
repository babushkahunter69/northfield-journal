import { scoreKeywordIdea } from '@/lib/seo/keyword-intelligence';
import { generateJson } from './client';

export type GeneratedKeywordIdea = {
  keyword: string;
  audience: 'students' | 'teachers' | 'parents' | 'general';
  grade_band:
    | 'elementary'
    | 'middle-school'
    | 'high-school'
    | 'college'
    | 'adult'
    | 'general';
  subject_area: string;
  content_type:
    | 'study-guide'
    | 'exam-prep'
    | 'lesson-summary'
    | 'teaching-strategy'
    | 'parent-guide'
    | 'career-guidance'
    | 'edtech'
    | 'concept-explainer'
    | 'resource-roundup';
  cluster: string;
  priority: number;
  quality_score: number;
  approval_recommendation: 'approve_first' | 'review' | 'reject';
  scoring_notes: { reasons: string[]; risks: string[] };
  score_breakdown: Record<string, number>;
  pillar: string;
  target_country: string;
  curriculum: string;
  learning_objective: string;
  tone: string;
};

type KeywordIdeaResponse = {
  ideas: GeneratedKeywordIdea[];
};

const STRONG_KEYWORD_PATTERNS = [
  /^how to /i,
  /^why /i,
  /^what is /i,
  /^best /i,
  /^examples of /i,
  /^ways to /i,
  /^strategies for /i,
  /^checklist for /i,
  /^guide to /i,
  /\bvs\b/i
];

const WEAK_KEYWORDS = [
  'education tips',
  'student success',
  'learning advice',
  'study better',
  'teaching tips',
  'school advice',
  'academic success',
  'education guide',
  'study skills',
  'learning strategies'
];

function inferCluster(input: {
  subject_area?: string;
  content_type?: string;
  audience?: string;
}) {
  const subject = String(input.subject_area || '').toLowerCase();
  const type = String(input.content_type || '').toLowerCase();
  const audience = String(input.audience || '').toLowerCase();

  if (type.includes('parent') || audience === 'parents') return 'parent-guides';
  if (type.includes('teaching') || audience === 'teachers') return 'teaching-strategies';
  if (type.includes('exam')) return 'exam-prep';
  if (type.includes('career')) return 'career-guidance';
  if (type.includes('edtech')) return 'edtech';
  if (subject.includes('writing')) return 'academic-writing';
  if (subject.includes('math')) return 'math-learning';
  if (subject.includes('science')) return 'science-learning';
  if (subject.includes('reading')) return 'reading-skills';
  if (subject.includes('study')) return 'student-success';

  return 'student-success';
}

function isSeoWorthyKeyword(keyword: string) {
  const normalized = keyword.toLowerCase().trim();

  if (normalized.length < 18) return false;
  if (normalized.split(/\s+/).length < 4) return false;
  if (WEAK_KEYWORDS.includes(normalized)) return false;

  return STRONG_KEYWORD_PATTERNS.some((pattern) => pattern.test(normalized));
}

function normalizeIdea(input: Partial<GeneratedKeywordIdea>): GeneratedKeywordIdea | null {
  const keyword = String(input.keyword || '').trim().toLowerCase();
  if (!keyword) return null;
  if (!isSeoWorthyKeyword(keyword)) return null;

  const audience = String(input.audience || 'students').trim() as GeneratedKeywordIdea['audience'];
  const gradeBand = String(input.grade_band || 'high-school').trim() as GeneratedKeywordIdea['grade_band'];
  const contentType = String(input.content_type || 'study-guide').trim() as GeneratedKeywordIdea['content_type'];

  const inferredCluster =
    String(input.cluster || '').trim() ||
    inferCluster({
      subject_area: input.subject_area,
      content_type: input.content_type,
      audience: input.audience
    });

  const intelligence = scoreKeywordIdea({
    keyword,
    cluster: inferredCluster,
    audience,
    grade_band: gradeBand,
    subject_area: input.subject_area,
    content_type: contentType
  });

  const safePriority =
    typeof input.priority === 'number' && Number.isFinite(input.priority)
      ? Math.max(intelligence.quality_score, Math.max(60, Math.min(100, Math.round(input.priority))))
      : intelligence.quality_score;

  return {
    keyword,
    audience:
      audience === 'students' ||
      audience === 'teachers' ||
      audience === 'parents' ||
      audience === 'general'
        ? audience
        : 'students',
    grade_band:
      gradeBand === 'elementary' ||
      gradeBand === 'middle-school' ||
      gradeBand === 'high-school' ||
      gradeBand === 'college' ||
      gradeBand === 'adult' ||
      gradeBand === 'general'
        ? gradeBand
        : 'high-school',
    subject_area: String(input.subject_area || 'study-skills').trim() || 'study-skills',
    content_type:
      contentType === 'study-guide' ||
      contentType === 'exam-prep' ||
      contentType === 'lesson-summary' ||
      contentType === 'teaching-strategy' ||
      contentType === 'parent-guide' ||
      contentType === 'career-guidance' ||
      contentType === 'edtech' ||
      contentType === 'concept-explainer' ||
      contentType === 'resource-roundup'
        ? contentType
        : 'study-guide',
    cluster: intelligence.cluster,
    priority: safePriority,
    quality_score: intelligence.quality_score,
    approval_recommendation: intelligence.recommendation,
    scoring_notes: { reasons: intelligence.reasons, risks: intelligence.risks },
    score_breakdown: intelligence.score_breakdown,
    pillar: intelligence.pillar,
    target_country: String(input.target_country || 'US').trim() || 'US',
    curriculum: String(input.curriculum || 'general').trim() || 'general',
    learning_objective:
      String(input.learning_objective || '').trim() ||
      `Help readers understand and apply ${keyword}.`,
    tone:
      String(input.tone || 'supportive, practical, evidence-informed').trim() ||
      'supportive, practical, evidence-informed'
  };
}

export async function generateKeywordIdeas(input: {
  count?: number;
  focus?: string;
  audience?: string;
  grade_band?: string;
}) {
  const count = Math.max(1, Math.min(input.count ?? 20, 50));
  const requestCount = Math.min(count * 2, 80);
  const focus = String(input.focus || 'education').trim();
  const audience = String(input.audience || 'mixed').trim();
  const gradeBand = String(input.grade_band || 'mixed').trim();

  const prompt = `
You are a senior SEO strategist for Northfield Journal, an education-focused publication.

Generate ${requestCount} SEO-worthy keyword ideas for blog articles.

Context:
- Site niche: education
- Focus area: ${focus}
- Preferred audience mix: ${audience}
- Preferred grade-band mix: ${gradeBand}
- Main markets: US, UK, Canada, Australia

Keyword requirements:
- Long-tail and searchable.
- At least 4 words.
- Specific enough to become a useful article.
- Must match realistic student, parent, or teacher search intent.
- Prefer how-to, checklist, examples, comparison, mistakes, and strategy topics.
- Avoid generic phrases like "education tips", "student success", "study better", or "learning advice".
- Avoid awkward robotic phrases.
- Avoid duplicate or near-duplicate ideas.
- Priority should be 70 to 100 based on SEO usefulness.

Strong examples:
- how to write a thesis statement for an argumentative essay
- how to avoid procrastination while studying
- examples of good essay introductions for college students
- active recall vs rereading for exam preparation
- how parents can help with homework without taking over
- strategies for supporting students with learning differences
- checklist for preparing for final exams in high school
- how to improve reading comprehension in middle school

Cluster rules:
- cluster must be one of:
  - student-success
  - exam-prep
  - academic-writing
  - teaching-strategies
  - parent-guides
  - career-guidance
  - edtech
  - math-learning
  - science-learning
  - reading-skills

Return JSON with exactly this shape:
{
  "ideas": [
    {
      "keyword": "string",
      "audience": "students | teachers | parents | general",
      "grade_band": "elementary | middle-school | high-school | college | adult | general",
      "subject_area": "string",
      "content_type": "study-guide | exam-prep | lesson-summary | teaching-strategy | parent-guide | career-guidance | edtech | concept-explainer | resource-roundup",
      "cluster": "student-success | exam-prep | academic-writing | teaching-strategies | parent-guides | career-guidance | edtech | math-learning | science-learning | reading-skills",
      "priority": 85,
      "target_country": "US",
      "curriculum": "general",
      "learning_objective": "string",
      "tone": "supportive, practical, evidence-informed"
    }
  ]
}
`;

  const result = await generateJson<KeywordIdeaResponse>(prompt);

  const seen = new Set<string>();
  const ideas = (result.ideas || [])
    .map(normalizeIdea)
    .filter((item): item is GeneratedKeywordIdea => Boolean(item))
    .filter((item) => {
      const key = item.keyword.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.quality_score - a.quality_score)
    .slice(0, count);

  return ideas;
}
