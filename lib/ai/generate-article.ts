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

function trimMeta(str: string, max: number) {
  const value = String(str || '').trim();
  if (!value) return '';
  return value.length > max ? `${value.slice(0, max - 3).trim()}...` : value;
}

function normalizeFaq(
  faq: Array<{ question?: string; answer?: string }> | undefined
): Array<{ question: string; answer: string }> {
  if (!Array.isArray(faq)) return [];

  return faq
    .map((item) => ({
      question: String(item?.question || '').trim(),
      answer: String(item?.answer || '').trim()
    }))
    .filter((item) => item.question && item.answer);
}

function buildOutlineText(brief: GeneratedBrief) {
  if (!Array.isArray(brief.outline) || brief.outline.length === 0) {
    return [
      '- Opening section: establish the problem clearly and practically',
      '- Main strategies: explain the core techniques or recommendations',
      '- Mistakes to avoid: include practical pitfalls and how to avoid them',
      '- Action steps: give concrete, usable advice',
      '- Frequently Asked Questions',
      '- Conclusion'
    ].join('\n');
  }

  return brief.outline
    .map((item) => {
      const heading = String(item?.heading || '').trim();
      const notes = String(item?.notes || '').trim();
      if (!heading && !notes) return null;
      return notes ? `- ${heading}: ${notes}` : `- ${heading}`;
    })
    .filter(Boolean)
    .join('\n');
}

function ensureInternalLinks(content: string, suggestions: string[] = []) {
  if (!content) return '';

  if (/href="\/blog\/[^"]+"/i.test(content)) {
    return content;
  }

  const suggestionLinks = (suggestions || [])
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, 2);

  const fallbackLinks =
    suggestionLinks.length >= 2
      ? suggestionLinks.map((item) => ({
          href: `/blog/${item
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')}`,
          text: item
        }))
      : [
          { href: '/blog/study-tips', text: 'study tips for students' },
          { href: '/blog/note-taking', text: 'note-taking strategies' },
          { href: '/blog/time-management', text: 'time management habits' }
        ];

  const chosen = fallbackLinks.slice(0, 2);

  const linksHtml = `
<p>Related reading: <a href="${chosen[0].href}">${chosen[0].text}</a> and <a href="${chosen[1].href}">${chosen[1].text}</a>.</p>
`.trim();

  const faqIndex = content.search(
    /<h2[^>]*>\s*Frequently Asked Questions\s*<\/h2>/i
  );

  if (faqIndex !== -1) {
    return `${content.slice(0, faqIndex)}${linksHtml}${content.slice(faqIndex)}`;
  }

  return `${content}${linksHtml}`;
}

export async function generateArticle(
  brief: GeneratedBrief
): Promise<GeneratedArticle> {
  const prompt = `
You are writing for Northfield Journal, a premium Western-market education publication.

Write an editor-ready, SEO-aware article using this brief.

Brief:
- working title: ${brief.working_title}
- seo title: ${brief.seo_title}
- seo description: ${brief.seo_description}
- category: ${brief.category_slug}
- angle: ${brief.angle}
- target word count: ${brief.target_word_count}
- primary slug/topic: ${brief.slug}
- secondary keywords: ${(brief.secondary_keywords || []).join(', ')}
- internal link topics: ${(brief.internal_link_suggestions || []).join(', ')}

Outline:
${buildOutlineText(brief)}

STRICT REQUIREMENTS:

1. LENGTH
- Minimum 1000 words
- Prefer 1200 to 1500 words unless the brief clearly implies a shorter article

2. STRUCTURE
- Use semantic HTML only
- Use <h2>, <h3>, <p>, <ul>, <ol>, <li>, <blockquote> where appropriate
- No markdown fences
- No introductory label like "Introduction"
- Start with a strong first paragraph that deserves a premium drop cap
- Do not wrap the first word or first sentence of the opening paragraph in <strong> tags
- Use short paragraphs that are easy to read
- Include at least one section with practical mistakes to avoid
- End with a conclusion that feels editorial, not salesy

3. SEO
- Include the main topic naturally in the title, opening paragraph, and multiple subheadings
- Use 3 to 5 secondary keywords naturally without stuffing
- Include 2 to 3 internal links using this exact format:
  <a href="/blog/example-slug">anchor text</a>
- Make the article useful for real search intent, not generic or fluffy

4. META
- meta_title should be between 40 and 65 characters
- meta_description should be between 120 and 160 characters

5. FAQ
- Include a section titled exactly:
  <h2>Frequently Asked Questions</h2>
- Include 3 to 5 FAQ items
- FAQ answers should be concise but genuinely helpful

6. TONE
- Clear, polished, practical English
- Sound like a high-quality education magazine
- Avoid filler, clichés, hype, fake statistics, and vague claims
- Use specific examples when helpful
- Write for readers in the US, UK, Canada, or Australia

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

  const cleanedContent = sanitizeHtml(result.content || '');
  const contentWithLinks = ensureInternalLinks(
    cleanedContent,
    brief.internal_link_suggestions || []
  );

  if (!contentWithLinks || contentWithLinks.length < 5000) {
    throw new Error('Generated content too short — retry');
  }

  const normalizedFaq = normalizeFaq(result.faq);

  return {
    title: result.title || brief.working_title,
    slug: brief.slug,
    excerpt: result.excerpt || '',
    content: contentWithLinks,
    meta_title: trimMeta(
      result.meta_title || brief.seo_title || brief.working_title,
      65
    ),
    meta_description: trimMeta(
      result.meta_description || brief.seo_description || result.excerpt || '',
      160
    ),
    keywords: Array.isArray(result.keywords) ? result.keywords : [],
    faq:
      normalizedFaq.length > 0
        ? normalizedFaq
        : [
            {
              question: 'What are effective study techniques?',
              answer:
                'Effective study techniques usually include active recall, spaced repetition, time blocking, and focused review sessions.'
            },
            {
              question: 'How can students study more efficiently?',
              answer:
                'Students can study more efficiently by working in short focused blocks, reducing distractions, and reviewing material consistently instead of cramming.'
            },
            {
              question: 'Why do study habits matter?',
              answer:
                'Strong study habits improve retention, reduce stress, and make it easier to apply knowledge in tests, assignments, and long-term learning.'
            }
          ],
    category_slug: brief.category_slug
  };
}