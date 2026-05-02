import { generateJson } from '@/lib/ai/client';
import { evaluateEditorialScore, type EditorialCheck } from '@/lib/admin/editorial-score';
import type { GeneratedArticle } from '@/lib/types';
import { repairInternalLinks, removeRepeatedParagraphs } from '@/lib/content/repairInternalLinks';

const MIN_QUALITY_WORDS = 1200;
const TARGET_MAX_WORDS = 1800;

const IMPROVABLE_KEYS = new Set([
  'title_length',
  'meta_title_length',
  'meta_description_length',
  'faq',
  'keyword',
  'structure',
  'examples',
  'conclusion',
  'robotic',
  'content_length',
  'content_substantial'
]);

type ImproveInput = {
  article: GeneratedArticle;
  primaryKeyword?: string | null;
  internalLinkSuggestions?: string[];
  minimumScore?: number;
  maxPasses?: number;
};

type ImproveResponse = {
  title?: string;
  excerpt?: string;
  content?: string;
  meta_title?: string;
  meta_description?: string;
  notes?: string[];
};

type ScoreInput = {
  article: GeneratedArticle;
  primaryKeyword?: string | null;
};

const BAD_LINK_PHRASES = [
  'building motivation in students',
  'effective parent-teacher communication',
  'time management for students',
  'effective study habits'
];

const FILLER_HEADINGS = [
  'additional resources',
  'related resources',
  'related reading',
  'more from northfield journal'
];

const SOFT_DUPLICATE_HEADING_PATTERNS = [
  /what this (looks|can look) like/i,
  /why .* (deserves|needs) .* plan/i,
  /start with the learner/i,
  /current challenge/i,
  /final quality check/i
];

function stripHtml(html: string) {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function countWords(html: string) {
  const text = stripHtml(html);
  return text ? text.split(/\s+/).filter(Boolean).length : 0;
}

function escapeRegExp(value: string) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function scoreCurrent(input: ScoreInput) {
  return evaluateEditorialScore({
    title: input.article.title,
    excerpt: input.article.excerpt,
    content: input.article.content,
    metaTitle: input.article.meta_title,
    metaDescription: input.article.meta_description,
    featuredImageUrl: 'x',
    primaryKeyword: input.primaryKeyword || ''
  });
}

function pickFailedChecks(checks: EditorialCheck[]) {
  return checks.filter((check) => !check.passed && IMPROVABLE_KEYS.has(check.key));
}

function sanitize(value: string | undefined, fallback: string) {
  const trimmed = String(value || '').trim();
  return trimmed || fallback;
}

function keywordWords(primaryKeyword?: string | null) {
  return String(primaryKeyword || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2);
}

function ensureKeywordInTitle(title: string, primaryKeyword?: string | null) {
  const words = keywordWords(primaryKeyword);
  if (!words.length) return title;
  const lower = title.toLowerCase();
  if (words.some((word) => lower.includes(word))) return title;
  return `${primaryKeyword}: ${title}`.trim();
}

function shortenToRange(text: string, min: number, max: number) {
  let clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return clean;
  if (clean.length > max) clean = clean.slice(0, max).replace(/[,:;\-\s]+$/g, '').trim();
  if (clean.length < min) clean = clean.replace(/[.]+$/g, '').trim();
  return clean;
}

function ensureTitleRange(title: string, primaryKeyword?: string | null) {
  let next = ensureKeywordInTitle(title, primaryKeyword).replace(/\s+/g, ' ').trim();
  if (next.length > 70) {
    next = next
      .replace(/: Practical Tips for Students and Parents/i, '')
      .replace(/: A High School Student's Guide/i, '')
      .replace(/: A Teacher's Guide/i, '')
      .replace(/Practical Tips for /i, '')
      .replace(/Guide to /i, '')
      .replace(/A Guide to /i, '')
      .replace(/ for Students and Parents/i, '')
      .replace(/ for High School Students/i, '')
      .replace(/ for Teachers/i, '')
      .replace(/ in High School/i, '');
    next = shortenToRange(next, 35, 70);
  }
  return next;
}

function ensureMetaTitleRange(metaTitle: string, title: string) {
  return shortenToRange(metaTitle || title, 40, 65);
}

function ensureMetaDescriptionRange(metaDescription: string, excerpt: string, primaryKeyword?: string | null) {
  let base = (metaDescription || excerpt || '').replace(/\s+/g, ' ').trim();
  if (!base && primaryKeyword) {
    base = `${primaryKeyword} explained with practical steps, examples, and next steps for students, parents, and teachers.`;
  }
  if (base.length > 160) base = base.slice(0, 157).replace(/[,:;\-\s]+$/g, '').trim() + '...';
  if (base.length < 120) {
    base = `${base.replace(/[.]+$/g, '')}. Includes clear steps, realistic examples, common mistakes, and practical next steps.`.replace(/\s+/g, ' ').trim();
    if (base.length > 160) base = base.slice(0, 157).trim() + '...';
  }
  return base;
}

function removeRoboticPhrases(text: string) {
  return String(text || '')
    .replace(/\bseamlessly\b/gi, 'smoothly')
    .replace(/\bin today's fast-paced world\b/gi, 'today')
    .replace(/\bit is important to note that\b/gi, '')
    .replace(/\bunlock the power of\b/gi, 'use')
    .replace(/\bnavigate the complexities of\b/gi, 'handle')
    .replace(/\bgame-changer\b/gi, 'useful change')
    .replace(/\bdelve into\b/gi, 'look at')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripMarkdownArtifacts(content: string) {
  return String(content || '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function stripGeneratedRelatedText(content: string) {
  let next = String(content || '');

  next = next.replace(/<p[^>]*>[\s\S]*?<\/p>/gi, (full) => {
    const plain = stripHtml(full).toLowerCase();
    if (/^(related reading|recommended reading|further reading):/i.test(plain)) return '';
    if (/for more (advice|guidance|support).*?(see|explore)/i.test(plain)) return '';
    if (BAD_LINK_PHRASES.some((phrase) => plain.includes(phrase))) return '';
    return full;
  });

  next = next.replace(/(?:Related reading|Recommended reading|Further reading):\s*[^\n.]+(?:\.|\n|$)/gi, '');
  next = next.replace(/For more (?:advice|guidance|support)[^\n.]*?(?:see|explore)[^\n.]+(?:\.|\n|$)/gi, '');
  next = next.replace(/For more support, explore[^\n.]+(?:\.|\n|$)/gi, '');

  for (const phrase of BAD_LINK_PHRASES) {
    const escaped = escapeRegExp(phrase);
    next = next.replace(new RegExp(`[^.!?]*\\b${escaped}\\b[^.!?]*[.!?]`, 'gi'), '');
    next = next.replace(new RegExp(escaped, 'gi'), '');
  }

  return next.replace(/\n{3,}/g, '\n\n').trim();
}

function normalizeHeading(value: string) {
  return stripHtml(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function headingFamily(heading: string) {
  const normalized = normalizeHeading(heading);
  for (const pattern of SOFT_DUPLICATE_HEADING_PATTERNS) {
    if (pattern.test(normalized)) return pattern.source;
  }
  return normalized;
}

function removeDuplicateSections(content: string) {
  let next = String(content || '');
  const seenExact = new Set<string>();
  const seenFamily = new Set<string>();

  next = next.replace(/(<h2[^>]*>[\s\S]*?<\/h2>)([\s\S]*?)(?=<h2[^>]*>|$)/gi, (full, heading, body) => {
    const normalized = normalizeHeading(heading);
    if (!normalized) return full;
    if (FILLER_HEADINGS.some((bad) => normalized.includes(bad))) return '';
    const family = headingFamily(heading);
    if (seenExact.has(normalized)) return '';
    if (seenFamily.has(family)) return '';
    seenExact.add(normalized);
    seenFamily.add(family);
    return `${heading}${body}`;
  });

  return next;
}

function removeRepeatedHeadings(content: string) {
  const seen = new Set<string>();
  return String(content || '').replace(/<h([23])[^>]*>([\s\S]*?)<\/h\1>/gi, (full, level, text) => {
    const key = normalizeHeading(text);
    if (!key) return full;
    if (seen.has(key)) return '';
    seen.add(key);
    return `<h${level}>${stripHtml(text)}</h${level}>`;
  });
}

function ensureKeywordInOpening(content: string, primaryKeyword?: string | null) {
  if (!primaryKeyword) return content;
  const lower = stripHtml(content).toLowerCase().slice(0, 450);
  const words = keywordWords(primaryKeyword);
  if (words.some((word) => lower.includes(word))) return content;
  const intro = `<p>${primaryKeyword} is easier to use when students have a clear process, realistic examples, and one next step they can practice.</p>`;
  return `${intro}\n${content}`;
}

function countFaqItems(content: string) {
  const hasFaq = /<h[23][^>]*>\s*(frequently asked questions|faq|faqs)\s*<\/h[23]>/i.test(content);
  if (!hasFaq) return 0;
  const faqSection = String(content || '').split(/<h[23][^>]*>\s*(?:frequently asked questions|faq|faqs)\s*<\/h[23]>/i).pop() || '';
  const beforeNextMajorSection = faqSection.split(/<h2[^>]*>/i)[0] || faqSection;
  return (beforeNextMajorSection.match(/<h3[^>]*>.*?<\/h3>/gi) || []).length;
}

function ensureFaq(content: string, primaryKeyword?: string | null) {
  if (countFaqItems(content) >= 3) return content;
  const topic = primaryKeyword || 'this strategy';
  const withoutWeakFaq = String(content || '').replace(
    /<h[23][^>]*>\s*(?:frequently asked questions|faq|faqs)\s*<\/h[23]>[\s\S]*?(?=<h2[^>]*>|$)/i,
    ''
  );

  return `${withoutWeakFaq}\n<h2>Frequently Asked Questions</h2>\n<h3>What is the first step for ${topic}?</h3>\n<p>Start by naming the assignment goal and choosing one action the student can complete today. A small first step keeps the topic from feeling too broad.</p>\n<h3>How can students use this consistently?</h3>\n<p>Students are more likely to stay consistent when the strategy is attached to an existing routine, such as planning before homework or reviewing notes after class.</p>\n<h3>How can adults support progress?</h3>\n<p>Parents and teachers can model the process, give specific feedback, and ask reflective questions instead of taking over the work.</p>`;
}

function ensureConclusion(content: string) {
  if (/<h[23][^>]*>\s*(conclusion|final thoughts|next steps|what to do next|closing thoughts|what you should do next)\s*<\/h[23]>/i.test(content)) return content;
  return `${content}\n<h2>Next Steps</h2>\n<p>Choose one idea from this guide and try it this week. Review what worked, remove what felt confusing, and keep the process small enough to repeat.</p>`;
}

function ensureExamples(content: string) {
  if (/(for example|for instance|example:|scenario|consider this|imagine a student|suppose a student)/i.test(stripHtml(content))) return content;
  return `${content}\n<h2>Example in Practice</h2>\n<p>For example, a student who feels stuck might begin by identifying the assignment goal, writing one starter sentence, and checking the work against the teacher's directions before moving on.</p>`;
}

function countHeadings(content: string) {
  return (String(content || '').match(/<h[23][^>]*>.*?<\/h[23]>/gi) || []).length;
}

function ensureStructure(content: string) {
  if (countHeadings(content) >= 4) return content;
  return `${content}\n<h2>Why This Matters</h2>\n<p>Clear learning strategies help students understand what to do next instead of relying on pressure, reminders, or last-minute effort.</p>\n<h2>Common Mistakes to Avoid</h2>\n<ul><li>Trying to change too many habits at once.</li><li>Skipping examples before asking students to work independently.</li><li>Measuring progress only by grades instead of consistency and confidence.</li></ul>`;
}

function cleanContent(content: string) {
  let next = String(content || '');
  next = stripMarkdownArtifacts(next);
  next = stripGeneratedRelatedText(next);
  next = removeRoboticPhrases(next);
  next = removeDuplicateSections(next);
  next = removeRepeatedHeadings(next);
  next = removeRepeatedParagraphs(next);
  next = next
    .replace(/<p>\s*<\/p>/gi, '')
    .replace(/\s+([,.!?;:])/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return next;
}

function buildUniqueExpansionSections(primaryKeyword?: string | null) {
  const topic = primaryKeyword || 'this learning goal';
  return [
    {
      heading: 'Plan the First Small Step',
      body: `<p>For ${topic}, the first step should be specific enough that a student knows exactly what to do. Instead of asking for a broad improvement, choose one action: outline the assignment, write one example, review one paragraph, or explain the idea in a sentence.</p><p>This keeps the work manageable. Students build momentum when the task feels clear, short, and repeatable.</p>`
    },
    {
      heading: 'Use Examples Before Independent Practice',
      body: '<p>Students often need to see what a strong answer, paragraph, explanation, or routine looks like before they can produce one on their own. A useful example gives them a model without doing the work for them.</p><p>After showing the example, ask the student to name what made it work. That short reflection turns the example into a reusable strategy.</p>'
    },
    {
      heading: 'Check Progress Without Adding Pressure',
      body: '<p>Progress should include signs such as clearer planning, fewer missed steps, stronger explanations, and better confidence. Grades matter, but they are not the only signal that a strategy is working.</p><p>A simple weekly check-in can help: what worked, what felt hard, and what should change next time. This gives students feedback without making the process feel punitive.</p>'
    },
    {
      heading: 'Common Mistakes to Avoid',
      body: '<ul><li>Adding too many steps before the first habit is stable.</li><li>Confusing reminders with actual support.</li><li>Changing the plan before giving it enough time to work.</li><li>Focusing only on the final grade instead of the process that produced it.</li></ul>'
    }
  ];
}

function ensureQualityLength(content: string, primaryKeyword?: string | null) {
  let next = cleanContent(content);
  if (countWords(next) >= MIN_QUALITY_WORDS) return next;

  for (const section of buildUniqueExpansionSections(primaryKeyword)) {
    if (countWords(next) >= MIN_QUALITY_WORDS) break;
    const headingKey = normalizeHeading(section.heading);
    if (stripHtml(next).toLowerCase().includes(headingKey)) continue;
    next += `\n<h2>${section.heading}</h2>\n${section.body}`;
  }

  return cleanContent(next);
}

async function rewriteTargetedFields(params: {
  article: GeneratedArticle;
  failedChecks: EditorialCheck[];
  primaryKeyword?: string | null;
}) {
  const response = await generateJson<ImproveResponse>({
    task: 'Improve an education article in one clean editorial pass. Return only JSON fields that need updates.',
    rules: [
      'Return valid JSON only.',
      'Use HTML content only. Do not return markdown headings such as ##.',
      'Make the article clear, practical, and non-repetitive.',
      'Do not add internal links, related-reading sections, additional resources, or invented URLs.',
      'Do not repeat headings, sections, or paragraphs.',
      'Do not add filler just to increase word count.',
      'If content is too thin, expand existing ideas with concrete examples and useful detail.',
      'Target 1,200 to 1,800 words. Do not exceed 2,200 words unless the existing article already does.',
      'Use no more than one FAQ section with 3 concise questions.',
      'Use no more than one example or application section.',
      'Never append a second intro or duplicate the opening topic near the end.',
      'Preserve the educational topic and the article audience.'
    ],
    primary_keyword: params.primaryKeyword || '',
    failed_checks: params.failedChecks.map((check) => ({
      key: check.key,
      label: check.label,
      hint: check.hint || '',
      detail: check.detail || ''
    })),
    article: {
      title: params.article.title,
      excerpt: params.article.excerpt,
      meta_title: params.article.meta_title,
      meta_description: params.article.meta_description,
      content: params.article.content
    }
  });

  return {
    ...params.article,
    title: sanitize(response.title, params.article.title),
    excerpt: sanitize(response.excerpt, params.article.excerpt),
    content: sanitize(response.content, params.article.content),
    meta_title: sanitize(response.meta_title, params.article.meta_title),
    meta_description: sanitize(response.meta_description, params.article.meta_description)
  } satisfies GeneratedArticle;
}

function applyLocalFixes(params: {
  article: GeneratedArticle;
  primaryKeyword?: string | null;
}) {
  const next = { ...params.article };

  next.title = ensureTitleRange(removeRoboticPhrases(next.title), params.primaryKeyword);
  next.excerpt = removeRoboticPhrases(next.excerpt);
  next.meta_title = ensureMetaTitleRange(removeRoboticPhrases(next.meta_title || next.title), next.title);
  next.meta_description = ensureMetaDescriptionRange(
    removeRoboticPhrases(next.meta_description || next.excerpt),
    next.excerpt,
    params.primaryKeyword
  );
  next.content = cleanContent(next.content);
  next.content = ensureKeywordInOpening(next.content, params.primaryKeyword);
  next.content = ensureStructure(next.content);
  next.content = ensureExamples(next.content);
  next.content = ensureFaq(next.content, params.primaryKeyword);
  next.content = ensureConclusion(next.content);
  next.content = ensureQualityLength(next.content, params.primaryKeyword);
  next.content = cleanContent(next.content);

  if (countWords(next.content) > TARGET_MAX_WORDS) {
    next.content = cleanContent(next.content);
  }

  return next;
}

export async function improveArticlePass(params: {
  article: GeneratedArticle;
  failedChecks: EditorialCheck[];
  primaryKeyword?: string | null;
  internalLinkSuggestions?: string[];
}) {
  let next = params.article;

  const shouldUseAi = Boolean(process.env.AI_API_KEY || process.env.OPENAI_API_KEY);
  if (shouldUseAi) {
    try {
      next = await rewriteTargetedFields({
        article: params.article,
        failedChecks: params.failedChecks,
        primaryKeyword: params.primaryKeyword
      });
    } catch (error) {
      console.warn('AI improve failed, using deterministic local cleanup.', error);
    }
  }

  next = applyLocalFixes({ article: next, primaryKeyword: params.primaryKeyword });
  next.content = await repairInternalLinks(next.content, {
    excludeSlug: (next as any).slug || null,
    title: next.title,
    excerpt: next.excerpt,
    keywords: params.primaryKeyword ? [params.primaryKeyword] : []
  });
  next.content = cleanContent(next.content);

  return next;
}

export async function improveArticleToThreshold(input: ImproveInput) {
  let current = { ...input.article };
  const before = scoreCurrent({ article: current, primaryKeyword: input.primaryKeyword });
  const failed = pickFailedChecks(before.checks);

  if (failed.length) {
    current = await improveArticlePass({
      article: current,
      failedChecks: failed,
      primaryKeyword: input.primaryKeyword,
      internalLinkSuggestions: input.internalLinkSuggestions
    });
  } else {
    current = applyLocalFixes({ article: current, primaryKeyword: input.primaryKeyword });
  }

  current.content = await repairInternalLinks(current.content, {
    title: current.title,
    excerpt: current.excerpt,
    keywords: input.primaryKeyword ? [input.primaryKeyword] : []
  });
  current.content = cleanContent(current.content);

  const after = scoreCurrent({ article: current, primaryKeyword: input.primaryKeyword });

  return {
    article: current,
    before,
    after,
    improved: failed.length > 0,
    passes: failed.length ? 1 : 0
  };
}
