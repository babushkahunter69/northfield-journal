import { supabaseAdmin } from '@/lib/supabase-admin';

const PEXELS_API_BASE = 'https://api.pexels.com/v1/search';
const STORAGE_BUCKET = process.env.NEXT_PUBLIC_STORAGE_BUCKET || 'post-media';

type SearchInput = {
  title: string;
  excerpt?: string;
  content?: string;
  category?: string;
  slug: string;
};

type PexelsPhoto = {
  id: number;
  width: number;
  height: number;
  photographer?: string;
  photographer_url?: string;
  alt?: string;
  src?: {
    original?: string;
    large2x?: string;
    large?: string;
    landscape?: string;
    medium?: string;
  };
};

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `cover-${Date.now()}`;
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, ' ');
}

function extractHeadings(content: string) {
  const headings = Array.from(content.matchAll(/<h[23][^>]*>(.*?)<\/h[23]>/gi))
    .map((m) => stripHtml(m[1] || '').trim())
    .filter(Boolean);
  return headings.slice(0, 4);
}

function importantTerms(text: string) {
  const stop = new Set([
    'the','a','an','and','or','but','for','with','from','into','over','under','your','their','about','this','that','these','those','how','what','when','where','why','can','will','into','through','after','before','more','less','than','make','build','guide','tips','best','using','student','students','teacher','teachers','school','education','academic'
  ]);
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stop.has(w))
    .slice(0, 8);
}

function categoryStyles(category?: string) {
  const key = (category || 'education').toLowerCase();
  const styles: Record<string, string[]> = {
    education: ['classroom', 'learning', 'study desk', 'campus'],
    'student-success': ['student studying', 'library', 'notebook', 'focus'],
    'teaching-craft': ['teacher classroom', 'lesson planning', 'whiteboard'],
    edtech: ['laptop learning', 'online classroom', 'education technology'],
    'school-leadership': ['school meeting', 'principal office', 'education leadership'],
    'scholarships-access': ['college campus', 'student application', 'financial aid'],
    'academic-writing': ['writing desk', 'essay editing', 'student writing']
  };
  return styles[key] || styles.education;
}

function buildQueries(input: SearchInput) {
  const titleTerms = importantTerms(input.title);
  const excerptTerms = importantTerms(input.excerpt || '');
  const headingTerms = importantTerms(extractHeadings(input.content || '').join(' '));
  const styleTerms = categoryStyles(input.category);

  const merged = unique([...titleTerms, ...excerptTerms, ...headingTerms]).slice(0, 4);
  const phrases = [
    `${merged.join(' ')} ${styleTerms[0]}`.trim(),
    `${input.title} ${styleTerms[1] || styleTerms[0]}`.trim(),
    `${merged.slice(0, 2).join(' ')} ${styleTerms[2] || styleTerms[0]}`.trim(),
    `${input.category || 'education'} ${styleTerms[3] || styleTerms[0]}`.trim()
  ].map((q) => q.replace(/\s+/g, ' ').trim()).filter(Boolean);

  return unique(phrases).slice(0, 4);
}

async function existingPhotoIds() {
  const { data, error } = await supabaseAdmin
    .from('posts')
    .select('featured_image_url')
    .not('featured_image_url', 'is', null)
    .limit(500);

  if (error) {
    return new Set<string>();
  }

  const ids = new Set<string>();
  for (const row of data || []) {
    const url = String(row.featured_image_url || '');
    const match = url.match(/pexels-(\d+)-/i);
    if (match?.[1]) ids.add(match[1]);
  }
  return ids;
}

async function searchPexels(query: string, apiKey: string) {
  const url = new URL(PEXELS_API_BASE);
  url.searchParams.set('query', query);
  url.searchParams.set('orientation', 'landscape');
  url.searchParams.set('size', 'large');
  url.searchParams.set('per_page', '8');

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: apiKey
    },
    cache: 'no-store'
  });

  if (!res.ok) {
    throw new Error(`Pexels search failed with status ${res.status}`);
  }

  const data = await res.json();
  return (data?.photos || []) as PexelsPhoto[];
}

function pickPhoto(photos: PexelsPhoto[], usedIds: Set<string>) {
  const filtered = photos.filter((photo) => {
    const id = String(photo.id);
    if (usedIds.has(id)) return false;
    const width = photo.width || 0;
    const height = photo.height || 0;
    return width >= 1200 && height >= 700;
  });

  return filtered[0] || photos[0] || null;
}

async function cachePhoto(photo: PexelsPhoto, slug: string) {
  const sourceUrl =
    photo.src?.landscape || photo.src?.large2x || photo.src?.large || photo.src?.original || photo.src?.medium;

  if (!sourceUrl) {
    throw new Error('No usable stock image URL was returned.');
  }

  const imageResponse = await fetch(sourceUrl, { cache: 'no-store' });
  if (!imageResponse.ok) {
    throw new Error('Failed to download stock image.');
  }

  const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
  const extension = contentType.includes('png') ? 'png' : 'jpg';
  const buffer = Buffer.from(await imageResponse.arrayBuffer());
  const safeSlug = normalizeSlug(slug);
  const filePath = `covers/pexels-${photo.id}-${safeSlug}.${extension}`;

  const { error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .upload(filePath, buffer, {
      contentType,
      upsert: true,
      cacheControl: '3600'
    });

  if (error) {
    throw new Error(error.message || 'Failed to cache stock image.');
  }

  const { data } = supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);

  return {
    url: data.publicUrl,
    provider: 'pexels',
    sourceId: String(photo.id),
    photographer: photo.photographer || null,
    photographerUrl: photo.photographer_url || null,
    alt: photo.alt || null,
    queryUsed: null as string | null
  };
}

export async function getStockCoverImage(input: SearchInput) {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    throw new Error('Missing PEXELS_API_KEY.');
  }

  const usedIds = await existingPhotoIds();
  const queries = buildQueries(input);

  for (const query of queries) {
    const photos = await searchPexels(query, apiKey);
    const chosen = pickPhoto(photos, usedIds);
    if (!chosen) continue;

    const cached = await cachePhoto(chosen, input.slug);
    cached.queryUsed = query;
    return cached;
  }

  throw new Error('No suitable stock image was found.');
}
