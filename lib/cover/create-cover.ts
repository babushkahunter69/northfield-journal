import { storageBucket } from '@/lib/constants';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { makeSlug } from '@/lib/utils';
import { categoryCoverThemes } from '@/lib/cover/templates';

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function splitLines(title: string, maxLineLength = 24) {
  const words = title.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLineLength && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);
  return lines.slice(0, 3);
}

export async function createCoverForPost({
  title,
  categorySlug,
  slug
}: {
  title: string;
  categorySlug: string;
  slug?: string;
}) {
  const theme = categoryCoverThemes[categorySlug] || categoryCoverThemes['student-success'];
  const lines = splitLines(title);
  const svg = `
  <svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1200" y2="630" gradientUnits="userSpaceOnUse">
        <stop stop-color="${theme.gradientFrom}"/>
        <stop offset="1" stop-color="${theme.gradientTo}"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#bg)" rx="28"/>
    <circle cx="1050" cy="120" r="180" fill="white" fill-opacity="0.08"/>
    <circle cx="1180" cy="560" r="240" fill="white" fill-opacity="0.06"/>
    <rect x="64" y="62" width="220" height="44" rx="22" fill="white" fill-opacity="0.14"/>
    <text x="92" y="91" fill="white" font-size="22" font-family="Arial, sans-serif" font-weight="700">${escapeXml(theme.eyebrow)}</text>
    <text x="64" y="170" fill="white" font-size="62" font-family="Georgia, serif" font-weight="700">${lines.map((line, index) => `<tspan x="64" dy="${index === 0 ? 0 : 74}">${escapeXml(line)}</tspan>`).join('')}</text>
    <text x="64" y="560" fill="white" font-size="28" font-family="Arial, sans-serif" font-weight="600">Northfield Journal</text>
    <text x="64" y="596" fill="white" fill-opacity="0.8" font-size="22" font-family="Arial, sans-serif">Practical guides for learning, teaching, and academic success</text>
  </svg>`;

  const fileName = `generated/${makeSlug(slug || title)}-${Date.now()}.svg`;
  const fileBuffer = Buffer.from(svg.trim(), 'utf8');

  const uploadResponse = await supabaseAdmin.storage
    .from(storageBucket)
    .upload(fileName, fileBuffer, {
      contentType: 'image/svg+xml',
      upsert: true,
      cacheControl: '3600'
    });

  if (uploadResponse.error) {
    throw new Error(uploadResponse.error.message);
  }

  const { data } = supabaseAdmin.storage.from(storageBucket).getPublicUrl(fileName);
  return data.publicUrl;
}
