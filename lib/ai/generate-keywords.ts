import { generateJson } from './client';
import { diversifyKeywordIdeas } from './keyword-diversity';

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

const MAX_KEYWORD_IDEAS = 500;

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
  /^common mistakes /i
];

const WEAK_KEYWORDS = new Set([
  'education tips',
  'student success',
  'learning advice',
  'study better',
  'teaching tips',
  'school advice',
  'academic success',
  'education guide'
]);

const DEFAULT_FOCUS_PLACEHOLDERS = new Set([
  '',
  'education',
  'study skills, exam prep, classroom teaching',
  'exam prep, study skills, classroom teaching',
  'leave blank for automatic diverse ed',
  'leave blank for automatic diverse education topics'
]);

function isDefaultFocus(value?: string) {
  return DEFAULT_FOCUS_PLACEHOLDERS.has(String(value || '').toLowerCase().trim());
}

type TopicSeed = {
  phrase: string;
  audience: GeneratedKeywordIdea['audience'];
  grade_band: GeneratedKeywordIdea['grade_band'];
  subject_area: string;
  content_type: GeneratedKeywordIdea['content_type'];
  cluster: string;
  priority: number;
};

const TOPIC_SEEDS: TopicSeed[] = [
  { phrase: 'reading comprehension for middle school students', audience: 'students', grade_band: 'middle-school', subject_area: 'reading', content_type: 'study-guide', cluster: 'reading-skills', priority: 96 },
  { phrase: 'vocabulary skills for elementary readers', audience: 'teachers', grade_band: 'elementary', subject_area: 'reading', content_type: 'teaching-strategy', cluster: 'reading-skills', priority: 94 },
  { phrase: 'phonemic awareness for early readers', audience: 'parents', grade_band: 'elementary', subject_area: 'reading foundations', content_type: 'parent-guide', cluster: 'reading-skills', priority: 93 },
  { phrase: 'essay introductions for high school students', audience: 'students', grade_band: 'high-school', subject_area: 'writing', content_type: 'study-guide', cluster: 'academic-writing', priority: 95 },
  { phrase: 'thesis statements for argumentative essays', audience: 'students', grade_band: 'high-school', subject_area: 'writing', content_type: 'concept-explainer', cluster: 'academic-writing', priority: 95 },
  { phrase: 'research paper organization for college students', audience: 'students', grade_band: 'college', subject_area: 'academic writing', content_type: 'study-guide', cluster: 'academic-writing', priority: 92 },
  { phrase: 'math word problems for struggling students', audience: 'teachers', grade_band: 'middle-school', subject_area: 'math', content_type: 'teaching-strategy', cluster: 'math-learning', priority: 93 },
  { phrase: 'fractions for elementary students', audience: 'teachers', grade_band: 'elementary', subject_area: 'math', content_type: 'teaching-strategy', cluster: 'math-learning', priority: 91 },
  { phrase: 'algebra mistakes high school students make', audience: 'students', grade_band: 'high-school', subject_area: 'math', content_type: 'study-guide', cluster: 'math-learning', priority: 90 },
  { phrase: 'science fair project questions for middle school', audience: 'students', grade_band: 'middle-school', subject_area: 'science', content_type: 'resource-roundup', cluster: 'science-learning', priority: 90 },
  { phrase: 'claim evidence reasoning in science class', audience: 'teachers', grade_band: 'middle-school', subject_area: 'science', content_type: 'teaching-strategy', cluster: 'science-learning', priority: 89 },
  { phrase: 'active recall study methods for exams', audience: 'students', grade_band: 'general', subject_area: 'study skills', content_type: 'exam-prep', cluster: 'exam-prep', priority: 95 },
  { phrase: 'test anxiety before final exams', audience: 'students', grade_band: 'high-school', subject_area: 'exam preparation', content_type: 'exam-prep', cluster: 'exam-prep', priority: 94 },
  { phrase: 'final exam study schedule for high school students', audience: 'students', grade_band: 'high-school', subject_area: 'exam preparation', content_type: 'exam-prep', cluster: 'exam-prep', priority: 93 },
  { phrase: 'note taking methods for college lectures', audience: 'students', grade_band: 'college', subject_area: 'study skills', content_type: 'study-guide', cluster: 'student-success', priority: 92 },
  { phrase: 'student time management for busy school weeks', audience: 'students', grade_band: 'high-school', subject_area: 'study skills', content_type: 'study-guide', cluster: 'student-success', priority: 91 },
  { phrase: 'homework routines for students who procrastinate', audience: 'students', grade_band: 'general', subject_area: 'homework', content_type: 'study-guide', cluster: 'student-success', priority: 90 },
  { phrase: 'classroom accommodations for students with adhd', audience: 'teachers', grade_band: 'general', subject_area: 'special education', content_type: 'teaching-strategy', cluster: 'special-education', priority: 96 },
  { phrase: 'iep goals for reading comprehension', audience: 'teachers', grade_band: 'general', subject_area: 'special education', content_type: 'resource-roundup', cluster: 'special-education', priority: 94 },
  { phrase: 'supporting students with dyslexia in the classroom', audience: 'teachers', grade_band: 'general', subject_area: 'special education', content_type: 'teaching-strategy', cluster: 'special-education', priority: 93 },
  { phrase: 'differentiated instruction for mixed ability classrooms', audience: 'teachers', grade_band: 'general', subject_area: 'instruction', content_type: 'teaching-strategy', cluster: 'teaching-strategies', priority: 94 },
  { phrase: 'formative assessment activities for quick feedback', audience: 'teachers', grade_band: 'general', subject_area: 'assessment', content_type: 'resource-roundup', cluster: 'teaching-strategies', priority: 91 },
  { phrase: 'classroom participation for quiet students', audience: 'teachers', grade_band: 'general', subject_area: 'classroom engagement', content_type: 'teaching-strategy', cluster: 'teaching-strategies', priority: 90 },
  { phrase: 'parent teacher conference preparation', audience: 'parents', grade_band: 'general', subject_area: 'school communication', content_type: 'parent-guide', cluster: 'parent-guides', priority: 90 },
  { phrase: 'homework help without doing the work for your child', audience: 'parents', grade_band: 'general', subject_area: 'parent support', content_type: 'parent-guide', cluster: 'parent-guides', priority: 92 },
  { phrase: 'helping a child who is falling behind in school', audience: 'parents', grade_band: 'elementary', subject_area: 'parent support', content_type: 'parent-guide', cluster: 'parent-guides', priority: 93 },
  { phrase: 'homeschool schedule for working parents', audience: 'parents', grade_band: 'general', subject_area: 'homeschooling', content_type: 'parent-guide', cluster: 'homeschooling', priority: 88 },
  { phrase: 'student organization apps for assignments', audience: 'students', grade_band: 'high-school', subject_area: 'edtech', content_type: 'edtech', cluster: 'edtech', priority: 91 },
  { phrase: 'digital citizenship lessons for middle school', audience: 'teachers', grade_band: 'middle-school', subject_area: 'digital literacy', content_type: 'teaching-strategy', cluster: 'edtech', priority: 89 },
  { phrase: 'ai tools for students without plagiarism', audience: 'students', grade_band: 'college', subject_area: 'academic integrity', content_type: 'concept-explainer', cluster: 'edtech', priority: 90 },
  { phrase: 'career readiness activities for high school students', audience: 'teachers', grade_band: 'high-school', subject_area: 'career readiness', content_type: 'career-guidance', cluster: 'career-guidance', priority: 90 },
  { phrase: 'choosing a college major when undecided', audience: 'students', grade_band: 'college', subject_area: 'career planning', content_type: 'career-guidance', cluster: 'career-guidance', priority: 91 },
  { phrase: 'resume skills for high school students with no experience', audience: 'students', grade_band: 'high-school', subject_area: 'career readiness', content_type: 'career-guidance', cluster: 'career-guidance', priority: 89 },
  { phrase: 'growth mindset activities for elementary students', audience: 'teachers', grade_band: 'elementary', subject_area: 'social emotional learning', content_type: 'resource-roundup', cluster: 'student-success', priority: 87 },
  { phrase: 'executive function skills for middle school students', audience: 'parents', grade_band: 'middle-school', subject_area: 'student support', content_type: 'parent-guide', cluster: 'student-success', priority: 89 },
  { phrase: 'lesson closure strategies that improve retention', audience: 'teachers', grade_band: 'general', subject_area: 'instruction', content_type: 'teaching-strategy', cluster: 'teaching-strategies', priority: 88 },
  { phrase: 'rubric examples for student writing assignments', audience: 'teachers', grade_band: 'general', subject_area: 'writing assessment', content_type: 'resource-roundup', cluster: 'academic-writing', priority: 88 },
  { phrase: 'reading fluency activities for reluctant readers', audience: 'teachers', grade_band: 'elementary', subject_area: 'reading', content_type: 'resource-roundup', cluster: 'reading-skills', priority: 88 },
  { phrase: 'study motivation when students feel burned out', audience: 'students', grade_band: 'general', subject_area: 'study skills', content_type: 'study-guide', cluster: 'student-success', priority: 88 },
  { phrase: 'classroom routines for the first week of school', audience: 'teachers', grade_band: 'general', subject_area: 'classroom management', content_type: 'teaching-strategy', cluster: 'teaching-strategies', priority: 87 },
  { phrase: 'college application timeline for high school juniors', audience: 'students', grade_band: 'high-school', subject_area: 'college planning', content_type: 'career-guidance', cluster: 'career-guidance', priority: 87 },
  { phrase: 'math fact fluency without timed tests', audience: 'teachers', grade_band: 'elementary', subject_area: 'math', content_type: 'teaching-strategy', cluster: 'math-learning', priority: 87 },
  { phrase: 'reading logs that students will actually complete', audience: 'teachers', grade_band: 'middle-school', subject_area: 'reading', content_type: 'resource-roundup', cluster: 'reading-skills', priority: 86 },
  { phrase: 'group work roles for classroom collaboration', audience: 'teachers', grade_band: 'general', subject_area: 'collaboration', content_type: 'resource-roundup', cluster: 'teaching-strategies', priority: 86 },
  { phrase: 'study plan for students who work part time', audience: 'students', grade_band: 'college', subject_area: 'study skills', content_type: 'study-guide', cluster: 'student-success', priority: 86 },
  { phrase: 'online class note taking for college students', audience: 'students', grade_band: 'college', subject_area: 'study skills', content_type: 'study-guide', cluster: 'student-success', priority: 86 },
  { phrase: 'middle school organization skills for messy binders', audience: 'parents', grade_band: 'middle-school', subject_area: 'organization', content_type: 'parent-guide', cluster: 'student-success', priority: 85 },
  { phrase: 'teacher feedback comments that help students revise', audience: 'teachers', grade_band: 'general', subject_area: 'assessment', content_type: 'teaching-strategy', cluster: 'teaching-strategies', priority: 85 }
];

const EXTRA_TOPICS = [
  'study habits for visual learners',
  'morning routines for elementary students',
  'after school routines for middle school students',
  'academic vocabulary for science class',
  'main idea practice for struggling readers',
  'multiplication strategies for third grade',
  'geometry vocabulary for middle school',
  'lab report writing for high school science',
  'citation mistakes in research papers',
  'public speaking anxiety for students',
  'student goal setting conferences',
  'teacher planning time management',
  'classroom discussion questions that build critical thinking',
  'parent questions to ask at school meetings',
  'college note review systems',
  'study breaks that improve focus',
  'spaced repetition for vocabulary tests',
  'self advocacy skills for students with ieps',
  'reading intervention groups in elementary school',
  'essay revision checklist for students',
  'test correction activities for math class',
  'student reflection questions after projects',
  'career exploration projects for middle school',
  'digital portfolio ideas for students',
  'ai writing tools in the classroom',
  'teacher parent communication templates',
  'home reading routines for reluctant readers',
  'math anxiety strategies for students',
  'study checklists for open book exams',
  'classroom seating arrangements for participation',
  'project based learning ideas for science',
  'financial literacy lessons for high school students',
  'college scholarship essay planning',
  'student planner systems for assignments',
  'homework stations for small spaces',
  'reading comprehension questions for nonfiction',
  'transition routines between classroom activities',
  'behavior reflection sheets that are restorative',
  'peer review activities for writing class',
  'study routines for students with adhd'
];

function inferSeedFromTopic(phrase: string, index: number): TopicSeed {
  const lower = phrase.toLowerCase();
  const audience: GeneratedKeywordIdea['audience'] = lower.includes('teacher') || lower.includes('classroom') ? 'teachers' : lower.includes('parent') || lower.includes('home') ? 'parents' : 'students';
  const grade_band: GeneratedKeywordIdea['grade_band'] = lower.includes('elementary') || lower.includes('third grade') ? 'elementary' : lower.includes('middle school') ? 'middle-school' : lower.includes('high school') ? 'high-school' : lower.includes('college') ? 'college' : 'general';
  const content_type: GeneratedKeywordIdea['content_type'] = audience === 'teachers' ? 'teaching-strategy' : audience === 'parents' ? 'parent-guide' : lower.includes('career') || lower.includes('college') || lower.includes('scholarship') ? 'career-guidance' : lower.includes('test') || lower.includes('exam') ? 'exam-prep' : 'study-guide';
  const subject_area = lower.includes('math') || lower.includes('geometry') || lower.includes('multiplication') ? 'math' : lower.includes('reading') || lower.includes('vocabulary') ? 'reading' : lower.includes('writing') || lower.includes('essay') || lower.includes('citation') ? 'writing' : lower.includes('science') || lower.includes('lab') ? 'science' : lower.includes('ai') || lower.includes('digital') || lower.includes('portfolio') ? 'edtech' : 'student success';
  const cluster = inferCluster({ subject_area, content_type, audience });
  return { phrase, audience, grade_band, subject_area, content_type, cluster, priority: Math.max(78, 88 - (index % 8)) };
}


const DYNAMIC_TOPIC_BASES = [
  'reading comprehension', 'vocabulary development', 'phonics practice', 'fluency practice', 'essay writing', 'paragraph writing', 'research writing', 'citation skills',
  'math word problems', 'fractions', 'multiplication facts', 'algebra readiness', 'geometry basics', 'science vocabulary', 'lab report writing', 'science fair projects',
  'note taking', 'active recall', 'spaced repetition', 'study planning', 'test anxiety', 'homework routines', 'student organization', 'time management',
  'career exploration', 'college readiness', 'scholarship essays', 'digital portfolios', 'AI literacy', 'online research skills', 'media literacy', 'classroom participation',
  'group projects', 'presentation skills', 'critical thinking', 'project based learning', 'formative assessment', 'student reflection', 'parent teacher communication',
  'homeschool schedules', 'IEP accommodations', 'dyslexia support', 'ADHD study routines', 'restorative behavior reflection', 'attendance motivation'
];

const DYNAMIC_AUDIENCE_CONTEXTS: Array<{ label: string; audience: GeneratedKeywordIdea['audience']; grade_band: GeneratedKeywordIdea['grade_band'] }> = [
  { label: 'elementary students', audience: 'students', grade_band: 'elementary' },
  { label: 'middle school students', audience: 'students', grade_band: 'middle-school' },
  { label: 'high school students', audience: 'students', grade_band: 'high-school' },
  { label: 'college students', audience: 'students', grade_band: 'college' },
  { label: 'parents at home', audience: 'parents', grade_band: 'general' },
  { label: 'classroom teachers', audience: 'teachers', grade_band: 'general' },
  { label: 'struggling learners', audience: 'teachers', grade_band: 'general' },
  { label: 'busy students', audience: 'students', grade_band: 'general' }
];

const DYNAMIC_INTENT_PATTERNS = [
  'how to improve {topic} for {audience}',
  'best {topic} strategies for {audience}',
  'examples of {topic} activities for {audience}',
  'checklist for building better {topic} habits with {audience}',
  'common mistakes with {topic} and how {audience} can fix them',
  'guide to teaching {topic} to {audience}',
  'ways to practice {topic} without extra stress for {audience}',
  'what is the best way to start {topic} with {audience}'
];

function dynamicTopicSeeds(): TopicSeed[] {
  const seeds: TopicSeed[] = [];

  for (const [topicIndex, topic] of DYNAMIC_TOPIC_BASES.entries()) {
    for (const [contextIndex, context] of DYNAMIC_AUDIENCE_CONTEXTS.entries()) {
      for (const [patternIndex, pattern] of DYNAMIC_INTENT_PATTERNS.entries()) {
        const phrase = pattern
          .replace('{topic}', topic)
          .replace('{audience}', context.label);
        const inferred = inferSeedFromTopic(phrase, topicIndex + contextIndex + patternIndex);
        seeds.push({
          ...inferred,
          phrase,
          audience: context.audience,
          grade_band: context.grade_band,
          priority: Math.max(72, 90 - ((topicIndex + contextIndex + patternIndex) % 18))
        });
      }
    }
  }

  return seeds;
}

function inferCluster(input: {
  subject_area?: string;
  content_type?: string;
  audience?: string;
}) {
  const subject = String(input.subject_area || '').toLowerCase();
  const type = String(input.content_type || '').toLowerCase();
  const audience = String(input.audience || '').toLowerCase();

  if (subject.includes('special') || subject.includes('iep') || subject.includes('adhd') || subject.includes('dyslexia')) return 'special-education';
  if (type.includes('parent') || audience === 'parents') return 'parent-guides';
  if (type.includes('teaching') || audience === 'teachers') return 'teaching-strategies';
  if (type.includes('exam')) return 'exam-prep';
  if (type.includes('career')) return 'career-guidance';
  if (type.includes('edtech') || subject.includes('digital') || subject.includes('ai')) return 'edtech';
  if (subject.includes('writing')) return 'academic-writing';
  if (subject.includes('math')) return 'math-learning';
  if (subject.includes('science')) return 'science-learning';
  if (subject.includes('reading') || subject.includes('vocabulary')) return 'reading-skills';
  if (subject.includes('homeschool')) return 'homeschooling';

  return 'student-success';
}

function isSeoWorthyKeyword(keyword: string) {
  const normalized = keyword.toLowerCase().trim();

  if (normalized.length < 18) return false;
  if (normalized.split(/\s+/).length < 4) return false;
  if (WEAK_KEYWORDS.has(normalized)) return false;

  return STRONG_KEYWORD_PATTERNS.some((pattern) => pattern.test(normalized));
}

function normalizeIdea(input: Partial<GeneratedKeywordIdea>): GeneratedKeywordIdea | null {
  const keyword = String(input.keyword || '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (!keyword) return null;
  if (!isSeoWorthyKeyword(keyword)) return null;

  const audience = String(input.audience || 'students').trim() as GeneratedKeywordIdea['audience'];
  const gradeBand = String(input.grade_band || 'general').trim() as GeneratedKeywordIdea['grade_band'];
  const contentType = String(input.content_type || 'study-guide').trim() as GeneratedKeywordIdea['content_type'];

  const safePriority =
    typeof input.priority === 'number' && Number.isFinite(input.priority)
      ? Math.max(70, Math.min(100, Math.round(input.priority)))
      : 85;

  const subjectArea = String(input.subject_area || 'study skills').trim() || 'study skills';
  const safeAudience =
    audience === 'students' || audience === 'teachers' || audience === 'parents' || audience === 'general'
      ? audience
      : 'students';
  const safeContentType =
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
      : 'study-guide';

  const cluster =
    String(input.cluster || '').trim() ||
    inferCluster({
      subject_area: subjectArea,
      content_type: safeContentType,
      audience: safeAudience
    });

  return {
    keyword,
    audience: safeAudience,
    grade_band:
      gradeBand === 'elementary' ||
      gradeBand === 'middle-school' ||
      gradeBand === 'high-school' ||
      gradeBand === 'college' ||
      gradeBand === 'adult' ||
      gradeBand === 'general'
        ? gradeBand
        : 'general',
    subject_area: subjectArea,
    content_type: safeContentType,
    cluster,
    priority: safePriority,
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

function titleCaseWords(value: string) {
  return value
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean)
    .join(' ');
}

function keywordTemplates(seed: TopicSeed) {
  const phrase = seed.phrase.toLowerCase();
  const base: Array<Partial<GeneratedKeywordIdea>> = [];

  if (seed.audience === 'teachers') {
    base.push(
      { keyword: `how to teach ${phrase}`, content_type: 'teaching-strategy', audience: 'teachers', priority: seed.priority },
      { keyword: `examples of ${phrase} activities for teachers`, content_type: 'resource-roundup', audience: 'teachers', priority: seed.priority - 1 },
      { keyword: `strategies for ${phrase} in the classroom`, content_type: 'teaching-strategy', audience: 'teachers', priority: seed.priority - 2 },
      { keyword: `checklist for planning ${phrase}`, content_type: 'teaching-strategy', audience: 'teachers', priority: seed.priority - 3 }
    );
  } else if (seed.audience === 'parents') {
    base.push(
      { keyword: `how parents can support ${phrase}`, content_type: 'parent-guide', audience: 'parents', priority: seed.priority },
      { keyword: `checklist for helping with ${phrase} at home`, content_type: 'parent-guide', audience: 'parents', priority: seed.priority - 1 },
      { keyword: `common mistakes parents make with ${phrase}`, content_type: 'parent-guide', audience: 'parents', priority: seed.priority - 2 },
      { keyword: `guide to ${phrase} for parents`, content_type: 'parent-guide', audience: 'parents', priority: seed.priority - 3 }
    );
  } else {
    base.push(
      { keyword: `how to improve ${phrase}`, content_type: seed.content_type, audience: seed.audience, priority: seed.priority },
      { keyword: `best strategies for ${phrase}`, content_type: seed.content_type, audience: seed.audience, priority: seed.priority - 1 },
      { keyword: `checklist for building better ${phrase}`, content_type: seed.content_type, audience: seed.audience, priority: seed.priority - 2 },
      { keyword: `common mistakes with ${phrase} and how to fix them`, content_type: 'concept-explainer', audience: seed.audience, priority: seed.priority - 3 }
    );
  }

  return base.map((item) => ({
    ...item,
    grade_band: seed.grade_band,
    subject_area: seed.subject_area,
    cluster: seed.cluster,
    target_country: 'US',
    curriculum: 'general',
    learning_objective: `Help readers understand and apply ${item.keyword}.`,
    tone: 'supportive, practical, evidence-informed'
  }));
}

function focusSeeds(focus: string): TopicSeed[] {
  const parts = focus
    .split(/[,\n]/)
    .map((part) => titleCaseWords(part.toLowerCase()))
    .filter(Boolean);

  return parts.flatMap((topic, index) => {
    const lower = topic.toLowerCase();
    const seeds = [inferSeedFromTopic(lower, index)];

    if (lower.includes('exam')) {
      seeds.push(inferSeedFromTopic('active recall study methods for exams', index + 1));
      seeds.push(inferSeedFromTopic('test anxiety before final exams', index + 2));
    }
    if (lower.includes('classroom') || lower.includes('teaching')) {
      seeds.push(inferSeedFromTopic('classroom participation for quiet students', index + 3));
      seeds.push(inferSeedFromTopic('differentiated instruction for mixed ability classrooms', index + 4));
    }
    if (lower.includes('study')) {
      seeds.push(inferSeedFromTopic('student time management for busy school weeks', index + 5));
      seeds.push(inferSeedFromTopic('note taking methods for college lectures', index + 6));
    }

    return seeds;
  });
}

function deterministicKeywordIdeas(input: {
  count?: number;
  focus?: string;
  audience?: string;
  grade_band?: string;
}): GeneratedKeywordIdea[] {
  const count = Math.max(1, Math.min(input.count ?? 20, MAX_KEYWORD_IDEAS));
  const rawFocus = String(input.focus || '').trim();
  const seeds = isDefaultFocus(rawFocus)
    ? [...TOPIC_SEEDS, ...EXTRA_TOPICS.map(inferSeedFromTopic), ...dynamicTopicSeeds()]
    : [...focusSeeds(rawFocus), ...TOPIC_SEEDS, ...EXTRA_TOPICS.map(inferSeedFromTopic), ...dynamicTopicSeeds()];

  const requestedAudience = String(input.audience || 'mixed').toLowerCase().trim();
  const requestedGradeBand = String(input.grade_band || 'mixed').toLowerCase().trim();

  const candidates = seeds
    .filter((seed) => requestedAudience === 'mixed' || !requestedAudience || seed.audience === requestedAudience)
    .filter((seed) => requestedGradeBand === 'mixed' || !requestedGradeBand || seed.grade_band === requestedGradeBand)
    .flatMap(keywordTemplates)
    .map(normalizeIdea)
    .filter((item): item is GeneratedKeywordIdea => Boolean(item));

  return diversifyKeywordIdeas(candidates, { max: count, maxPerCluster: Math.max(4, Math.ceil(count / 8)) });
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
  const count = Math.max(1, Math.min(input.count ?? 20, MAX_KEYWORD_IDEAS));
  const useAi = process.env.KEYWORD_AI_MODE === 'true';

  if (!useAi) {
    return deterministicKeywordIdeas({ ...input, count });
  }

  const requestCount = Math.min(count * 2, MAX_KEYWORD_IDEAS);
  const focus = isDefaultFocus(input.focus)
    ? 'broad education topics across students, teachers, parents, reading, writing, math, science, special education, edtech, career guidance, study skills, and classroom strategies'
    : String(input.focus || 'education').trim();
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
- Avoid generic phrases like "education tips", "student success", "study better", or "learning advice".
- Avoid awkward robotic phrases.
- Avoid duplicate or near-duplicate ideas.
- Do not create multiple keywords with the same search intent. One article idea per intent cluster only.
- Keep the set diverse across audience, grade band, subject area, and content type.
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
      "cluster": "student-success | exam-prep | academic-writing | teaching-strategies | parent-guides | career-guidance | edtech | math-learning | science-learning | reading-skills | special-education | homeschooling",
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
    const ideas = diversifyKeywordIdeas(
      [...(result.ideas || []), ...deterministicKeywordIdeas({ ...input, count: MAX_KEYWORD_IDEAS })]
        .map(normalizeIdea)
        .filter((item): item is GeneratedKeywordIdea => Boolean(item)),
      { max: count, maxPerCluster: Math.max(4, Math.ceil(count / 8)) }
    );

    return ideas.length > 0 ? ideas : deterministicKeywordIdeas({ ...input, count });
  } catch (error) {
    if (!isAbortLikeError(error)) {
      console.warn('AI keyword generation failed. Falling back to deterministic keywords.', error);
    }
    return deterministicKeywordIdeas({ ...input, count });
  }
}
