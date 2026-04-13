import { generateJson } from './client';
import type { GeneratedArticle, GeneratedBrief } from '@/lib/types';

type ArticleResponse = {
  title: string;
  excerpt: string;
  content: string;
  meta_title: string;
  meta_description: string;
  keywords?: string[];
  faq?: Array<{ question: string; answer: string }>;
};

function sanitizeHtml(html: string) {
  return html.replace(/```html|```/g, '').trim();
}

export async function generateArticle(brief: GeneratedBrief): Promise<GeneratedArticle> {
  const prompt = `
You are writing for Northfield Journal, a premium Western-market education publication.

Write an editor-ready article using this brief.

Brief:
- working title: ${brief.working_title}
- seo title: ${brief.seo_title}
- seo description: ${brief.seo_description}
- category: ${brief.category_slug}
- angle: ${brief.angle}
- target word count: ${brief.target_word_count}
- secondary keywords: ${(brief.secondary_keywords || []).join(', ')}
- internal link topics: ${(brief.internal_link_suggestions || []).join(', ')}

Outline:
${brief.outline?.length
  ? brief.outline.map((item) => `- ${item}`).join('\n')
  : '- Introduction\n- Key strategies\n- Common mistakes\n- FAQ\n- Conclusion'}

Editorial requirements:
- Use clear, polished, practical English
- Sound like a high-quality education magazine, not AI sludge
- Avoid filler and generic statements
- Avoid fake statistics and vague claims
- Use specific examples when helpful
- Write for readers in the US, UK, Canada, or Australia
- Match educational search intent
- Keep paragraphs readable and skimmable
- Use semantic HTML only
- Use <h2>, <h3>, <p>, <ul>, <ol>, <li>, <blockquote> where appropriate
- No markdown fences
- No introductory label like "Introduction"
- Start with a strong first paragraph that deserves a premium drop cap
- Do not wrap the first word or first sentence of the opening paragraph in <strong> tags
- Include one section with practical mistakes to avoid
- End with a short FAQ section
- End with a conclusion that feels editorial, not salesy

Return JSON with exactly this shape:
{
  "title": "string",
  "excerpt": "string",
  "content": "string",
  "meta_title": "string",
  "meta_description": "string",
  "keywords": ["string"],
  "faq": [{"question":"string","answer":"string"}]
}
`;

  const result = await generateJson<ArticleResponse>(prompt);

  return {
    title: result.title || brief.working_title,
    slug: brief.slug,
    excerpt: result.excerpt || '',
    content: sanitizeHtml(result.content || ''),
    meta_title: result.meta_title || brief.seo_title || brief.working_title,
    meta_description: result.meta_description || brief.seo_description || '',
    keywords: result.keywords || [],
    faq: result.faq || [],
    category_slug: brief.category_slug
  };
}