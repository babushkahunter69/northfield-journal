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


const EXTERNAL_SOURCE_BLOCK_HEADINGS = [
  'Sources',
  'Related Resources',
  'Additional Resources',
  'References'
];

function isExternalUrl(value: string) {
  return /^https?:\/\//i.test(String(value || '').trim());
}

function normalizeExternalUrl(value: string) {
  try {
    const parsed = new URL(String(value || '').trim());
    if (!/^https?:$/i.test(parsed.protocol)) return '';
    return parsed.toString();
  } catch {
    return '';
  }
}

async function isReachableExternalUrl(url: string) {
  const normalized = normalizeExternalUrl(url);
  if (!normalized) return false;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);

  try {
    let response = await fetch(normalized, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': 'Mozilla/5.0 NorthfieldJournalBot/1.0; link-checker',
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    if (response.status === 405 || response.status === 403) {
      response = await fetch(normalized, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'user-agent': 'Mozilla/5.0 NorthfieldJournalBot/1.0; link-checker',
          accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });
    }

    return response.status >= 200 && response.status < 400;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function unlinkInvalidExternalAnchors(content: string) {
  const cache = new Map<string, boolean>();

  async function reachable(url: string) {
    const normalized = normalizeExternalUrl(url);
    if (!normalized) return false;
    if (!cache.has(normalized)) cache.set(normalized, await isReachableExternalUrl(normalized));
    return cache.get(normalized) === true;
  }

  let next = String(content || '');
  const htmlMatches = Array.from(next.matchAll(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi));
  for (const match of htmlMatches) {
    const [full, href, label] = match;
    if (!isExternalUrl(href)) continue;
    if (!(await reachable(href))) next = next.replace(full, label);
  }

  const mdMatches = Array.from(next.matchAll(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/gi));
  for (const match of mdMatches) {
    const [full, label, href] = match;
    if (!(await reachable(href))) next = next.replace(full, label);
  }

  return next;
}

function removeEmptySourceSections(content: string) {
  let next = String(content || '');

  for (const heading of EXTERNAL_SOURCE_BLOCK_HEADINGS) {
    const escaped = escapeRegExp(heading);
    next = next.replace(
      new RegExp(`<h2[^>]*>\\s*${escaped}\\s*<\\/h2>\\s*(?:<ul>\\s*<\\/ul>|<p>\\s*<\\/p>|\\s)*(?=<h2|$)`, 'gi'),
      ''
    );
    next = next.replace(
      new RegExp(`(^|\\n)#{2,3}\\s*${escaped}\\s*(?:\\n\\s*)*(?=#{2,3}\\s|$)`, 'gi'),
      '\n'
    );
  }

  return next;
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
  next = await unlinkInvalidExternalAnchors(next);

  next = removeKnownBadGeneratedLinkText(next);
  next = removeEmptySourceSections(next);
  next = removeRepeatedParagraphs(next);

  return cleanupEmptyArtifacts(next);
}
