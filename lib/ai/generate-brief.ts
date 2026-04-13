import { generateJson } from './client';
import type { ContentKeyword, GeneratedBrief } from '@/lib/types';

type BriefResponse = {
  working_title: string;
  slug: string;
  angle: string;
  seo_title: string;
  seo_description: string;
  target_word_count: number;
  secondary_keywords: string[];
  outline: string[];
  faq: Array<{ question: string; answer: string }>;
  internal_link_suggestions: string[];
  category_slug: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/--+/g, '-');
}

export async function generateBrief(keyword: ContentKeyword): Promise<GeneratedBrief> {
  const prompt = `
You are a senior SEO editor at Northfield Journal, a premium Western-market education publication.

Create an SEO brief for a practical education article.

Brand and editorial standards:
- Tone: calm, credible, practical, polished
- Audience: Western readers, especially students, parents, teachers, tutors, and school professionals
- Style: useful, specific, non-hype, non-clickbait
- Avoid fake statistics and unverifiable claims
- Prefer evergreen, high-intent educational search topics
- Titles should feel editorial, not spammy
- The article should be useful enough to publish after light editing

Input:
- keyword: ${keyword.keyword}
- cluster: ${keyword.cluster || 'student-success'}
- audience: ${keyword.audience || 'students'}
- search intent: ${keyword.search_intent || 'informational'}
- country code: ${keyword.country_code || 'US'}

Instructions:
1. Create a strong working title for SEO and CTR.
2. Create a short, clean slug.
3. Choose a practical article angle.
4. Produce an outline with 5 to 8 sections.
5. Include FAQ questions people actually search for.
6. Suggest internal links as topic ideas, not URLs.
7. Match the category_slug to one of these:
   - student-success
   - teaching-craft
   - academic-writing
   - edtech
   - scholarships-access
   - school-leadership
   - parent-guides

Return JSON with exactly this shape:
{
  "working_title": "string",
  "slug": "string",
  "angle": "string",
  "seo_title": "string",
  "seo_description": "string",
  "target_word_count": 1400,
  "secondary_keywords": ["string"],
  "outline": ["string"],
  "faq": [{"question":"string","answer":"string"}],
  "internal_link_suggestions": ["string"],
  "category_slug": "string"
}
`;

  const result = await generateJson<BriefResponse>(prompt);

  return {
    working_title: result.working_title || keyword.keyword,
    slug: slugify(result.slug || result.working_title || keyword.keyword),
    angle: result.angle || 'Write a practical, editor-ready education article.',
    seo_title: result.seo_title || result.working_title || keyword.keyword,
    seo_description: result.seo_description || '',
    target_word_count: result.target_word_count || 1400,
    secondary_keywords: result.secondary_keywords || [],
    outline: result.outline || [],
    faq: result.faq || [],
    internal_link_suggestions: result.internal_link_suggestions || [],
    category_slug: result.category_slug || keyword.cluster || 'student-success'
  };
}