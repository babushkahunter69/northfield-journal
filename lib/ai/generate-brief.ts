import { generateJson } from './client';
import type { GeneratedBrief } from '@/lib/types';
import { educationContextBlock } from '@/lib/content/education-context';

type EducationKeywordInput = {
  id?: string;
  keyword: string;
  audience?: string | null;
  grade_band?: string | null;
  subject_area?: string | null;
  content_type?: string | null;
  target_country?: string | null;
  curriculum?: string | null;
  learning_objective?: string | null;
  tone?: string | null;
};

type BriefResponse = {
  working_title: string;
  angle: string;
  outline: Array<{ heading: string; notes: string }>;
  seo_title: string;
  seo_description: string;
  target_word_count: number;
  internal_link_suggestions: string[];
  secondary_keywords?: string[];
  faq?: Array<{ question: string; answer: string }>;
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

function normalizeOutline(
  outline: Array<{ heading?: string; notes?: string }> | undefined
): Array<{ heading: string; notes: string }> {
  if (!Array.isArray(outline) || outline.length === 0) {
    return [
      {
        heading: 'Why this topic matters',
        notes: 'Explain the real-world relevance for the target audience.'
      },
      {
        heading: 'Core ideas and practical strategies',
        notes: 'Cover the most useful explanations, methods, or recommendations.'
      },
      {
        heading: 'Examples and scenarios',
        notes: 'Show how the advice applies in everyday learning or teaching contexts.'
      },
      {
        heading: 'Common mistakes to avoid',
        notes: 'Identify practical pitfalls and how readers can avoid them.'
      },
      {
        heading: 'Actionable next steps',
        notes: 'End with realistic takeaways readers can apply immediately.'
      }
    ];
  }

  return outline
    .map((item) => ({
      heading: String(item?.heading || '').trim(),
      notes: String(item?.notes || '').trim()
    }))
    .filter((item) => item.heading || item.notes)
    .map((item) => ({
      heading: item.heading || 'Key section',
      notes: item.notes || 'Provide practical guidance for the reader.'
    }));
}

function normalizeCategorySlug(value: string | undefined, fallback = 'student-success') {
  const clean = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return clean || fallback;
}

function trimMeta(str: string, max: number) {
  const value = String(str || '').trim();
  if (!value) return '';
  return value.length > max ? `${value.slice(0, max - 3).trim()}...` : value;
}

function inferCategoryFromMetadata(keyword: EducationKeywordInput) {
  const subject = String(keyword.subject_area || '').toLowerCase();
  const type = String(keyword.content_type || '').toLowerCase();

  if (type.includes('parent')) return 'parent-guides';
  if (type.includes('teaching')) return 'teaching-strategies';
  if (type.includes('exam')) return 'exam-prep';
  if (type.includes('career')) return 'career-guidance';
  if (type.includes('edtech')) return 'edtech';
  if (subject.includes('study')) return 'student-success';
  if (subject.includes('writing')) return 'writing-skills';
  if (subject.includes('math')) return 'math-learning';
  if (subject.includes('science')) return 'science-learning';

  return 'student-success';
}

function normalizeSecondaryKeywords(value: string[] | undefined): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, 8);
}

function normalizeFaq(
  value: Array<{ question?: string; answer?: string }> | undefined
): Array<{ question: string; answer: string }> {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => ({
      question: String(item?.question || '').trim(),
      answer: String(item?.answer || '').trim()
    }))
    .filter((item) => item.question && item.answer)
    .slice(0, 5);
}

export async function generateBrief(
  keyword: EducationKeywordInput
): Promise<GeneratedBrief & EducationKeywordInput> {
  const prompt = `
You are creating a premium editorial brief for Northfield Journal, an education-focused publication.

Create a practical, trustworthy, audience-aware content brief.

Education context:
${educationContextBlock(keyword)}

Requirements:
- Focus on clarity, usefulness, and educational trustworthiness.
- Avoid generic SEO fluff, hype, and vague advice.
- Match the content to the intended audience and grade band.
- Favor practical application, learning outcomes, and concrete examples.
- If the audience is students, use supportive and direct framing.
- If the audience is teachers, emphasize classroom usefulness and implementation.
- If the audience is parents, emphasize support, clarity, and at-home application.

Return JSON with exactly this shape:
{
  "working_title": "string",
  "angle": "string",
  "outline": [
    { "heading": "string", "notes": "string" }
  ],
  "seo_title": "string",
  "seo_description": "string",
  "target_word_count": 1200,
  "internal_link_suggestions": ["string"],
  "secondary_keywords": ["string"],
  "faq": [
    { "question": "string", "answer": "string" }
  ],
  "category_slug": "string"
}

Constraints:
- working_title should feel editorial and specific, not clickbait.
- angle should explain the unique value of the article in one or two sentences.
- outline should contain 5 to 7 meaningful sections.
- seo_title should be under 65 characters where possible.
- seo_description should be around 140 to 160 characters.
- target_word_count should usually be between 1000 and 1500.
- category_slug must be exactly one of:
  - student-success
  - exam-prep
  - academic-writing
  - teaching-strategies
  - parent-guides
  - career-guidance
  - edtech
  - math-learning
  - science-learning
  - writing-skills
  - reading-skills
`;

  const result = await generateJson<BriefResponse>(prompt);

  const workingTitle = String(result.working_title || keyword.keyword).trim();
  const categorySlug =
    normalizeCategorySlug(result.category_slug, inferCategoryFromMetadata(keyword));

  const generatedBrief: GeneratedBrief & EducationKeywordInput = {
    working_title: workingTitle,
    slug: slugify(workingTitle || keyword.keyword),
    angle: String(result.angle || '').trim(),
    outline: normalizeOutline(result.outline),
    seo_title: trimMeta(result.seo_title || workingTitle, 65),
    seo_description: trimMeta(result.seo_description || '', 160),
    target_word_count:
      typeof result.target_word_count === 'number' &&
      result.target_word_count >= 900 &&
      result.target_word_count <= 2000
        ? result.target_word_count
        : 1200,
    internal_link_suggestions: Array.isArray(result.internal_link_suggestions)
      ? result.internal_link_suggestions
          .map((item) => String(item || '').trim())
          .filter(Boolean)
          .slice(0, 6)
      : [],
    secondary_keywords: normalizeSecondaryKeywords(result.secondary_keywords),
    faq: normalizeFaq(result.faq),
    category_slug: categorySlug,

    audience: keyword.audience ?? null,
    grade_band: keyword.grade_band ?? null,
    subject_area: keyword.subject_area ?? null,
    content_type: keyword.content_type ?? null,
    target_country: keyword.target_country ?? null,
    curriculum: keyword.curriculum ?? null,
    learning_objective: keyword.learning_objective ?? null,
    tone: keyword.tone ?? null,
    keyword: keyword.keyword
  };

  return generatedBrief;
}