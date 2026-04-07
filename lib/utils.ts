import slugify from 'slugify';

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'http://localhost:3000';
}

export function makeSlug(value: string) {
  return slugify(value, { lower: true, strict: true, trim: true });
}

export function estimateReadingTime(text: string) {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function excerptFromContent(content: string, maxLength = 180) {
  const cleaned = content.replace(/#+\s/g, '').replace(/\*\*/g, '').replace(/\n/g, ' ').trim();
  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength).trim()}...` : cleaned;
}

export function splitKeywords(input: string) {
  return input
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}