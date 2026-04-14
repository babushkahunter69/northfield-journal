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
  target_country: string;
  curriculum: string;
  learning_objective: string;
  tone: string;
};

type KeywordIdeaResponse = {
  ideas: GeneratedKeywordIdea[];
};

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

function normalizeIdea(input: Partial<GeneratedKeywordIdea>): GeneratedKeywordIdea | null {
  const keyword = String(input.keyword || '').trim();
  if (!keyword) return null;

  const audience = String(input.audience || 'students').trim() as GeneratedKeywordIdea['audience'];
  const gradeBand = String(input.grade_band || 'high-school').trim() as GeneratedKeywordIdea['grade_band'];
  const contentType = String(input.content_type || 'study-guide').trim() as GeneratedKeywordIdea['content_type'];

  const safePriority =
    typeof input.priority === 'number' && Number.isFinite(input.priority)
      ? Math.max(1, Math.min(100, Math.round(input.priority)))
      : 80;

  const cluster =
    String(input.cluster || '').trim() ||
    inferCluster({
      subject_area: input.subject_area,
      content_type: input.content_type,
      audience: input.audience
    });

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
    cluster,
    priority: safePriority,
    target_country: String(input.target_country || 'US').trim() || 'US',
    curriculum: String(input.curriculum || 'general').trim() || 'general',
    learning_objective:
      String(input.learning_objective || '').trim() ||
      `Help readers understand and apply ${keyword}.`,
    tone: String(input.tone || 'supportive').trim() || 'supportive'
  };
}

export async function generateKeywordIdeas(input: {
  count?: number;
  focus?: string;
  audience?: string;
  grade_band?: string;
}) {
  const count = Math.max(1, Math.min(input.count ?? 20, 50));
  const focus = String(input.focus || 'education').trim();
  const audience = String(input.audience || 'mixed').trim();
  const gradeBand = String(input.grade_band || 'mixed').trim();

  const prompt = `
You are a content strategist for Northfield Journal, an education-focused publication.

Generate ${count} keyword ideas for blog articles.

Context:
- Site niche: education
- Focus area: ${focus}
- Preferred audience mix: ${audience}
- Preferred grade-band mix: ${gradeBand}

Requirements:
- Generate realistic, publishable education topics.
- Avoid duplicate or near-duplicate ideas.
- Avoid overly broad, vague, or spammy SEO keywords.
- Favor practical, helpful topics for students, teachers, parents, or general education readers.
- Include a healthy mix of:
  - study skills
  - exam prep
  - teaching strategies
  - parent support
  - academic writing
  - edtech
  - career guidance
- Keywords should sound natural and useful, not robotic.
- Keep them appropriate for a trustworthy education website.
- Priority should be 60 to 100 based on likely usefulness and publishability.

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
      "priority": 80,
      "target_country": "US",
      "curriculum": "general",
      "learning_objective": "string",
      "tone": "string"
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
    .slice(0, count);

  return ideas;
}