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
You are writing for Northfield Journal, a Western-market education publication.

Write a practical, original, editor-ready SEO article.

Requirements:
- Primary keyword: ${brief.working_title}
- Working title: ${brief.working_title}
- SEO title: ${brief.seo_title}
- SEO description: ${brief.seo_description}
- Category: ${brief.category_slug}
- Target length: about ${brief.target_word_count} words
- Angle: ${brief.angle}

Rules:
- Use clear, calm, credible English
- Avoid fake statistics
- Avoid unverifiable claims
- Avoid hype
- Make the article helpful and skimmable
- Use HTML only for body content
- Use semantic headings like <h2>, <h3>, <p>, <ul>, <li>
- Include a short FAQ section at the end
- Do not wrap output in markdown fences

Outline:
${
  brief.outline?.length
    ? brief.outline.map((item) => `- ${item}`).join('\n')
    : '- Introduction\n- Main strategies\n- Common mistakes\n- FAQ\n- Conclusion'
}

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