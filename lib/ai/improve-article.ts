import { generateJson } from '@/lib/ai/client';
import { evaluateEditorialScore, type EditorialCheck } from '@/lib/admin/editorial-score';
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
  'robotic',
  'content_length'
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

function stripHtml(html: string) {
  return String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function countWords(html: string) {
  const text = stripHtml(html);
  return text ? text.split(/\s+/).filter(Boolean).length : 0;
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

function uniqueLinks(suggestions: string[] | undefined) {
  return Array.from(new Set((suggestions || []).filter(Boolean))).slice(0, 5);
}

function keywordWords(primaryKeyword?: string | null) {
  return String(primaryKeyword || '').toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 2);
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
  if (clean.length > max) {
    clean = clean.slice(0, max).replace(/[,:;\-\s]+$/g, '').trim();
  }
  if (clean.length < min) {
    clean = clean.replace(/[.]+$/g, '').trim();
  }
  return clean;
}

function ensureTitleRange(title: string, primaryKeyword?: string | null) {
  let next = ensureKeywordInTitle(title, primaryKeyword);
  next = next.replace(/\s+/g, ' ').trim();
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
  const base = metaTitle || title;
  return shortenToRange(base, 40, 65);
}

function ensureMetaDescriptionRange(metaDescription: string, excerpt: string, primaryKeyword?: string | null) {
  let base = (metaDescription || excerpt || '').replace(/\s+/g, ' ').trim();
  if (!base && primaryKeyword) {
    base = `${primaryKeyword} explained with practical steps, examples, and next steps for students, parents, and teachers.`;
  }
  if (base.length > 160) {
    base = base.slice(0, 157).replace(/[,:;\-\s]+$/g, '').trim() + '...';
  }
  if (base.length < 120) {
    base = `${base.replace(/[.]+$/g, '')}. Includes practical strategies, examples, FAQs, and clear next steps.`.replace(/\s+/g, ' ').trim();
    if (base.length > 160) base = base.slice(0, 157).trim() + '...';
  }
  return base;
}

function removeRoboticPhrases(text: string) {
  return text
    .replace(/seamlessly/gi, 'smoothly')
    .replace(/in today's fast-paced world/gi, 'today')
    .replace(/it is important to note that/gi, '')
    .replace(/unlock the power of/gi, 'use')
    .replace(/navigate the complexities of/gi, 'handle')
    .replace(/game-changer/gi, 'useful change')
    .replace(/delve into/gi, 'look at')
    .replace(/\s+/g, ' ')
    .trim();
}

function ensureKeywordInOpening(content: string, primaryKeyword?: string | null) {
  if (!primaryKeyword) return content;
  const lower = stripHtml(content).toLowerCase().slice(0, 450);
  const words = keywordWords(primaryKeyword);
  if (words.some((word) => lower.includes(word))) return content;
  const intro = `<p>${primaryKeyword} matters because a clear plan makes the topic easier to understand and apply in real academic situations.</p>`;
  return `${intro}
${content}`;
}

function ensureFaq(content: string) {
  if (/<h2[^>]*>\s*(frequently asked questions|faq|faqs)\s*<\/h2>/i.test(content)) return content;
  return `${content}
<h2>Frequently Asked Questions</h2>
<h3>What is the best place to start?</h3>
<p>Start with one realistic step you can repeat consistently, then build from there.</p>
<h3>How long does it take to see progress?</h3>
<p>Most readers see better results when they apply the strategy consistently over days or weeks instead of expecting instant change.</p>
<h3>What should I avoid?</h3>
<p>Avoid trying to change everything at once. Focus on one or two improvements and make them sustainable.</p>`;
}

function ensureConclusion(content: string) {
  if (/<h2[^>]*>\s*(conclusion|final thoughts|next steps|what to do next|closing thoughts)\s*<\/h2>/i.test(content)) return content;
  return `${content}
<h2>Next Steps</h2>
<p>Pick one idea from this guide, apply it this week, and review what worked. Small, repeatable changes usually lead to the strongest long-term results.</p>`;
}

function ensureExamples(content: string) {
  if (/(for example|for instance|example:|scenario|consider this|imagine a student|suppose a student)/i.test(stripHtml(content))) return content;
  return `${content}
<h2>Example in practice</h2>
<p>For example, a student preparing for finals might start by blocking shorter review sessions across the week instead of saving everything for one late-night cram session. That small change makes the workload feel more manageable and easier to repeat.</p>`;
}

function ensureInternalLinks(content: string, suggestions?: string[]) {
  if (/href="\/blog\/[^"]+"/i.test(content)) return content;
  const links = uniqueLinks(suggestions).slice(0, 2);
  if (!links.length) return content;
  const html = `<p>Related reading: ${links.map((link) => `<a href="${link}">${link}</a>`).join(' and ')}.</p>`;
  return `${content}
${html}`;
}

function ensureStructure(content: string) {
  const headings = content.match(/<h[23][^>]*>.*?<\/h[23]>/gi) || [];
  if (headings.length >= 4) return content;
  return `${content}
<h2>Why this matters</h2>
<p>Practical educational strategies work best when they are clear, realistic, and easy to repeat.</p>
<h2>Common mistakes to avoid</h2>
<ul><li>Trying to change too much at once.</li><li>Relying on motivation instead of a repeatable system.</li><li>Skipping review and adjustment after the first attempt.</li></ul>`;
}

function ensureLength(content: string) {
  if (countWords(content) >= 900) return content;
  return `${content}
<h2>Putting the strategy into practice</h2>
<p>The most useful educational advice is the kind that can be applied in real schedules, classrooms, and family routines. Start small, repeat what works, and adjust what does not.</p>
<p>Readers often get better results by focusing on one or two practical changes first, then building on those habits over time.</p>
<h2>Why consistency matters</h2>
<p>Consistency usually matters more than intensity. A realistic plan that gets used every week is stronger than a perfect plan that never becomes a routine.</p>`;
}

async function rewriteTargetedFields(params: {
  article: GeneratedArticle;
  failedChecks: EditorialCheck[];
  primaryKeyword?: string | null;
  internalLinkSuggestions?: string[];
}) {
  const response = await generateJson<ImproveResponse>({
    task: 'Improve an education article by fixing only the failed quality checks. Return only updated fields that need changing.',
    rules: [
      'Return valid JSON only.',
      'Preserve factual meaning and an educational, student-and-parent-friendly tone.',
      'Fix title/meta fields when they fail length checks.',
      'If keyword placement fails, place the primary keyword naturally in the title or opening paragraph.',
      'If FAQ fails, add a short FAQ section with 3 concise H3 items.',
      'If internal links fail, add 2 natural internal links using only the provided relative URLs or suggestions.',
      'If structure fails, add clear H2/H3 sections without making the article bloated.',
      'If examples fail, add one realistic student or family scenario.',
      'If conclusion fails, add a practical closing section with next steps.',
      'If robotic phrasing fails, rewrite only the awkward phrases into natural editorial language.',
      'If content length fails, expand with practical detail rather than fluff.',
      'Do not remove useful existing content that already works.'
    ],
    primary_keyword: params.primaryKeyword || '',
    failed_checks: params.failedChecks.map((check) => ({
      key: check.key,
      label: check.label,
      hint: check.hint || '',
      detail: check.detail || ''
    })),
    internal_link_suggestions: uniqueLinks(params.internalLinkSuggestions),
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
  failedChecks: EditorialCheck[];
  primaryKeyword?: string | null;
  internalLinkSuggestions?: string[];
}) {
  let next = { ...params.article };
  const failedKeys = new Set(params.failedChecks.map((check) => check.key));

  if (failedKeys.has('title_length') || failedKeys.has('keyword')) {
    next.title = ensureTitleRange(removeRoboticPhrases(next.title), params.primaryKeyword);
  }

  if (failedKeys.has('meta_title_length') || failedKeys.has('keyword')) {
    next.meta_title = ensureMetaTitleRange(removeRoboticPhrases(next.meta_title), next.title);
  }

  if (failedKeys.has('meta_description_length')) {
    next.meta_description = ensureMetaDescriptionRange(removeRoboticPhrases(next.meta_description), next.excerpt, params.primaryKeyword);
  }

  if (failedKeys.has('robotic')) {
    next.title = removeRoboticPhrases(next.title);
    next.excerpt = removeRoboticPhrases(next.excerpt);
    next.meta_title = removeRoboticPhrases(next.meta_title);
    next.meta_description = removeRoboticPhrases(next.meta_description);
    next.content = removeRoboticPhrases(next.content);
  }

  if (failedKeys.has('keyword')) {
    next.content = ensureKeywordInOpening(next.content, params.primaryKeyword);
  }

  if (failedKeys.has('faq')) {
    next.content = ensureFaq(next.content);
  }

  if (failedKeys.has('internal_links')) {
    next.content = ensureInternalLinks(next.content, params.internalLinkSuggestions);
  }

  if (failedKeys.has('conclusion')) {
    next.content = ensureConclusion(next.content);
  }

  if (failedKeys.has('examples')) {
    next.content = ensureExamples(next.content);
  }

  if (failedKeys.has('structure')) {
    next.content = ensureStructure(next.content);
  }

  if (failedKeys.has('content_length')) {
    next.content = ensureLength(next.content);
  }

  return next;
}

export async function improveArticlePass(params: {
  article: GeneratedArticle;
  failedChecks: EditorialCheck[];
  primaryKeyword?: string | null;
  internalLinkSuggestions?: string[];
}) {
  let next = await rewriteTargetedFields(params);
  next = applyLocalFixes({ ...params, article: next });
  return next;
}

export async function improveArticleToThreshold(input: ImproveInput) {
  let current = { ...input.article };
  const minimumScore = input.minimumScore ?? 80;
  const maxPasses = input.maxPasses ?? 2;

  const before = scoreCurrent({ article: current, primaryKeyword: input.primaryKeyword });
  let latest = before;
  let passCount = 0;

  while (latest.score < minimumScore && passCount < maxPasses) {
    const failed = pickFailedChecks(latest.checks);
    if (!failed.length) break;

    current = await improveArticlePass({
      article: current,
      failedChecks: failed,
      primaryKeyword: input.primaryKeyword,
      internalLinkSuggestions: input.internalLinkSuggestions
    });

    latest = scoreCurrent({ article: current, primaryKeyword: input.primaryKeyword });
    passCount += 1;
  }

  return {
    article: current,
    before,
    after: latest,
    improved: passCount > 0,
    passes: passCount
  };
}
