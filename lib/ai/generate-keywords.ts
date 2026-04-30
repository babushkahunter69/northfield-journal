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

const STRONG_KEYWORD_PATTERNS = [
  /^how to /i,
  /^why /i,
  /^what is /i,
  /^best /i,
  /^examples of /i,
  /^ways to /i,
  /^strategies for /i,
  /^checklist for /i,
  /^guide to /i
];

const WEAK_KEYWORDS = [
  'education tips',
  'student success',
  'learning advice',
  'study better',
  'teaching tips',
  'school advice',
  'academic success',
  'education guide'
];

const EDUCATION_SEED_KEYWORDS: Array<Partial<GeneratedKeywordIdea>> = [
  { keyword: 'how to support students with learning disabilities in the classroom', audience: 'teachers', grade_band: 'general', subject_area: 'special education', content_type: 'teaching-strategy', cluster: 'teaching-strategies', priority: 96 },
  { keyword: 'examples of classroom accommodations for students with adhd', audience: 'teachers', grade_band: 'general', subject_area: 'special education', content_type: 'teaching-strategy', cluster: 'teaching-strategies', priority: 95 },
  { keyword: 'how parents can help with homework without taking over', audience: 'parents', grade_band: 'general', subject_area: 'homework support', content_type: 'parent-guide', cluster: 'parent-guides', priority: 94 },
  { keyword: 'checklist for preparing for final exams in high school', audience: 'students', grade_band: 'high-school', subject_area: 'exam preparation', content_type: 'exam-prep', cluster: 'exam-prep', priority: 94 },
  { keyword: 'how to improve reading comprehension in middle school', audience: 'students', grade_band: 'middle-school', subject_area: 'reading', content_type: 'study-guide', cluster: 'reading-skills', priority: 93 },
  { keyword: 'strategies for helping struggling readers in elementary school', audience: 'teachers', grade_band: 'elementary', subject_area: 'reading intervention', content_type: 'teaching-strategy', cluster: 'reading-skills', priority: 93 },
  { keyword: 'how to write a thesis statement for an argumentative essay', audience: 'students', grade_band: 'high-school', subject_area: 'writing', content_type: 'study-guide', cluster: 'academic-writing', priority: 92 },
  { keyword: 'examples of good essay introductions for college students', audience: 'students', grade_band: 'college', subject_area: 'writing', content_type: 'concept-explainer', cluster: 'academic-writing', priority: 91 },
  { keyword: 'best study schedule for high school students with busy activities', audience: 'students', grade_band: 'high-school', subject_area: 'study skills', content_type: 'study-guide', cluster: 'student-success', priority: 91 },
  { keyword: 'how to use active recall for exam preparation', audience: 'students', grade_band: 'general', subject_area: 'study skills', content_type: 'exam-prep', cluster: 'exam-prep', priority: 90 },
  { keyword: 'what is scaffolding in teaching with classroom examples', audience: 'teachers', grade_band: 'general', subject_area: 'instructional strategies', content_type: 'concept-explainer', cluster: 'teaching-strategies', priority: 90 },
  { keyword: 'how to help a child who is falling behind in school', audience: 'parents', grade_band: 'elementary', subject_area: 'parent support', content_type: 'parent-guide', cluster: 'parent-guides', priority: 90 },
  { keyword: 'strategies for teaching math word problems to struggling students', audience: 'teachers', grade_band: 'middle-school', subject_area: 'math', content_type: 'teaching-strategy', cluster: 'math-learning', priority: 89 },
  { keyword: 'how to take better notes in college lectures', audience: 'students', grade_band: 'college', subject_area: 'study skills', content_type: 'study-guide', cluster: 'student-success', priority: 89 },
  { keyword: 'examples of iep goals for reading comprehension', audience: 'teachers', grade_band: 'general', subject_area: 'special education', content_type: 'resource-roundup', cluster: 'reading-skills', priority: 88 },
  { keyword: 'how to reduce test anxiety before final exams', audience: 'students', grade_band: 'general', subject_area: 'exam preparation', content_type: 'exam-prep', cluster: 'exam-prep', priority: 88 }
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

  const safePriority =
    typeof input.priority === 'number' && Number.isFinite(input.priority)
      ? Math.max(70, Math.min(100, Math.round(input.priority)))
      : 85;

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
    tone: String(input.tone || 'supportive, practical, evidence-informed').trim() ||
      'supportive, practical, evidence-informed'
  };
}

function titleCaseWords(value: string) {
  return value
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean)
    .join(' ');
}

function deterministicKeywordIdeas(input: {
  count?: number;
  focus?: string;
  audience?: string;
  grade_band?: string;
}): GeneratedKeywordIdea[] {
  const count = Math.max(1, Math.min(input.count ?? 20, 50));
  const rawFocus = String(input.focus || '').trim();
  const focusParts = rawFocus
    .split(/[,\n]/)
    .map((part) => titleCaseWords(part.toLowerCase()))
    .filter(Boolean);

  const topics = (focusParts.length ? focusParts : ['study skills', 'exam prep', 'classroom teaching'])
    .flatMap((topic) => {
      const lower = topic.toLowerCase();
      if (lower.includes('exam')) return [topic, 'final exam preparation', 'test anxiety strategies'];
      if (lower.includes('classroom') || lower.includes('teaching')) return [topic, 'classroom management strategies', 'supporting struggling students'];
      if (lower.includes('study')) return [topic, 'active recall study methods', 'student time management'];
      return [topic];
    });

  const templates: Array<{
    make: (topic: string) => string;
    audience: GeneratedKeywordIdea['audience'];
    grade_band: GeneratedKeywordIdea['grade_band'];
    content_type: GeneratedKeywordIdea['content_type'];
    subject_area: string;
    priority: number;
  }> = [
    { make: (t) => `how to improve ${t} for high school students`, audience: 'students', grade_band: 'high-school', content_type: 'study-guide', subject_area: 'study skills', priority: 96 },
    { make: (t) => `best ${t} strategies for students who feel overwhelmed`, audience: 'students', grade_band: 'general', content_type: 'study-guide', subject_area: 'student success', priority: 95 },
    { make: (t) => `examples of ${t} routines students can actually follow`, audience: 'students', grade_band: 'general', content_type: 'resource-roundup', subject_area: 'study skills', priority: 94 },
    { make: (t) => `checklist for building better ${t} habits before exams`, audience: 'students', grade_band: 'high-school', content_type: 'exam-prep', subject_area: 'exam preparation', priority: 94 },
    { make: (t) => `how teachers can support students with weak ${t}`, audience: 'teachers', grade_band: 'general', content_type: 'teaching-strategy', subject_area: 'instructional strategies', priority: 93 },
    { make: (t) => `strategies for teaching ${t} to struggling learners`, audience: 'teachers', grade_band: 'general', content_type: 'teaching-strategy', subject_area: 'teaching strategies', priority: 92 },
    { make: (t) => `how parents can help with ${t} without taking over`, audience: 'parents', grade_band: 'general', content_type: 'parent-guide', subject_area: 'parent support', priority: 91 },
    { make: (t) => `what is the best way to practice ${t} at home`, audience: 'students', grade_band: 'general', content_type: 'concept-explainer', subject_area: 'student success', priority: 90 },
    { make: (t) => `common ${t} mistakes students make and how to fix them`, audience: 'students', grade_band: 'general', content_type: 'study-guide', subject_area: 'student success', priority: 89 },
    { make: (t) => `guide to using ${t} for better classroom engagement`, audience: 'teachers', grade_band: 'general', content_type: 'teaching-strategy', subject_area: 'classroom teaching', priority: 88 }
  ];

  const candidates: Partial<GeneratedKeywordIdea>[] = [];
  for (const topic of topics) {
    for (const template of templates) {
      const keyword = template.make(topic.toLowerCase()).replace(/\s+/g, ' ').trim();
      candidates.push({
        keyword,
        audience: template.audience,
        grade_band: template.grade_band,
        subject_area: template.subject_area,
        content_type: template.content_type,
        priority: template.priority,
        cluster: inferCluster({
          subject_area: template.subject_area,
          content_type: template.content_type,
          audience: template.audience
        }),
        target_country: 'US',
        curriculum: 'general',
        learning_objective: `Help readers understand and apply ${keyword}.`,
        tone: 'supportive, practical, evidence-informed'
      });
    }
  }

  const seen = new Set<string>();
  return [...candidates, ...EDUCATION_SEED_KEYWORDS]
    .map(normalizeIdea)
    .filter((item): item is GeneratedKeywordIdea => Boolean(item))
    .filter((item) => {
      const key = item.keyword.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, count);
}

function isAbortLikeError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '');
  return message.toLowerCase().includes('abort') || message.toLowerCase().includes('timed out');
}

export async function generateKeywordIdeas(input: {
  count?: number;
  focus?: string;
  audience?: string;
  grade_band?: string;
}) {
  const count = Math.max(1, Math.min(input.count ?? 20, 50));
  const useAi = process.env.KEYWORD_AI_MODE === 'true';

  if (!useAi) {
    return deterministicKeywordIdeas({ ...input, count });
  }

  const requestCount = Math.min(count * 2, 80);
  const focus = String(input.focus || 'education').trim();
  const audience = String(input.audience || 'mixed').trim();
  const gradeBand = String(input.grade_band || 'mixed').trim();

  const prompt = `
You are a senior SEO strategist for Northfield Journal, an education-focused publication.

Generate ${requestCount} SEO-worthy keyword ideas for 2,000-3,000 word blog articles.

Context:
- Site niche: education
- Focus area: ${focus}
- Preferred audience mix: ${audience}
- Preferred grade-band mix: ${gradeBand}
- Main markets: US, UK, Canada, Australia

Keyword requirements:
- Long-tail and searchable.
- At least 4 words, preferably 5-10 words.
- Specific enough to support a deep 2,000-3,000 word article.
- Favor clear search intent: how-to, examples, checklist, comparison, accommodations, lesson strategies, parent support, exam prep, or study systems.
- Avoid broad head terms unless they are turned into a specific practical query.
- Must match realistic student, parent, or teacher search intent.
- Prefer how-to, checklist, examples, comparison, mistakes, and strategy topics.
- Avoid generic phrases like "education tips", "student success", "study better", or "learning advice".
- Avoid awkward robotic phrases.
- Avoid duplicate or near-duplicate ideas.
- Priority should be 70 to 100 based on SEO usefulness.

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

  try {
    const result = await generateJson<KeywordIdeaResponse>(prompt);
    const seen = new Set<string>();
    const ideas = [...(result.ideas || []), ...EDUCATION_SEED_KEYWORDS]
      .map(normalizeIdea)
      .filter((item): item is GeneratedKeywordIdea => Boolean(item))
      .filter((item) => {
        const key = item.keyword.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, count);

    return ideas.length > 0 ? ideas : deterministicKeywordIdeas({ ...input, count });
  } catch (error) {
    if (!isAbortLikeError(error)) {
      console.warn('AI keyword generation failed. Falling back to deterministic keywords.', error);
    }
    return deterministicKeywordIdeas({ ...input, count });
  }
}
