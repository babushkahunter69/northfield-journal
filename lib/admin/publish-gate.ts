import { evaluateEditorialScore } from '@/lib/admin/editorial-score';

export const MINIMUM_PUBLISH_SCORE = 80;
export const MINIMUM_PUBLISH_WORDS = 900;

type PublishGateInput = {
  title: string;
  excerpt?: string | null;
  content?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  featured_image_url?: string | null;
  author_name?: string | null;
  primary_keyword?: string | null;
};

function isEditorialOrMissingAuthor(authorName?: string | null) {
  const value = String(authorName || '').trim().toLowerCase();

  return (
    !value ||
    value.includes('editorial') ||
    value.includes('northfield journal') ||
    value.includes('admin')
  );
}

export function evaluatePublishGate(input: PublishGateInput) {
  const scoreResult = evaluateEditorialScore({
    title: input.title || '',
    excerpt: input.excerpt || '',
    content: input.content || '',
    metaTitle: input.meta_title || input.title || '',
    metaDescription: input.meta_description || input.excerpt || '',
    featuredImageUrl: input.featured_image_url || null,
    primaryKeyword: input.primary_keyword || null
  });

  const failed: string[] = [];

  if (scoreResult.score < MINIMUM_PUBLISH_SCORE) {
    failed.push(`Editorial score must be at least ${MINIMUM_PUBLISH_SCORE}. Current score: ${scoreResult.score}.`);
  }

  if (scoreResult.stats.wordCount < MINIMUM_PUBLISH_WORDS) {
    failed.push(`Content must be at least ${MINIMUM_PUBLISH_WORDS} words. Current word count: ${scoreResult.stats.wordCount}.`);
  }

  if (!String(input.featured_image_url || '').trim()) {
    failed.push('A featured image is required before publishing.');
  }

  if (!String(input.meta_title || '').trim()) {
    failed.push('A meta title is required before publishing.');
  }

  if (!String(input.meta_description || '').trim()) {
    failed.push('A meta description is required before publishing.');
  }

  if (isEditorialOrMissingAuthor(input.author_name)) {
    failed.push('A named non-editorial author is required before publishing.');
  }

  const faqCheck = scoreResult.checks.find((check) => check.key === 'faq');
  if (!faqCheck?.passed) {
    failed.push('At least 3 FAQ items are required before publishing.');
  }

  return {
    ok: failed.length === 0,
    score: scoreResult.score,
    failed,
    checks: scoreResult.checks,
    stats: scoreResult.stats
  };
}
