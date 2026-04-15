import { generateJson } from '@/lib/ai/client';
import { evaluateEditorialScore } from '@/lib/admin/editorial-score';
import type { GeneratedArticle } from '@/lib/types';

const IMPROVABLE_KEYS = new Set([
  'title_length',
  'meta_title_length',
  'meta_description_length',
  'internal_links',
  'faq',
  'keyword',
  'structure',
  'examples',
  'conclusion',
  'robotic'
]);

type ImproveInput = {
  article: GeneratedArticle;
  primaryKeyword?: string | null;
  internalLinkSuggestions?: string[];
  minimumScore?: number;
};

type ImproveResponse = {
  title?: string;
  excerpt?: string;
  content?: string;
  meta_title?: string;
  meta_description?: string;
};

export async function improveArticleToThreshold(input: ImproveInput) {
  let current = { ...input.article };
  const before = evaluateEditorialScore({
    title: current.title,
    excerpt: current.excerpt,
    content: current.content,
    metaTitle: current.meta_title,
    metaDescription: current.meta_description,
    featuredImageUrl: 'x',
    primaryKeyword: input.primaryKeyword || ''
  });

  const minimumScore = input.minimumScore ?? 80;
  if (before.score >= minimumScore) {
    return { article: current, before, after: before, improved: false };
  }

  const failed = before.checks.filter((check) => !check.passed && IMPROVABLE_KEYS.has(check.key));
  if (!failed.length) {
    return { article: current, before, after: before, improved: false };
  }

  const response = await generateJson<ImproveResponse>({
    task: 'Improve an education article so it satisfies a quality checklist without changing the core topic.',
    rules: [
      'Return valid JSON only.',
      'Preserve factual meaning and school-safe tone.',
      'Do not remove useful sections that already work.',
      'Make the copy feel specific and natural, not generic.',
      'If adding internal links, use only relative links like /blog/slug.',
      'If improving title/meta fields, keep them concise and search-friendly.'
    ],
    primary_keyword: input.primaryKeyword || '',
    failed_checks: failed.map((check) => ({
      key: check.key,
      label: check.label,
      hint: check.hint || '',
      detail: check.detail || ''
    })),
    internal_link_suggestions: input.internalLinkSuggestions || [],
    article: current
  });

  current = {
    ...current,
    title: String(response.title || current.title).trim(),
    excerpt: String(response.excerpt || current.excerpt).trim(),
    content: String(response.content || current.content).trim(),
    meta_title: String(response.meta_title || current.meta_title).trim(),
    meta_description: String(response.meta_description || current.meta_description).trim()
  };

  const after = evaluateEditorialScore({
    title: current.title,
    excerpt: current.excerpt,
    content: current.content,
    metaTitle: current.meta_title,
    metaDescription: current.meta_description,
    featuredImageUrl: 'x',
    primaryKeyword: input.primaryKeyword || ''
  });

  return { article: current, before, after, improved: true };
}
