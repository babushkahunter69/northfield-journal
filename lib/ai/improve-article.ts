import { generateJson } from '@/lib/ai/client';
import { evaluateEditorialScore, type EditorialCheck } from '@/lib/admin/editorial-score';
import type { GeneratedArticle } from '@/lib/types';
import { repairInternalLinks, removeRepeatedParagraphs } from '@/lib/content/repairInternalLinks';

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
  return Array.from(
    new Set(
      (suggestions || [])
        .map((link) => String(link || '').trim())
        .filter((link) => /^\/blog\/[a-z0-9][a-z0-9-]*$/i.test(link))
    )
  ).slice(0, 5);
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
  if (clean.length > max) clean = clean.slice(0, max).replace(/[,:;\-\s]+$/g, '').trim();
  if (clean.length < min) clean = clean.replace(/[.]+$/g, '').trim();
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
  return shortenToRange(metaTitle || title, 40, 65);
}

function ensureMetaDescriptionRange(metaDescription: string, excerpt: string, primaryKeyword?: string | null) {
  let base = (metaDescription || excerpt || '').replace(/\s+/g, ' ').trim();
  if (!base && primaryKeyword) {
    base = `${primaryKeyword} explained with practical steps, examples, and next steps for students, parents, and teachers.`;
  }
  if (base.length > 160) base = base.slice(0, 157).replace(/[,:;\-\s]+$/g, '').trim() + '...';
  if (base.length < 120) {
    base = `${base.replace(/[.]+$/g, '')}. Includes practical strategies, examples, FAQs, and clear next steps.`.replace(/\s+/g, ' ').trim();
    if (base.length > 160) base = base.slice(0, 157).trim() + '...';
  }
  return base;
}

function removeRoboticPhrases(text: string) {
  return String(text || '')
    .replace(/\bseamlessly\b/gi, 'smoothly')
    .replace(/\bin today['’]s fast-paced world\b/gi, 'today')
    .replace(/\bit is important to note that\b/gi, '')
    .replace(/\bunlock the power of\b/gi, 'use')
    .replace(/\bnavigate the complexities of\b/gi, 'handle')
    .replace(/\bgame-changer\b/gi, 'useful change')
    .replace(/\bdelve into\b/gi, 'look at')
    .replace(/\s+/g, ' ')
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

  for (const phrase of BAD_LINK_PHRASES) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    next = next.replace(new RegExp(`[^.!?]*\\b${escaped}\\b[^.!?]*[.!?]`, 'gi'), '');
    next = next.replace(new RegExp(escaped, 'gi'), '');
  }

  return next.replace(/\n{3,}/g, '\n\n').trim();
}

function ensureKeywordInOpening(content: string, primaryKeyword?: string | null) {
  if (!primaryKeyword) return content;
  const lower = stripHtml(content).toLowerCase().slice(0, 450);
  const words = keywordWords(primaryKeyword);
  if (words.some((word) => lower.includes(word))) return content;
  const intro = `<p>${primaryKeyword} matters because a clear plan makes the topic easier to understand and apply in real academic situations.</p>`;
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

  const topic = primaryKeyword || 'this topic';
  const withoutWeakFaq = String(content || '').replace(
    /<h[23][^>]*>\s*(?:frequently asked questions|faq|faqs)\s*<\/h[23]>[\s\S]*?(?=<h2[^>]*>|$)/i,
    ''
  );

  return `${withoutWeakFaq}\n<h2>Frequently Asked Questions</h2>\n<h3>What is the first step for ${topic}?</h3>\n<p>Start by identifying the assignment goal, the learner's current challenge, and one practical action that can be completed today. A clear first step prevents the topic from feeling too broad.</p>\n<h3>How can students use this strategy consistently?</h3>\n<p>Students are more likely to stay consistent when the strategy is attached to an existing routine, such as planning before homework, reviewing notes after class, or checking work before submitting it.</p>\n<h3>How can parents or teachers support progress?</h3>\n<p>Parents and teachers can support progress by modeling the process, giving specific feedback, and asking reflective questions instead of taking over the work.</p>`;
}

function ensureConclusion(content: string) {
  if (/<h2[^>]*>\s*(conclusion|final thoughts|next steps|what to do next|closing thoughts|what you should do next)\s*<\/h2>/i.test(content)) return content;
  return `${content}\n<h2>Next Steps</h2>\n<p>Pick one idea from this guide, apply it this week, and review what worked. Small, repeatable changes usually lead to the strongest long-term results.</p>`;
}

function ensureExamples(content: string) {
  if (/(for example|for instance|example:|scenario|consider this|imagine a student|suppose a student)/i.test(stripHtml(content))) return content;
  return `${content}\n<h2>Example in practice</h2>\n<p>For example, a student preparing for finals might start by blocking shorter review sessions across the week instead of saving everything for one late-night cram session. That small change makes the workload feel more manageable and easier to repeat.</p>`;
}

function ensureInternalLinks(content: string, suggestions?: string[]) {
  const currentCount = (String(content || '').match(/href=["']\/blog\/[a-z0-9][a-z0-9-]*["']/gi) || []).length;
  if (currentCount >= 2) return content;

  const links = uniqueLinks(suggestions).slice(0, 2);
  if (links.length < 2) return content;

  const anchors = links.map((link) => {
    const label = link.replace(/^\/blog\//, '').replace(/-/g, ' ');
    return `<a href="${link}">${label}</a>`;
  });

  return `${content}\n<p>Related reading: ${anchors.join(' and ')}.</p>`;
}

function ensureStructure(content: string) {
  const headings = content.match(/<h[23][^>]*>.*?<\/h[23]>/gi) || [];
  if (headings.length >= 4) return content;
  return `${content}\n<h2>Why this matters</h2>\n<p>Practical educational strategies work best when they are clear, realistic, and easy to repeat.</p>\n<h2>Common mistakes to avoid</h2>\n<ul><li>Trying to change too much at once.</li><li>Relying on motivation instead of a repeatable system.</li><li>Skipping review and adjustment after the first attempt.</li></ul>`;
}

function ensureLength(content: string, primaryKeyword?: string | null) {
  let next = String(content || '');
  if (countWords(next) >= 2100) return removeRepeatedParagraphs(next);

  const topic = primaryKeyword || 'the topic';
  const sections = [
    `<h2>Why ${topic} deserves a deeper plan</h2><p>A useful education guide should do more than define a topic. It should show readers how the idea works in real learning situations, where students often need structure, examples, and repeated practice before a strategy becomes dependable.</p><p>That deeper plan matters because students rarely struggle for only one reason. A writing problem may include planning, confidence, organization, vocabulary, time management, or unclear expectations. When the support is specific, it becomes easier to choose the next right step.</p>`,
    `<h2>How to start without overwhelming the learner</h2><p>The best first step is usually small and concrete. Instead of asking a student to change an entire routine, choose one repeatable action that can be practiced this week. That might be a five-minute planning habit, a checklist before submitting work, or a short reflection after class.</p><p>Small starts lower resistance. Students are more likely to use a strategy when it feels manageable, and adults can support that momentum by praising the process, not only the final result.</p>`,
    `<h2>What this looks like in the classroom</h2><p>In a classroom, the teacher can introduce the strategy with a short model, guide students through one example, and then let them try independently. This gradual release helps students see what success looks like before they are expected to produce it alone.</p><p>For example, a teacher might show how to break down a difficult assignment prompt, then ask students to identify the task, the evidence needed, and the first sentence they could write. The class can then discuss what made the process easier and where confusion remained.</p>`,
    `<h2>What this looks like at home</h2><p>At home, families can help by making the learning routine predictable. A consistent place, a clear start time, and a short checklist often work better than repeated reminders. The goal is to make the next step obvious so the student spends less energy deciding what to do.</p><p>Parents should avoid taking over the task. A helpful question is, “What is your next step?” This keeps responsibility with the student while still offering support and reducing frustration.</p>`,
    `<h2>How to adapt the strategy for different ages</h2><p>Younger learners usually need shorter instructions, more visuals, and more frequent feedback. Middle school students often need help connecting the strategy to independence, organization, and confidence. High school and college students may need fewer reminders, but they still benefit from planning tools, examples, and honest reflection.</p><p>The same core strategy can work across ages when the support changes. Keep the learning goal clear, then adjust the amount of structure based on the learner's needs.</p>`,
    `<h2>Common barriers and how to handle them</h2><p>One common barrier is inconsistency. A strategy used once is unlikely to create lasting improvement. Another barrier is choosing a plan that is too complicated. If the routine requires too many steps, students may abandon it before it becomes useful.</p><p>To handle these barriers, simplify the plan and attach it to an existing routine. A student might review notes immediately after class, organize materials before dinner, or complete a reflection every Friday. Pairing the strategy with something familiar makes it easier to repeat.</p>`,
    `<h2>How to measure progress</h2><p>Progress should be measured in more than grades. Look for signs such as fewer missed assignments, stronger explanations, better confidence, improved focus, and less stress around the task. These signs often appear before test scores or final grades improve.</p><p>A weekly reflection can help students notice progress. Ask three questions: What worked this week? What still felt difficult? What is one change to try next week? These questions turn ordinary practice into a feedback loop.</p>`,
    `<h2>Practical example</h2><p>Imagine a student who understands the lesson during class but freezes when it is time to complete written work. Instead of simply telling the student to try harder, the teacher gives a three-step planning routine: restate the task, list two supporting details, and write one starter sentence.</p><p>After several attempts, the student begins to rely on the routine without as much prompting. The improvement comes from a clear process, not from pressure. That is the kind of practical support that makes education strategies useful.</p>`,
    `<h2>Final quality check</h2><p>Before treating the strategy as complete, check whether the learner can explain it, use it without constant reminders, and adjust it when the situation changes. If the answer is yes, the strategy is becoming part of the learner's toolkit. If not, simplify the process and practice again with more support.</p>`
  ];

  for (const section of sections) {
    if (countWords(next) >= 2100) break;
    const heading = (section.match(/<h2[^>]*>(.*?)<\/h2>/i)?.[1] || '').toLowerCase();
    if (heading && stripHtml(next).toLowerCase().includes(heading)) continue;
    next += `\n${section}`;
  }

  return removeRepeatedParagraphs(next);
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
      'If internal links fail, use only the provided verified /blog/{slug} URLs. If fewer than 2 verified URLs are provided, do not add internal links or related-reading text.',
      'If structure fails, add clear H2/H3 sections without making the article bloated.',
      'If examples fail, add one realistic student or family scenario.',
      'If conclusion fails, add a practical closing section with next steps.',
      'If robotic phrasing fails, rewrite only the awkward phrases into natural editorial language.',
      'If content length fails, expand the article to at least 2,000 words with practical, unique sections. Never repeat the same paragraph to pad word count.',
      'Do not remove useful existing content that already works.',
      'Do not invent internal links, slugs, or related-reading sections.',
      'Never mention building motivation in students, effective parent-teacher communication, time management for students, or effective study habits unless those exact links were provided as verified /blog URLs.'
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

  next.title = ensureTitleRange(removeRoboticPhrases(next.title), params.primaryKeyword);
  next.excerpt = removeRoboticPhrases(next.excerpt);
  next.meta_title = ensureMetaTitleRange(removeRoboticPhrases(next.meta_title || next.title), next.title);
  next.meta_description = ensureMetaDescriptionRange(
    removeRoboticPhrases(next.meta_description || next.excerpt),
    next.excerpt,
    params.primaryKeyword
  );
  next.content = stripGeneratedRelatedText(next.content);
  next.content = removeRoboticPhrases(next.content);
  next.content = ensureKeywordInOpening(next.content, params.primaryKeyword);
  next.content = ensureStructure(next.content);
  next.content = ensureExamples(next.content);
  next.content = ensureInternalLinks(next.content, params.internalLinkSuggestions);
  next.content = ensureFaq(next.content, params.primaryKeyword);
  next.content = ensureConclusion(next.content);
  next.content = ensureLength(next.content, params.primaryKeyword);
  next.content = stripGeneratedRelatedText(removeRepeatedParagraphs(next.content));

  return next;
}

export async function improveArticlePass(params: {
  article: GeneratedArticle;
  failedChecks: EditorialCheck[];
  primaryKeyword?: string | null;
  internalLinkSuggestions?: string[];
}) {
  let next = params.article;

  if (process.env.AI_API_KEY || process.env.OPENAI_API_KEY) {
    try {
      next = await rewriteTargetedFields(params);
    } catch (error) {
      console.warn('AI rewrite failed, falling back to deterministic SEO fixes.', error);
    }
  }

  next = applyLocalFixes({ ...params, article: next });
  next.content = await repairInternalLinks(next.content, {
    excludeSlug: (next as any).slug || null,
    title: next.title,
    excerpt: next.excerpt,
    keywords: params.primaryKeyword ? [params.primaryKeyword] : []
  });
  next.content = stripGeneratedRelatedText(removeRepeatedParagraphs(next.content));

  return next;
}

export async function improveArticleToThreshold(input: ImproveInput) {
  let current = { ...input.article };
  const minimumScore = input.minimumScore ?? 100;
  const maxPasses = input.maxPasses ?? 4;

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

  current.content = await repairInternalLinks(current.content, {
    title: current.title,
    excerpt: current.excerpt,
    keywords: input.primaryKeyword ? [input.primaryKeyword] : []
  });
  latest = scoreCurrent({ article: current, primaryKeyword: input.primaryKeyword });

  return {
    article: current,
    before,
    after: latest,
    improved: passCount > 0,
    passes: passCount
  };
}
