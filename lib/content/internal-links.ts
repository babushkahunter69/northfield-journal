import { supabaseAdmin } from '@/lib/supabase-admin';
import { repairInternalLinks, removeRepeatedParagraphs } from './repairInternalLinks';

export type InternalLinkCandidate = {
  title: string;
  slug: string;
  url: string;
  keywords?: string[];
};

function stripHtml(html: string) {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeKeywords(input: unknown) {
  if (!Array.isArray(input)) return [];
  return input.map((item) => String(item || '').trim().toLowerCase()).filter(Boolean);
}

function tokenSet(...values: Array<string | null | undefined>) {
  const stopWords = new Set([
    'about', 'after', 'also', 'and', 'are', 'can', 'for', 'from', 'guide', 'help', 'how', 'into',
    'learn', 'learning', 'more', 'northfield', 'journal', 'practical', 'students', 'student', 'the',
    'their', 'this', 'tips', 'with', 'your'
  ]);

  const tokens = new Set<string>();
  for (const value of values) {
    String(value || '')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 2 && !stopWords.has(token))
      .forEach((token) => tokens.add(token));
  }
  return tokens;
}

function scoreCandidate(candidate: InternalLinkCandidate, contextTokens: Set<string>) {
  const candidateTokens = tokenSet(candidate.title, ...(candidate.keywords || []));
  let score = 0;
  for (const token of candidateTokens) {
    if (contextTokens.has(token)) score += 3;
  }
  return score;
}

function isPublicPost(row: any) {
  const hasStatus = Object.prototype.hasOwnProperty.call(row || {}, 'status');
  const hasPublished = Object.prototype.hasOwnProperty.call(row || {}, 'published');
  const status = String(row?.status || '').toLowerCase();

  if (hasStatus) return status === 'published' || status === 'live';
  if (hasPublished) return row.published === true;
  return false;
}

async function getPublishedPosts() {
  async function query(columns: string) {
    return supabaseAdmin.from('posts').select(columns).not('slug', 'is', null).limit(500);
  }

  let response = await query('title, slug, excerpt, keywords, status, published');
  if (response.error && /published/i.test(response.error.message || '')) response = await query('title, slug, excerpt, keywords, status');
  if (response.error && /status/i.test(response.error.message || '')) response = await query('title, slug, excerpt, keywords, published');
  if (response.error && /status|published/i.test(response.error.message || '')) response = await query('title, slug, excerpt, keywords');
  if (response.error) return [];

  return (response.data || []).filter((row: any) => isPublicPost(row));
}

export function isBlogInternalPath(path: string) {
  return /^\/blog\/[a-z0-9][a-z0-9-]*$/i.test(String(path || '').trim());
}

export async function getPublishedInternalLinkCandidates(params: {
  excludeSlug?: string | null;
  title?: string | null;
  excerpt?: string | null;
  content?: string | null;
  keywords?: string[] | null;
  category?: string | null;
  limit?: number;
}): Promise<InternalLinkCandidate[]> {
  const rows = await getPublishedPosts();
  const excludeSlug = String(params.excludeSlug || '').trim();
  const contextTokens = tokenSet(
    params.title || '',
    params.excerpt || '',
    stripHtml(params.content || '').slice(0, 1200),
    ...(params.keywords || [])
  );

  return rows
    .map((post: any) => ({
      title: String(post.title || '').trim(),
      slug: String(post.slug || '').trim(),
      url: `/blog/${String(post.slug || '').trim()}`,
      keywords: normalizeKeywords(post.keywords)
    }))
    .filter((post: InternalLinkCandidate) => post.title && post.slug && post.slug !== excludeSlug)
    .filter((post: InternalLinkCandidate) => isBlogInternalPath(post.url))
    .map((post: InternalLinkCandidate) => ({ post, score: scoreCandidate(post, contextTokens) }))
    .filter((item: { score: number }) => item.score > 0)
    .sort((a: { score: number }, b: { score: number }) => b.score - a.score)
    .slice(0, params.limit ?? 6)
    .map((item: { post: InternalLinkCandidate }) => item.post);
}

export async function getPublishedInternalLinkSuggestions(params: {
  excludeSlug?: string | null;
  title?: string | null;
  excerpt?: string | null;
  content?: string | null;
  keywords?: string[] | null;
  category?: string | null;
  limit?: number;
}) {
  const candidates = await getPublishedInternalLinkCandidates(params);
  return candidates.map((candidate) => candidate.url);
}

// Backward-compatible names used by the existing API route and fixer.
export async function removeInvalidBlogInternalLinks(content: string) {
  return repairInternalLinks(content);
}

export { repairInternalLinks, removeRepeatedParagraphs };
