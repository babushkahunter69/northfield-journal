import { supabaseAdmin } from '@/lib/supabase-admin';

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
  'tips', 'with', 'without', 'your'
]);

export function normalizeTopic(value: unknown) {
  return String(value || '')
    .toLowerCase()
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
    .map((token) => token.trim())
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

  return intersection / Math.min(aTokens.size, bTokens.size);
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

    const titleSimilarity = tokenSimilarity(normalizedTopic, title);
    if (titleSimilarity >= 0.82) {
      return { id: post.id, title, slug: postSlug, status, reason: 'title is too similar to an existing post' };
    }

    const excerptSimilarity = tokenSimilarity(normalizedTopic, excerpt);
    if (excerptSimilarity >= 0.92) {
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
