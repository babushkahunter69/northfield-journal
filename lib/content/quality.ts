import type { GeneratedArticle, GeneratedBrief } from '@/lib/types';

type ValidationResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  metrics: {
    wordCount: number;
    headingCount: number;
    faqCount: number;
    paragraphCount: number;
  };
};

const BANNED_PHRASES = [
  'in today’s fast-paced world',
  "in today's fast-paced world",
  'ever-evolving landscape',
  'game-changer',
  'delve into',
  'unlock the power of',
  'in conclusion',
  'now more than ever',
  'it is important to note that',
  'seamlessly',
  'robust solution',
  'navigate the complexities',
  'take your learning to the next level'
];

function stripHtml(html: string) {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function countWords(html: string) {
  const text = stripHtml(html);
  if (!text) return 0;
  return text.split(' ').filter(Boolean).length;
}

function countMatches(input: string, pattern: RegExp) {
  const matches = input.match(pattern);
  return matches ? matches.length : 0;
}

function getFirstParagraphText(html: string) {
  const match = String(html || '').match(/<p[^>]*>(.*?)<\/p>/i);
  if (!match?.[1]) return '';
  return stripHtml(match[1]);
}

function normalizeWhitespace(value: string) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function hasGenericTitle(title: string) {
  const t = title.toLowerCase().trim();

  const badStarts = [
    'ultimate guide',
    'complete guide',
    'everything you need to know about',
    'all you need to know about'
  ];

  return badStarts.some((prefix) => t.startsWith(prefix));
}

function hasBannedPhrase(text: string) {
  const lower = text.toLowerCase();
  return BANNED_PHRASES.filter((phrase) => lower.includes(phrase));
}

function looksTooShortMeta(text: string, min: number) {
  return normalizeWhitespace(text).length < min;
}

function looksTooLongMeta(text: string, max: number) {
  return normalizeWhitespace(text).length > max;
}

function extractHeadings(html: string) {
  const matches = String(html || '').match(/<h2[^>]*>.*?<\/h2>/gi) || [];
  return matches.map((item) => stripHtml(item));
}

function extractFaqCount(html: string) {
  const faqMatch = String(html || '').match(
    /<h2[^>]*>\s*(FAQ|Frequently Asked Questions)\s*<\/h2>([\s\S]*?)(?=<h2|$)/i
  );

  if (!faqMatch?.[2]) return 0;

  const faqHeadings = faqMatch[2].match(/<h3[^>]*>.*?<\/h3>/gi) || [];
  return faqHeadings.length;
}

function titleIncludesKeywordSignal(title: string, brief: GeneratedBrief) {
  const titleLower = String(title || '').toLowerCase();
  const signals = [
    brief.working_title,
    brief.slug.replace(/-/g, ' '),
    ...(brief.secondary_keywords || [])
  ]
    .map((item) => String(item || '').toLowerCase().trim())
    .filter(Boolean);

  return signals.some((signal) => {
    const words = signal.split(/[^a-z0-9]+/).filter((w) => w.length >= 4);
    if (words.length === 0) return false;
    return words.some((word) => titleLower.includes(word));
  });
}

export function validateGeneratedArticle(
  article: GeneratedArticle,
  brief: GeneratedBrief
): ValidationResult {
  const title = normalizeWhitespace(article.title);
  const excerpt = normalizeWhitespace(article.excerpt);
  const content = String(article.content || '');
  const metaTitle = normalizeWhitespace(article.meta_title);
  const metaDescription = normalizeWhitespace(article.meta_description);

  const wordCount = countWords(content);
  const headingCount = countMatches(content, /<h2[^>]*>.*?<\/h2>/gi);
  const faqCount = extractFaqCount(content);
  const paragraphCount = countMatches(content, /<p[^>]*>.*?<\/p>/gi);

  const errors: string[] = [];
  const warnings: string[] = [];

  if (!title) errors.push('Missing title.');
  if (!excerpt) errors.push('Missing excerpt.');
  if (!content) errors.push('Missing content.');
  if (!metaTitle) errors.push('Missing meta_title.');
  if (!metaDescription) errors.push('Missing meta_description.');

  if (wordCount < 900) {
    errors.push(`Content too short: ${wordCount} words.`);
  }

  if (headingCount < 4) {
  errors.push(`Not enough section headings: ${headingCount}.`);
}

  if (paragraphCount < 8) {
  errors.push(`Not enough paragraphs: ${paragraphCount}.`);
}

  if (faqCount < 3) {
    errors.push(`FAQ section too weak: ${faqCount} FAQ items.`);
  }

  if (title.length < 35) {
    warnings.push('Title may be too short.');
  }

  if (title.length > 90) {
    warnings.push('Title may be too long.');
  }

  if (hasGenericTitle(title)) {
    warnings.push('Title sounds generic.');
  }

  if (!titleIncludesKeywordSignal(title, brief)) {
    warnings.push('Title may not align closely enough with the keyword/topic.');
  }

  if (looksTooShortMeta(excerpt, 120)) {
    warnings.push('Excerpt is shorter than recommended.');
  }

  if (looksTooLongMeta(excerpt, 170)) {
    warnings.push('Excerpt is longer than recommended.');
  }

  if (looksTooShortMeta(metaTitle, 35)) {
    warnings.push('meta_title is shorter than recommended.');
  }

  if (looksTooLongMeta(metaTitle, 65)) {
    warnings.push('meta_title is longer than recommended.');
  }

  if (looksTooShortMeta(metaDescription, 110)) {
    warnings.push('meta_description is shorter than recommended.');
  }

  if (looksTooLongMeta(metaDescription, 165)) {
    warnings.push('meta_description is longer than recommended.');
  }

  const firstParagraph = getFirstParagraphText(content);
  if (firstParagraph.length < 120) {
    warnings.push('Opening paragraph may be too thin.');
  }

  const bannedInTitle = hasBannedPhrase(title);
  const bannedInExcerpt = hasBannedPhrase(excerpt);
  const bannedInContent = hasBannedPhrase(stripHtml(content));

  if (bannedInTitle.length > 0) {
    errors.push(`Title contains generic filler phrase(s): ${bannedInTitle.join(', ')}`);
  }

  if (bannedInExcerpt.length > 0) {
    errors.push(`Excerpt contains generic filler phrase(s): ${bannedInExcerpt.join(', ')}`);
  }

  if (bannedInContent.length > 0) {
    errors.push(`Content contains generic filler phrase(s): ${bannedInContent.join(', ')}`);
  }

  const headings = extractHeadings(content).map((h) => h.toLowerCase());
  const uniqueHeadings = new Set(headings);
  if (uniqueHeadings.size !== headings.length) {
    warnings.push('Some headings may be duplicated.');
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    metrics: {
      wordCount,
      headingCount,
      faqCount,
      paragraphCount
    }
  };
}