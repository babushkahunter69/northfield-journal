import { generateJson } from '@/lib/ai/client';
import { evaluateEditorialScore, type EditorialCheck } from '@/lib/admin/editorial-score';
import type { GeneratedArticle } from '@/lib/types';
import { repairInternalLinks, removeRepeatedParagraphs } from '@/lib/content/repairInternalLinks';

const MIN_WORDS = 2000;
const TARGET_WORDS = 2150;

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

function sentenceCase(value: string) {
  const clean = String(value || '').replace(/\s+/g, ' ').trim();
  if (!clean) return clean;
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function keywordWords(primaryKeyword?: string | null) {
  return String(primaryKeyword || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2);
}

function titleFromKeyword(primaryKeyword?: string | null) {
  const keyword = sentenceCase(String(primaryKeyword || '').replace(/[-_]+/g, ' '));
  if (!keyword) return 'Practical Learning Strategies for Students';

  const lowered = keyword.toLowerCase();

  if (/thesis|essay|research|writing|paragraph|citation/.test(lowered)) {
    return keyword.length <= 60 ? keyword : 'How Students Can Write Stronger Essays';
  }

  if (/exam|test|final|sat|act|revision/.test(lowered)) {
    return keyword.length <= 60 ? keyword : 'Better Study Habits Before Exams';
  }

  if (/parent|homework|child|family/.test(lowered)) {
    return keyword.length <= 60 ? keyword : 'Practical Homework Support for Parents';
  }

  if (/adhd|dyslexia|iep|504|learning disabil|accommodation|inclusive/.test(lowered)) {
    return keyword.length <= 60 ? keyword : 'Classroom Support for Diverse Learners';
  }

  return keyword.length <= 60 ? keyword : 'Practical Learning Strategies for Students';
}

function hasKeywordSignal(value: string, primaryKeyword?: string | null) {
  const lower = String(value || '').toLowerCase();
  const words = keywordWords(primaryKeyword);
  return words.length === 0 || words.some((word) => lower.includes(word));
}

function makeBetterTitle(title: string, primaryKeyword?: string | null) {
  let clean = String(title || '').replace(/\s+/g, ' ').trim();

  // Strip boilerplate suffixes
  clean = clean
    .replace(/\s*[:|]\s*A Practical Guide.*$/i, '')
    .replace(/\s*[:|]\s*Practical Tips.*$/i, '')
    .replace(/\s*[-|]\s*Northfield Journal.*$/i, '')
    .replace(/\bUltimate Guide to\b/i, 'Guide to')
    .trim();

  // If keyword signal is missing, build from keyword
  if (!hasKeywordSignal(clean, primaryKeyword)) {
    clean = titleFromKeyword(primaryKeyword);
  }

  // Too short — pad it
  if (clean.length < 35) {
    clean = `${clean}: Practical Student Guide`.replace(/\s+/g, ' ').trim();
  }

  // Too long — do NOT truncate. Generate a new relevant title instead.
  if (clean.length > 70) {
    clean = titleFromKeyword(primaryKeyword);
  }

  // Drop trailing words until within limit (preserves keyword signal)
  if (clean.length > 70) {
    const words = clean.split(' ');
    while (clean.length > 70 && words.length > 4) {
      words.pop();
      clean = words.join(' ').trim();
    }
  }

  // Final safety net
  if (clean.length > 70 || clean.length < 35) {
    clean = 'Practical Learning Strategies for Students';
  }

  return clean;
}

function makeMetaTitle(title: string, primaryKeyword?: string | null) {
  const candidates = [
    title,
    titleFromKeyword(primaryKeyword),
    `${titleFromKeyword(primaryKeyword)} Guide`,
    'Practical Learning Strategies for Students'
  ].map((item) => item.replace(/\s+/g, ' ').trim());

  const usable = candidates.find((item) => item.length >= 40 && item.length <= 65);
  if (usable) return usable;

  const base = candidates.find((item) => item.length < 65) || 'Practical Learning Strategies for Students';
  return base.length >= 40 ? base : `${base} Guide`;
}

function makeMetaDescription(excerpt: string, primaryKeyword?: string | null) {
  const topic = sentenceCase(String(primaryKeyword || '').replace(/[-_]+/g, ' ')) || 'this education topic';
  const cleanExcerpt = String(excerpt || '').replace(/\s+/g, ' ').trim();

  const candidates = [
    cleanExcerpt,
    `Learn practical steps for ${topic.toLowerCase()}, with examples, common mistakes, FAQs, and clear next steps for students, parents, and teachers.`,
    `A clear guide to ${topic.toLowerCase()} with useful examples, simple routines, common mistakes, and practical next steps for real learning situations.`
  ];

  for (const candidate of candidates) {
    const clean = candidate.replace(/\s+/g, ' ').trim();
    if (clean.length >= 120 && clean.length <= 160) return clean;
  }

  return `Learn practical steps for ${topic.toLowerCase()}, with examples, common mistakes, FAQs, and clear next steps for students, parents, and teachers.`
    .slice(0, 160)
    .trim();
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

function uniqueLinks(suggestions: string[] | undefined) {
  return Array.from(
    new Set(
      (suggestions || [])
        .map((link) => String(link || '').trim())
        .filter((link) => /^\/blog\/[a-z0-9][a-z0-9-]*$/i.test(link))
    )
  ).slice(0, 5);
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

  const topic = sentenceCase(String(primaryKeyword).replace(/[-_]+/g, ' '));
  return `<p>${topic} is easier to use when students have a clear process, practical examples, and a realistic way to apply the idea in school or at home.</p>\n${content}`;
}

function countFaqItems(content: string) {
  const hasFaq = /<h[23][^>]*>\s*(frequently asked questions|faq|faqs)\s*<\/h[23]>/i.test(content);
  if (!hasFaq) return 0;

  const faqSection = String(content || '')
    .split(/<h[23][^>]*>\s*(?:frequently asked questions|faq|faqs)\s*<\/h[23]>/i)
    .pop() || '';

  const beforeNextMajorSection = faqSection.split(/<h2[^>]*>/i)[0] || faqSection;
  return (beforeNextMajorSection.match(/<h3[^>]*>.*?<\/h3>/gi) || []).length;
}

function removeWeakFaq(content: string) {
  return String(content || '').replace(
    /<h[23][^>]*>\s*(?:frequently asked questions|faq|faqs)\s*<\/h[23]>[\s\S]*?(?=<h2[^>]*>|$)/i,
    ''
  );
}

function ensureFaq(content: string, primaryKeyword?: string | null) {
  if (countFaqItems(content) >= 3) return content;

  const topic = sentenceCase(String(primaryKeyword || 'this topic').replace(/[-_]+/g, ' '));
  const withoutWeakFaq = removeWeakFaq(content);

  return `${withoutWeakFaq}
<h2>Frequently Asked Questions</h2>
<h3>What is the first step for ${topic}?</h3>
<p>Start by naming the exact task, the learner's current challenge, and one small action that can be completed today. A narrow first step keeps the work from feeling too broad.</p>
<h3>How can students use this strategy consistently?</h3>
<p>Students are more consistent when the strategy is connected to an existing routine, such as planning before homework, reviewing notes after class, or checking work before submitting it.</p>
<h3>How can parents or teachers support progress?</h3>
<p>Parents and teachers can model the process, give specific feedback, and ask reflective questions. The goal is to guide the learner without taking over the work.</p>
<h3>How long does it take to see improvement?</h3>
<p>Most students notice meaningful progress within two to three weeks of consistent practice. The key is to use one strategy regularly rather than switching between multiple approaches too quickly.</p>
<h3>What is the most common mistake to avoid?</h3>
<p>The most common mistake is trying to change too many habits at once. Picking one clear strategy and sticking with it for a full week gives students the best chance to measure what is actually working.</p>`;
}

function ensureConclusion(content: string) {
  if (/<h2[^>]*>\s*(conclusion|final thoughts|next steps|what to do next|closing thoughts|what you should do next)\s*<\/h2>/i.test(content)) {
    return content;
  }

  return `${content}
<h2>What You Should Do Next</h2>
<p>Choose one strategy from this guide and try it this week. Keep the first step small, watch what changes, and adjust the routine based on what the learner actually needs. Clear, repeatable practice usually works better than adding more pressure.</p>`;
}

function ensureExamples(content: string, primaryKeyword?: string | null) {
  if (/(for example|for instance|example:|scenario|consider this|imagine a student|suppose a student)/i.test(stripHtml(content))) {
    return content;
  }

  const topic = sentenceCase(String(primaryKeyword || 'this strategy').replace(/[-_]+/g, ' '));

  return `${content}
<h2>Example in Practice</h2>
<p>For example, a student working on ${topic.toLowerCase()} might start with a short checklist before beginning the assignment. The checklist could ask what the task requires, what materials are needed, and what the first small step should be. This turns a vague goal into a repeatable routine.</p>`;
}

function shortAnchorLabel(path: string) {
  const words = sentenceCase(path.replace(/^\/blog\//, '').replace(/-/g, ' '))
    .split(/\s+/)
    .filter(Boolean);
  return words.slice(0, 8).join(' ');
}

function relatedGuideList(links: string[]) {
  const unique = Array.from(new Set(links)).slice(0, 3);
  const items = unique
    .map((link) => `<li><a href="${link}">${shortAnchorLabel(link)}</a></li>`)
    .join('');

  return `<h2>Related Guides</h2>
<p>Continue with these related Northfield Journal guides.</p>
<ul>${items}</ul>`;
}

function ensureInternalLinks(content: string, suggestions?: string[]) {
  const currentCount = (String(content || '').match(/href=["']\/blog\/[a-z0-9][a-z0-9-]*["']/gi) || []).length;
  if (currentCount >= 2) return content;

  const links = uniqueLinks(suggestions);

  if (links.length >= 2) {
    return `${content}
${relatedGuideList(links)}`;
  }

  if (links.length === 1) {
    return `${content}
${relatedGuideList([links[0], '/blog'])}`;
  }

  return `${content}
${relatedGuideList(['/blog', '/journal'])}`;
}

function headingText(headingHtml: string) {
  return stripHtml(headingHtml).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function hasHeading(content: string, heading: string) {
  const target = heading.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const headings = String(content || '').match(/<h[23][^>]*>.*?<\/h[23]>/gi) || [];
  return headings.some((item) => headingText(item) === target);
}

function removeDuplicateHeadingsAndSections(content: string) {
  const seen = new Set<string>();

  return String(content || '').replace(
    /(<h[23][^>]*>[\s\S]*?<\/h[23]>)([\s\S]*?)(?=<h[23][^>]*>|$)/gi,
    (full, heading, body) => {
      const key = headingText(heading);
      if (!key) return full;
      if (seen.has(key)) return '';
      seen.add(key);
      return `${heading}${body}`;
    }
  );
}

function ensureStructure(content: string) {
  let next = String(content || '');

  const needed = [
    {
      heading: 'Why This Matters',
      body: '<p>Practical education advice works best when it gives learners a clear path. The goal is not to add pressure. The goal is to make the next step easier to see, practice, and repeat.</p>'
    },
    {
      heading: 'Common Mistakes to Avoid',
      body: '<ul><li>Trying to change too many habits at once.</li><li>Using a plan that is too complicated to repeat.</li><li>Measuring progress only by grades instead of confidence, consistency, and completion.</li></ul>'
    }
  ];

  for (const item of needed) {
    if (!hasHeading(next, item.heading)) {
      next += `\n<h2>${item.heading}</h2>\n${item.body}`;
    }
  }

  return next;
}

function expansionSections(primaryKeyword?: string | null) {
  const topic = sentenceCase(String(primaryKeyword || 'this learning goal').replace(/[-_]+/g, ' '));

  return [
    {
      heading: 'Build the Skill Step by Step',
      body: `<p>${topic} becomes easier when the learner does not have to solve every part at once. Start with one small routine, practice it several times, and then add the next layer only when the first step feels familiar.</p><p>This approach helps students build confidence without feeling rushed. It also gives parents and teachers a clearer way to notice what is working and what still needs support.</p>`
    },
    {
      heading: 'Use Feedback Without Overloading the Student',
      body: '<p>Feedback should be specific and short. Instead of correcting everything at once, focus on one improvement the student can make right away. This keeps the learner engaged and prevents the process from feeling discouraging.</p><p>A useful feedback question is: what is one thing that would make the next attempt easier? That question turns feedback into action instead of criticism.</p>'
    },
    {
      heading: 'Adapt the Plan for Different Learners',
      body: '<p>Different students may need different levels of structure. Some learners need visual reminders, some need checklists, and others need a short conversation before starting. The strategy should match the learner, not force every student into the same routine.</p><p>When a plan is not working, simplify it before replacing it. Often the problem is not the strategy itself, but that it has too many steps or not enough support at the beginning.</p>'
    },
    {
      heading: 'Measure Progress in Practical Ways',
      body: '<p>Progress is not only a test score. It can also look like fewer missed assignments, more confidence, better focus, or less stress when starting work. These signs matter because they show the learner is gaining control of the process.</p><p>A weekly review can help. Ask what worked, what felt hard, and what one adjustment would make next week easier. This keeps improvement realistic and steady.</p>'
    },
    {
      heading: 'Classroom Scenario',
      body: '<p>For example, a teacher might introduce the strategy with a short model, guide students through one attempt, and then let them practice independently. Afterward, students can name what helped and what still felt unclear.</p><p>This gives the teacher useful information and gives students a process they can repeat later. The lesson becomes more than advice; it becomes a practical routine.</p>'
    },
    {
      heading: 'Home Scenario',
      body: '<p>At home, a parent might help the student choose a regular place to work, set a short starting routine, and review the first task together. The parent does not need to take over. The goal is to make the beginning easier.</p><p>Once the student starts more independently, the parent can step back and use brief check-ins instead of constant reminders. That balance supports responsibility while still giving help when needed.</p>'
    },
    {
      heading: 'Practice Plan for the First Week',
      body: '<p>During the first week, keep the plan simple. Choose one routine, use it at the same time each day, and review whether it made the task easier to start or finish. A small plan that is actually used is better than a detailed plan that students abandon.</p><p>By the end of the week, the learner should be able to explain what helped, what still felt difficult, and what adjustment would make the next attempt more manageable.</p>'
    },
    {
      heading: 'How Adults Can Support Without Taking Over',
      body: '<p>Support works best when adults guide the process instead of doing the work for the student. That might mean asking a planning question, helping the learner choose a first step, or checking in after the task is complete.</p><p>The goal is gradual independence. When adults step back slowly, students have room to practice responsibility while still knowing help is available when they need it.</p>'
    }
  ];
}

function enforceMinimumLength(content: string, primaryKeyword?: string | null) {
  let next = removeDuplicateHeadingsAndSections(removeRepeatedParagraphs(String(content || '')));
  const sections = expansionSections(primaryKeyword);

  for (const section of sections) {
    if (countWords(next) >= TARGET_WORDS) break;

    if (!hasHeading(next, section.heading)) {
      next += `\n<h2>${section.heading}</h2>\n${section.body}`;
    }

    next = removeDuplicateHeadingsAndSections(removeRepeatedParagraphs(next));
  }

  // If still under MIN_WORDS after all expansion sections, add Final Review
  if (countWords(next) < MIN_WORDS && !hasHeading(next, 'Final Review')) {
    next += '\n<h2>Final Review</h2>\n<p>Before treating the strategy as complete, review whether the learner can explain the process, use it with less prompting, and adjust it when the task changes. If the answer is yes, the routine is becoming dependable. If not, make the first step smaller and practice again with clearer support.</p><p>This final review matters because students often need more than advice. They need a process that can be repeated, adjusted, and used when the next assignment, lesson, or challenge appears.</p>';
  }

  return removeDuplicateHeadingsAndSections(removeRepeatedParagraphs(next));
}

function applyDeterministicSeoFixes(params: {
  article: GeneratedArticle;
  primaryKeyword?: string | null;
  internalLinkSuggestions?: string[];
}) {
  const next = { ...params.article };

  next.title = makeBetterTitle(removeRoboticPhrases(next.title), params.primaryKeyword);
  next.excerpt = removeRoboticPhrases(next.excerpt);
  next.meta_title = makeMetaTitle(removeRoboticPhrases(next.meta_title || next.title), params.primaryKeyword);
  next.meta_description = makeMetaDescription(removeRoboticPhrases(next.meta_description || next.excerpt), params.primaryKeyword);

  next.content = String(next.content || '').replace(/^\s*#{1,6}\s+/gm, '');
  next.content = stripGeneratedRelatedText(next.content);
  next.content = removeRoboticPhrases(next.content);
  next.content = ensureKeywordInOpening(next.content, params.primaryKeyword);
  next.content = ensureStructure(next.content);
  next.content = ensureExamples(next.content, params.primaryKeyword);
  next.content = ensureInternalLinks(next.content, params.internalLinkSuggestions);
  next.content = ensureFaq(next.content, params.primaryKeyword);
  next.content = ensureConclusion(next.content);
  next.content = enforceMinimumLength(next.content, params.primaryKeyword);
  next.content = stripGeneratedRelatedText(removeDuplicateHeadingsAndSections(removeRepeatedParagraphs(next.content)));

  return next;
}

async function rewriteTargetedFields(params: {
  article: GeneratedArticle;
  failedChecks: EditorialCheck[];
  primaryKeyword?: string | null;
  internalLinkSuggestions?: string[];
}) {
  const response = await generateJson<ImproveResponse>({
    task: 'Improve an education article once. Fix failed checks with clean, original, useful content. Return complete updated fields, not fragments.',
    rules: [
      'Make one complete improvement pass only.',
      'NEVER truncate titles or meta fields. If a title is too long, replace it with a new relevant title — do not cut it mid-sentence.',
      'Title must be 35 to 70 characters. Write a new descriptive, relevant title if the current one is too long or too short.',
      'Meta title must be 40 to 65 characters and useful for search. Rewrite it if needed — never shorten it to the point of being useless.',
      'Meta description must be 120 to 160 characters and summarize the article clearly. If it is too short, expand it. If too long, rephrase it — do not cut it.',
      'If content is under 2,000 words, expand it significantly with unique practical sections, real examples, FAQs, and next steps until it reaches at least 2,000 words.',
      'Always include at least 2 internal links. Use the verified links provided. If fewer than 2 are provided, add links to /blog and /journal.',
      'Always include a Frequently Asked Questions section with exactly 5 h3 questions inside it.',
      'Always include at least one realistic example or scenario with "for example" or "for instance".',
      'Always end with a section headed "What You Should Do Next" or "Conclusion" or "Next Steps".',
      'Do not repeat headings, paragraphs, or ideas.',
      'Do not add fake external links or invented source URLs.',
      'Return HTML content using p, h2, h3, ul, li, and a tags only. Do not return markdown.'
    ],
    primary_keyword: params.primaryKeyword || '',
    failed_checks: params.failedChecks.map((check) => ({
      key: check.key,
      label: check.label,
      hint: check.hint || '',
      detail: check.detail || ''
    })),
    verified_internal_links: uniqueLinks(params.internalLinkSuggestions),
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

export async function improveArticlePass(params: {
  article: GeneratedArticle;
  failedChecks: EditorialCheck[];
  primaryKeyword?: string | null;
  internalLinkSuggestions?: string[];
  useAi?: boolean;
}) {
  let next = params.article;

  if (params.useAi !== false && (process.env.AI_API_KEY || process.env.OPENAI_API_KEY)) {
    try {
      next = await rewriteTargetedFields(params);
    } catch (error) {
      console.warn('AI rewrite failed, using deterministic SEO fixes.', error);
    }
  }

  next = applyDeterministicSeoFixes({
    article: next,
    primaryKeyword: params.primaryKeyword,
    internalLinkSuggestions: params.internalLinkSuggestions
  });

  next.content = await repairInternalLinks(next.content, {
    excludeSlug: (next as any).slug || null,
    title: next.title,
    excerpt: next.excerpt,
    keywords: params.primaryKeyword ? [params.primaryKeyword] : []
  });

  next.content = stripGeneratedRelatedText(
    removeDuplicateHeadingsAndSections(
      removeRepeatedParagraphs(
        enforceMinimumLength(next.content, params.primaryKeyword)
      )
    )
  );

  return next;
}

export async function improveArticleToThreshold(input: ImproveInput) {
  let current = { ...input.article };
  const minimumScore = input.minimumScore ?? 100;

  const before = scoreCurrent({ article: current, primaryKeyword: input.primaryKeyword });
  let aiUsed = false;

  // First try the local fixer. This costs no AI tokens and handles most checklist items:
  // title/meta length, keyword placement, structure, FAQ, internal links, conclusion,
  // robotic wording, duplicate sections, and minimum article length.
  current = await improveArticlePass({
    article: current,
    failedChecks: pickFailedChecks(before.checks),
    primaryKeyword: input.primaryKeyword,
    internalLinkSuggestions: input.internalLinkSuggestions,
    useAi: false
  });

  let latest = scoreCurrent({ article: current, primaryKeyword: input.primaryKeyword });

  // Use AI at most once, and only if local fixes did not fully pass the editorial checks.
  // This prevents repeated token/credit spend when the button is clicked again.
  if (latest.score < minimumScore || latest.stats.wordCount < MIN_WORDS) {
    current = await improveArticlePass({
      article: current,
      failedChecks: pickFailedChecks(latest.checks),
      primaryKeyword: input.primaryKeyword,
      internalLinkSuggestions: input.internalLinkSuggestions,
      useAi: true
    });
    aiUsed = true;
  }

  // No more AI calls after the optional single AI pass. These are local-only cleanup passes.
  for (let i = 0; i < 3; i += 1) {
    latest = scoreCurrent({ article: current, primaryKeyword: input.primaryKeyword });

    if (latest.score >= minimumScore && latest.stats.wordCount >= MIN_WORDS) {
      break;
    }

    current = await improveArticlePass({
      article: current,
      failedChecks: pickFailedChecks(latest.checks),
      primaryKeyword: input.primaryKeyword,
      internalLinkSuggestions: input.internalLinkSuggestions,
      useAi: false
    });
  }

  current = applyDeterministicSeoFixes({
    article: current,
    primaryKeyword: input.primaryKeyword,
    internalLinkSuggestions: input.internalLinkSuggestions
  });

  current.content = await repairInternalLinks(current.content, {
    excludeSlug: (current as any).slug || null,
    title: current.title,
    excerpt: current.excerpt,
    keywords: input.primaryKeyword ? [input.primaryKeyword] : []
  });

  current.content = stripGeneratedRelatedText(
    removeDuplicateHeadingsAndSections(
      removeRepeatedParagraphs(
        enforceMinimumLength(current.content, input.primaryKeyword)
      )
    )
  );

  const after = scoreCurrent({ article: current, primaryKeyword: input.primaryKeyword });

  return {
    article: current,
    before,
    after,
    improved: after.score > before.score || after.stats.wordCount > before.stats.wordCount,
    passes: 1,
    aiUsed
  };
}
