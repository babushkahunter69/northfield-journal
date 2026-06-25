import { supabaseAdmin } from '@/lib/supabase-admin';
import { isNearDuplicateKeyword, keywordIntentKey, keywordTokens } from '@/lib/ai/keyword-diversity';

export type DuplicatePostMatch = {
  id: string;
  title: string;
  slug: string;
  status: string | null;
  reason: string;
};

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'best', 'by', 'can', 'for', 'from',
  'guide', 'how', 'in', 'into', 'is', 'learn', 'of', 'on', 'or', 'practical',
  'simple', 'students', 'student', 'teacher', 'teachers', 'the', 'this', 'to',
  'tips', 'with', 'without', 'your', 'their', 'them', 'better', 'improve', 'help',
  'helping', 'building', 'planning', 'practice', 'examples', 'activities', 'checklist'
]);

const SEMANTIC_TOPIC_ALIASES: Array<{ key: string; patterns: RegExp[] }> = [
  { key: 'research-paper', patterns: [/\bresearch paper(s)?\b/i, /\bresearch writing\b/i, /\bacademic research\b/i] },
  { key: 'citation-skills', patterns: [/\bcitation(s)?\b/i, /\bciting sources\b/i, /\bmla\b/i, /\bapa\b/i] },
  { key: 'essay-introductions', patterns: [/\bessay introduction(s)?\b/i, /\bintroduction paragraph(s)?\b/i, /\bintroductory paragraph(s)?\b/i] },
  { key: 'thesis-statements', patterns: [/\bthesis statement(s)?\b/i, /\bargumentative thesis\b/i] },
  { key: 'study-routines', patterns: [/\bstudy routine(s)?\b/i, /\bstudy plan(s)?\b/i, /\bweekly study\b/i, /\bhomework routine(s)?\b/i, /\bstudent routine(s)?\b/i, /\bstudy schedule(s)?\b/i] },
  { key: 'time-management', patterns: [/\btime management\b/i, /\bplanner system(s)?\b/i, /\bassignment planner(s)?\b/i] },
  { key: 'note-taking', patterns: [/\bnote[ -]?taking\b/i, /\bclass notes\b/i, /\bcornell notes\b/i] },
  { key: 'exam-stress', patterns: [/\btest anxiety\b/i, /\bexam stress\b/i, /\bexam anxiety\b/i, /\btesting stress\b/i] },
  { key: 'exam-prep', patterns: [/\bexam prep\b/i, /\bexam preparation\b/i, /\btest prep\b/i, /\btest preparation\b/i, /\bfinal exams?\b/i] },
  { key: 'formative-assessment', patterns: [/\bformative assessment(s)?\b/i, /\bquick feedback\b/i, /\bexit ticket(s)?\b/i] },
  { key: 'parent-teacher-conference', patterns: [/\bparent teacher conference(s)?\b/i, /\bparent-teacher conference(s)?\b/i, /\bschool meeting(s)?\b/i] },
  { key: 'reading-comprehension', patterns: [/\breading comprehension\b/i, /\bmain idea\b/i, /\bnonfiction reading\b/i] },
  { key: 'phonemic-awareness', patterns: [/\bphonemic awareness\b/i, /\bphonological awareness\b/i] },
  { key: 'vocabulary-skills', patterns: [/\bvocabulary skill(s)?\b/i, /\bvocabulary development\b/i, /\bacademic vocabulary\b/i] },
  { key: 'fractions', patterns: [/\bfraction(s)?\b/i] },
  { key: 'algebra-mistakes', patterns: [/\balgebra mistake(s)?\b/i, /\balgebra error(s)?\b/i] },
  { key: 'differentiated-instruction', patterns: [/\bdifferentiated instruction\b/i, /\bmixed ability classroom(s)?\b/i] },
  { key: 'dyslexia-support', patterns: [/\bdyslexia\b/i, /\bdyslexic\b/i] },
  { key: 'iep-accommodations', patterns: [/\biep\b/i, /\baccommodation(s)?\b/i] },
  { key: 'adhd-study', patterns: [/\badhd\b/i] },
  { key: 'classroom-participation', patterns: [/\bclassroom participation\b/i, /\bquiet students\b/i, /\bclass discussion\b/i] },
  { key: 'claim-evidence-reasoning', patterns: [/\bclaim evidence reasoning\b/i, /\bcer\b/i] },
  { key: 'science-fair', patterns: [/\bscience fair\b/i] },
  { key: 'student-organization', patterns: [/\bstudent organization\b/i, /\borganization app(s)?\b/i, /\borganized student(s)?\b/i, /\bmessy binder(s)?\b/i] },
  { key: 'career-readiness', patterns: [/\bcareer readiness\b/i, /\bcareer exploration\b/i, /\bcollege readiness\b/i] },
  { key: 'homeschool-schedule', patterns: [/\bhomeschool schedule(s)?\b/i, /\bhomeschool routine(s)?\b/i] },
  { key: 'ai-plagiarism', patterns: [/\bai plagiarism\b/i, /\bai writing tool(s)?\b/i] }
];

function compactText(value: unknown) {
  return String(value || '').toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export function normalizeTopic(value: unknown) {
  return compactText(value)
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function topicSlug(value: unknown) {
  return normalizeTopic(value)
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function topicTokens(value: unknown) {
  return normalizeTopic(value)
    .split(/\s+/)
    .map((token) => token.trim().replace(/ies$/, 'y').replace(/ing$/, '').replace(/s$/, ''))
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function tokenSimilarity(a: unknown, b: unknown) {
  const aTokens = new Set(topicTokens(a));
  const bTokens = new Set(topicTokens(b));

  if (aTokens.size === 0 || bTokens.size === 0) return 0;

  let intersection = 0;
  for (const token of aTokens) {
    if (bTokens.has(token)) intersection += 1;
  }

  const union = new Set([...aTokens, ...bTokens]).size;
  const jaccard = intersection / union;
  const containment = intersection / Math.min(aTokens.size, bTokens.size);
  return Math.max(jaccard, containment);
}

function semanticTopicKeys(value: unknown) {
  const text = compactText(value);
  const keys = new Set<string>();

  for (const alias of SEMANTIC_TOPIC_ALIASES) {
    if (alias.patterns.some((pattern) => pattern.test(text))) {
      keys.add(alias.key);
    }
  }

  const tokens = Array.from(new Set(keywordTokens(text)));
  const important = tokens.filter((token) => !STOP_WORDS.has(token));
  if (keys.size === 0 && important.length >= 2) {
    keys.add(important.slice(0, 4).sort().join('|'));
  }

  return keys;
}

function hasSharedSemanticTopic(a: unknown, b: unknown) {
  const aKeys = semanticTopicKeys(a);
  const bKeys = semanticTopicKeys(b);
  if (aKeys.size === 0 || bKeys.size === 0) return false;

  for (const key of aKeys) {
    if (bKeys.has(key)) return true;
  }

  return false;
}

function combinedPostText(post: {
  title?: string | null;
  slug?: string | null;
  excerpt?: string | null;
  keywords?: unknown;
}) {
  const keywordText = Array.isArray(post.keywords) ? post.keywords.join(' ') : '';
  return [post.title, post.slug, post.excerpt, keywordText].filter(Boolean).join(' ');
}

function keywordAppearsInPostKeywords(keyword: string, keywords: unknown) {
  if (!Array.isArray(keywords)) return false;
  const normalizedKeyword = normalizeTopic(keyword);

  return keywords.some((item) => normalizeTopic(item) === normalizedKeyword);
}

export async function findExistingPostForTopic(topic: string): Promise<DuplicatePostMatch | null> {
  const normalizedTopic = normalizeTopic(topic);
  const slug = topicSlug(topic);

  if (!normalizedTopic || normalizedTopic.length < 4) return null;

  const response = await supabaseAdmin
    .from('posts')
    .select('id, title, slug, status, keywords, excerpt')
    .order('created_at', { ascending: false })
    .limit(500);

  if (response.error) {
    throw new Error(response.error.message || 'Failed to check existing posts for duplicate topics.');
  }

  for (const post of response.data || []) {
    const title = String(post.title || '');
    const postSlug = String(post.slug || '');
    const excerpt = String(post.excerpt || '');
    const status = String(post.status || '');

    if (keywordAppearsInPostKeywords(normalizedTopic, post.keywords)) {
      return { id: post.id, title, slug: postSlug, status, reason: 'keyword already attached to an existing post' };
    }

    if (slug && postSlug && (postSlug === slug || postSlug.includes(slug) || slug.includes(postSlug))) {
      return { id: post.id, title, slug: postSlug, status, reason: 'slug is already used by an existing post' };
    }

    const postText = combinedPostText(post);

    if (hasSharedSemanticTopic(normalizedTopic, postText)) {
      return { id: post.id, title, slug: postSlug, status, reason: 'topic intent is already covered by an existing post' };
    }

    if (keywordIntentKey(normalizedTopic) && keywordIntentKey(normalizedTopic) === keywordIntentKey(postText)) {
      return { id: post.id, title, slug: postSlug, status, reason: 'keyword intent key matches an existing post' };
    }

    if (isNearDuplicateKeyword(normalizedTopic, title)) {
      return { id: post.id, title, slug: postSlug, status, reason: 'title has the same search intent as an existing post' };
    }

    const titleSimilarity = tokenSimilarity(normalizedTopic, title);
    if (titleSimilarity >= 0.72) {
      return { id: post.id, title, slug: postSlug, status, reason: 'title is too similar to an existing post' };
    }

    const excerptSimilarity = tokenSimilarity(normalizedTopic, excerpt);
    if (excerptSimilarity >= 0.78) {
      return { id: post.id, title, slug: postSlug, status, reason: 'excerpt is too similar to an existing post' };
    }
  }

  return null;
}

export async function markKeywordSkippedAsDuplicate(keywordId: string, match: DuplicatePostMatch) {
  await supabaseAdmin
    .from('content_keywords')
    .update({
      status: 'skipped',
      last_error: `Skipped duplicate: ${match.reason} (${match.title})`,
      last_attempted_at: new Date().toISOString()
    })
    .eq('id', keywordId);
}

export async function assertKeywordIsNotDuplicate(keyword: { id: string; keyword: string }) {
  const match = await findExistingPostForTopic(keyword.keyword);

  if (!match) return null;

  await markKeywordSkippedAsDuplicate(keyword.id, match);

  throw new Error(
    `Skipped duplicate keyword "${keyword.keyword}" because ${match.reason}: ${match.title}`
  );
}
