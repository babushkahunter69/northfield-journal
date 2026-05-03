import { supabaseAdmin } from '@/lib/supabase-admin';

export type RepairContext = {
  excludeSlug?: string | null;
  title?: string | null;
  excerpt?: string | null;
  keywords?: string[] | null;
};

const STATIC_INTERNAL_PATHS = new Set(['/', '/journal', '/about', '/contact', '/contribute', '/guest-post']);

const GENERATED_LINK_BLOCK_STARTS = [
  'related reading:',
  'related resources',
  'recommended reading:',
  'further reading:',
  'additional resources',
  'for more advice',
  'for more guidance',
  'for more support',
  'for additional support',
  'explore our articles',
  'explore more education guides'
];

const BAD_GENERATED_PHRASES = [
  'building motivation in students',
  'effective parent-teacher communication',
  'time management for students',
  'effective study habits',
  'guest post opportunities',
  'more education guides'
];

const BAD_GENERATED_SLUGS = [
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

function isGeneratedBlock(text: string) {
  const clean = stripTags(text).toLowerCase();
  return GENERATED_LINK_BLOCK_STARTS.some((start) => clean.startsWith(start) || clean.includes(start));
}

function containsBadGeneratedPhrase(text: string) {
  const clean = stripTags(text).toLowerCase();
  return BAD_GENERATED_PHRASES.some((phrase) => clean.includes(phrase));
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

  return Array.from(new Set(slugs));
}

async function fetchPublishedSlugs(slugs?: string[]) {
  const wanted = Array.from(new Set((slugs || []).map((slug) => String(slug || '').trim()).filter(Boolean)));
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
  const seenParagraphs = new Set<string>();
  const seenHeadings = new Set<string>();
  let next = String(content || '');

  next = next.replace(/<h([23])[^>]*>([\s\S]*?)<\/h\1>/gi, (full, level, inner) => {
    const key = stripTags(inner).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (!key) return '';
    if (seenHeadings.has(key)) return '';
    seenHeadings.add(key);
    return full;
  });

  next = next.replace(/<p[^>]*>[\s\S]*?<\/p>/gi, (full) => {
    const text = stripTags(full).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (text.length < 90) return full;
    const signature = text.slice(0, 220);
    if (seenParagraphs.has(signature)) return '';
    seenParagraphs.add(signature);
    return full;
  });

  const plainSeen = new Set<string>();
  next = next
    .split(/\n{2,}/)
    .filter((block) => {
      const clean = stripTags(block).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      if (!clean) return false;
      if (clean.length < 90) return true;
      const signature = clean.slice(0, 220);
      if (plainSeen.has(signature)) return false;
      plainSeen.add(signature);
      return true;
    })
    .join('\n\n');

  return next;
}

function markdownHeadingsToHtml(content: string) {
  return String(content || '')
    .replace(/^###\s+(.+)$/gim, '<h3>$1</h3>')
    .replace(/^##\s+(.+)$/gim, '<h2>$1</h2>')
    .replace(/^#\s+(.+)$/gim, '<h2>$1</h2>');
}

function removeGeneratedLinkText(content: string) {
  let next = String(content || '');

  next = next.replace(/<p[^>]*>[\s\S]*?<\/p>/gi, (full) => {
    return isGeneratedBlock(full) || containsBadGeneratedPhrase(full) ? '' : full;
  });

  next = next
    .split(/\n{2,}/)
    .filter((block) => !isGeneratedBlock(block) && !containsBadGeneratedPhrase(block))
    .join('\n\n');

  next = next.replace(/(?:Related reading|Recommended reading|Further reading):\s*[^\n.]+(?:\.|\n|$)/gi, '');
  next = next.replace(/For more (?:advice|guidance|support)[^\n.]*?(?:see|explore)[^\n.]+(?:\.|\n|$)/gi, '');
  next = next.replace(/For more support, explore[^\n.]+(?:\.|\n|$)/gi, '');

  for (const phrase of BAD_GENERATED_PHRASES) {
    const escaped = escapeRegExp(phrase);
    next = next.replace(new RegExp(`[^.!?]*\\b${escaped}\\b[^.!?]*[.!?]`, 'gi'), '');
    next = next.replace(new RegExp(escaped, 'gi'), '');
  }

  for (const slug of BAD_GENERATED_SLUGS) {
    const escaped = escapeRegExp(slug);
    next = next.replace(new RegExp(`\\[([^\\]]+)\\]\\((?:/blog/|/)${escaped}\\)`, 'gi'), '$1');
    next = next.replace(new RegExp(`<a\\s+[^>]*href=["'](?:/blog/|/)${escaped}["'][^>]*>([\\s\\S]*?)<\\/a>`, 'gi'), '$1');
    next = next.replace(new RegExp(`(?:https?:\\/\\/(?:www\\.)?northfieldjournal\\.com)?(?:/blog)?/${escaped}`, 'gi'), '');
  }

  return next;
}

function unlinkInvalidAnchors(content: string, publishedSlugs: Set<string>) {
  let next = String(content || '');
  let validCount = 0;
  const maxLinks = 5;

  next = next.replace(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (full, href, label) => {
    const path = normalizePath(href);
    if (!path || STATIC_INTERNAL_PATHS.has(path)) return full;

    const slug = slugFromPath(path);
    if (!slug) return label;
    if (!publishedSlugs.has(slug)) return label;
    validCount += 1;
    if (validCount > maxLinks) return label;

    return `<a href="/blog/${slug}">${label}</a>`;
  });

  next = next.replace(/\[([^\]]+)\]\(([^)]+)\)/gi, (full, label, href) => {
    const path = normalizePath(href);
    if (!path || STATIC_INTERNAL_PATHS.has(path)) return full;

    const slug = slugFromPath(path);
    if (!slug) return label;
    if (!publishedSlugs.has(slug)) return label;
    validCount += 1;
    if (validCount > maxLinks) return label;

    return `<a href="/blog/${slug}">${label}</a>`;
  });

  return next;
}

function cleanupEmptyArtifacts(content: string) {
  return String(content || '')
    .replace(/<p>\s*<\/p>/gi, '')
    .replace(/<h[23][^>]*>\s*<\/h[23]>/gi, '')
    .replace(/\s+([,.!?;:])/g, '$1')
    .replace(/\(\s*\)/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function repairInternalLinks(content: string, _context: RepairContext = {}) {
  let next = markdownHeadingsToHtml(String(content || ''));
  next = removeGeneratedLinkText(next);

  const linkedSlugs = extractLinkedSlugs(next);
  const publishedSlugs = await fetchPublishedSlugs(linkedSlugs);
  next = unlinkInvalidAnchors(next, publishedSlugs);

  next = removeGeneratedLinkText(next);
  next = removeRepeatedParagraphs(next);
  return cleanupEmptyArtifacts(next);
}
