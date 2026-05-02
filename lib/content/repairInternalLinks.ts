import { supabaseAdmin } from '@/lib/supabase-admin';

export type RepairContext = {
  excludeSlug?: string | null;
  title?: string | null;
  excerpt?: string | null;
  keywords?: string[] | null;
};

const STATIC_INTERNAL_PATHS = new Set([
  '/',
  '/journal',
  '/about',
  '/contact',
  '/contribute',
  '/guest-post'
]);

const GENERATED_LINK_BLOCK_STARTS = [
  'related reading:',
  'recommended reading:',
  'further reading:',
  'for more advice',
  'for more guidance',
  'for more support',
  'for additional support',
  'explore our articles',
  'explore more education guides'
];

const KNOWN_BAD_GENERATED_LINK_PHRASES = [
  'building motivation in students',
  'effective parent-teacher communication',
  'time management for students',
  'effective study habits'
];

const KNOWN_BAD_GENERATED_SLUGS = [
  'building-motivation-in-students',
  'effective-parent-teacher-communication',
  'time-management-for-students',
  'effective-study-habits'
];

function escapeRegExp(value: string) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripTags(value: string) {
  return String(value || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizePath(value: string) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  try {
    if (/^https?:\/\//i.test(raw)) {
      const parsed = new URL(raw);
      const host = parsed.hostname.toLowerCase();
      const allowed = host === 'northfieldjournal.com' || host === 'www.northfieldjournal.com' || host === 'localhost';
      if (!allowed) return '';
      return (parsed.pathname || '/').replace(/\/$/, '') || '/';
    }
  } catch {
    return '';
  }

  const noQuery = raw.split('#')[0].split('?')[0].trim();
  if (!noQuery.startsWith('/')) return '';
  return noQuery.replace(/\/$/, '') || '/';
}

function slugFromPath(path: string) {
  const normalized = normalizePath(path);
  if (/^\/blog\/[a-z0-9][a-z0-9-]*$/i.test(normalized)) return normalized.replace(/^\/blog\//i, '');
  if (/^\/[a-z0-9][a-z0-9-]*$/i.test(normalized) && !STATIC_INTERNAL_PATHS.has(normalized)) return normalized.slice(1);
  return '';
}

function isGeneratedLinkBlock(text: string) {
  const clean = stripTags(text).toLowerCase();
  return GENERATED_LINK_BLOCK_STARTS.some((start) => clean.startsWith(start) || clean.includes(start));
}

function containsKnownBadPhrase(text: string) {
  const clean = stripTags(text).toLowerCase();
  return KNOWN_BAD_GENERATED_LINK_PHRASES.some((phrase) => clean.includes(phrase));
}

function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}

function extractLinkedSlugs(content: string) {
  const slugs: string[] = [];

  for (const match of String(content || '').matchAll(/href=["']([^"']+)["']/gi)) {
    const slug = slugFromPath(match[1]);
    if (slug) slugs.push(slug);
  }

  for (const match of String(content || '').matchAll(/\[[^\]]+\]\(([^)]+)\)/gi)) {
    const slug = slugFromPath(match[1]);
    if (slug) slugs.push(slug);
  }

  return unique(slugs);
}

async function fetchPublishedSlugs(slugs?: string[]) {
  const wanted = unique((slugs || []).map((slug) => String(slug || '').trim()).filter(Boolean));
  if (slugs && wanted.length === 0) return new Set<string>();

  async function query(columns: string) {
    let request = supabaseAdmin.from('posts').select(columns).not('slug', 'is', null);
    if (wanted.length) request = request.in('slug', wanted);
    return request.limit(wanted.length ? Math.max(wanted.length, 1) : 500);
  }

  let response = await query('slug, status, published');
  if (response.error && /published/i.test(response.error.message || '')) response = await query('slug, status');
  if (response.error && /status/i.test(response.error.message || '')) response = await query('slug, published');
  if (response.error && /published|status/i.test(response.error.message || '')) response = await query('slug');
  if (response.error) throw response.error;

  const out = new Set<string>();
  for (const row of response.data || []) {
    const slug = String((row as any).slug || '').trim();
    if (!slug) continue;

    const hasStatus = Object.prototype.hasOwnProperty.call(row || {}, 'status');
    const hasPublished = Object.prototype.hasOwnProperty.call(row || {}, 'published');
    const status = String((row as any).status || '').toLowerCase();

    if (hasStatus && ['published', 'live'].includes(status)) out.add(slug);
    else if (!hasStatus && hasPublished && (row as any).published === true) out.add(slug);
    else if (!hasStatus && !hasPublished) out.add(slug);
  }

  return out;
}

export function removeRepeatedParagraphs(content: string) {
  const seen = new Set<string>();
  let next = String(content || '');

  next = next.replace(/<p[^>]*>[\s\S]*?<\/p>/gi, (full) => {
    const text = stripTags(full).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (text.length < 90) return full;
    const signature = text.slice(0, 220);
    if (seen.has(signature)) return '';
    seen.add(signature);
    return full;
  });

  const plainSeen = new Set<string>();
  next = next
    .split(/\n{2,}/)
    .filter((block) => {
      const text = stripTags(block).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      if (text.length < 90) return true;
      const signature = text.slice(0, 220);
      if (plainSeen.has(signature)) return false;
      plainSeen.add(signature);
      return true;
    })
    .join('\n\n');

  return next;
}

function removeKnownBadGeneratedLinkText(content: string) {
  let next = String(content || '');

  // Remove whole HTML paragraphs that contain known fake internal-link phrases.
  next = next.replace(/<p[^>]*>[\s\S]*?<\/p>/gi, (full) => {
    return containsKnownBadPhrase(full) || isGeneratedLinkBlock(full) ? '' : full;
  });

  // Remove Markdown/plain paragraphs that are generated related-reading blocks.
  next = next
    .split(/\n{2,}/)
    .filter((block) => !isGeneratedLinkBlock(block) && !containsKnownBadPhrase(block))
    .join('\n\n');

  // Remove sentence-level generated snippets even when they are inside a larger block.
  next = next.replace(/(?:Related reading|Recommended reading|Further reading):\s*[^\n.]+(?:\.|\n|$)/gi, '');
  next = next.replace(/For more (?:advice|guidance|support)[^\n.]*?(?:see|explore)[^\n.]+(?:\.|\n|$)/gi, '');
  next = next.replace(/For more support, explore[^\n.]+(?:\.|\n|$)/gi, '');

  for (const phrase of KNOWN_BAD_GENERATED_LINK_PHRASES) {
    const pattern = new RegExp(`(?:[^.!?]*\\b${escapeRegExp(phrase)}\\b[^.!?]*[.!?])`, 'gi');
    next = next.replace(pattern, '');
    next = next.replace(new RegExp(escapeRegExp(phrase), 'gi'), '');
  }

  for (const slug of KNOWN_BAD_GENERATED_SLUGS) {
    next = next.replace(new RegExp(`\\[([^\\]]+)\\]\\((?:/blog/|/)${escapeRegExp(slug)}\\)`, 'gi'), '$1');
    next = next.replace(new RegExp(`<a\\s+[^>]*href=["'](?:/blog/|/)${escapeRegExp(slug)}["'][^>]*>([\\s\\S]*?)<\\/a>`, 'gi'), '$1');
    next = next.replace(new RegExp(`(?:https?:\\/\\/(?:www\\.)?northfieldjournal\\.com)?(?:/blog)?/${escapeRegExp(slug)}`, 'gi'), '');
  }

  return next;
}

function unlinkInvalidAnchors(content: string, publishedSlugs: Set<string>) {
  let next = String(content || '');

  next = next.replace(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (full, href, label) => {
    const path = normalizePath(href);
    if (!path || STATIC_INTERNAL_PATHS.has(path)) return full;

    const slug = slugFromPath(path);
    if (!slug) return label;
    if (!publishedSlugs.has(slug)) return label;

    return `<a href="/blog/${slug}">${label}</a>`;
  });

  next = next.replace(/\[([^\]]+)\]\(([^)]+)\)/gi, (full, label, href) => {
    const path = normalizePath(href);
    if (!path || STATIC_INTERNAL_PATHS.has(path)) return full;

    const slug = slugFromPath(path);
    if (!slug) return label;
    if (!publishedSlugs.has(slug)) return label;

    return `[${label}](/blog/${slug})`;
  });

  return next;
}


function normalizeHeadingText(value: string) {
  return stripTags(value)
    .toLowerCase()
    .replace(/&amp;/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(the|a|an|and|or|for|to|of|in|with|this|that|these|those)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function headingFamily(value: string) {
  const clean = normalizeHeadingText(value);
  if (!clean) return '';
  if (/^what (this|it) (looks|can look) like/.test(clean)) return 'what-it-looks-like';
  if (/^why .* (deserves|needs) /.test(clean)) return 'why-topic-matters';
  if (/^start with learner current challenge/.test(clean)) return 'start-current-challenge';
  if (/^frequently asked questions$|^faq$|^faqs$/.test(clean)) return 'faq';
  if (/^next steps$|^what you should do next$|^what to do next$/.test(clean)) return 'next-steps';
  if (/^additional resources$|^related reading$|^recommended reading$|^further reading$/.test(clean)) return 'resource-links';
  return clean;
}

function removeDuplicateHeadingsAndSections(content: string) {
  let next = String(content || '');
  const seen = new Set<string>();

  next = next.replace(/<h([23])([^>]*)>([\s\S]*?)<\/h\1>([\s\S]*?)(?=<h[23][^>]*>|$)/gi, (full, level, attrs, heading, body) => {
    const family = headingFamily(heading);
    if (!family) return full;
    if (seen.has(family)) return '';
    seen.add(family);
    return `<h${level}${attrs}>${String(heading).trim()}</h${level}>${body}`;
  });

  // Remove leftover duplicate plain heading lines that can appear when pasted markdown is rendered as text.
  const lines = next.split(/\n/);
  const plainSeen = new Set<string>();
  next = lines
    .filter((line) => {
      const clean = normalizeHeadingText(line);
      if (!clean || clean.length < 8) return true;
      const looksLikeHeading = !/[.!?]$/.test(stripTags(line)) && stripTags(line).split(/\s+/).length <= 12;
      if (!looksLikeHeading) return true;
      const family = headingFamily(line);
      if (plainSeen.has(family)) return false;
      plainSeen.add(family);
      return true;
    })
    .join('\n');

  return next;
}

function removeRepeatedIdeaBlocks(content: string) {
  const seen = new Set<string>();
  return String(content || '').replace(/<p[^>]*>[\s\S]*?<\/p>/gi, (full) => {
    const words = stripTags(full)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 3);
    if (words.length < 18) return full;
    const signature = words.slice(0, 22).join(' ');
    if (seen.has(signature)) return '';
    seen.add(signature);
    return full;
  });
}

export function normalizeArticleStructure(content: string) {
  let next = String(content || '');
  next = removeDuplicateHeadingsAndSections(next);
  next = removeRepeatedIdeaBlocks(next);
  next = removeRepeatedParagraphs(next);
  next = next.replace(/<h[23][^>]*>\s*Start with the learner['’]s current challenge\s*<\/h[23]>\s*<h[23][^>]*>\s*Start with the learner['’]s current challenge\s*<\/h[23]>/gi, '<h2>Start with the learner\'s current challenge</h2>');
  return cleanupEmptyArtifacts(next);
}

function cleanupEmptyArtifacts(content: string) {
  return String(content || '')
    .replace(/<p>\s*<\/p>/gi, '')
    .replace(/\s+([,.!?;:])/g, '$1')
    .replace(/\(\s*\)/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function repairInternalLinks(content: string, _context: RepairContext = {}) {
  let next = String(content || '');

  next = removeKnownBadGeneratedLinkText(next);

  const linkedSlugs = extractLinkedSlugs(next);
  const publishedSlugs = await fetchPublishedSlugs(linkedSlugs);
  next = unlinkInvalidAnchors(next, publishedSlugs);

  next = removeKnownBadGeneratedLinkText(next);
  next = normalizeArticleStructure(next);

  return cleanupEmptyArtifacts(next);
}
