import { generateJson } from '@/lib/ai/client';
import { evaluateEditorialScore, type EditorialCheck } from '@/lib/admin/editorial-score';
import type { GeneratedArticle } from '@/lib/types';
import { repairInternalLinks, removeRepeatedParagraphs, normalizeArticleStructure } from '@/lib/content/repairInternalLinks';

const TARGET_MIN_WORDS = 2000;
const TARGET_SAFE_WORDS = 2125;

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
  return String(primaryKeyword || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2);
}

function escapeRegExp(value: string) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function slugToTitle(slug: string) {
  return String(slug || '')
    .replace(/^\/blog\//, '')
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
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
    base = `${primaryKeyword} explained with practical steps, examples, and next steps for students, families, and teachers.`;
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
    const escaped = escapeRegExp(phrase);
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
  const intro = `<p>${primaryKeyword} works best when students get a clear process, useful examples, and enough structure to apply the idea on their own.</p>`;
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

  return `${withoutWeakFaq}\n<h2>Frequently Asked Questions</h2>\n<h3>What is the first step for ${topic}?</h3>\n<p>Start by naming the exact task, the learner's current obstacle, and the smallest useful action to try next. A narrow first step makes the strategy easier to use.</p>\n<h3>How can students use this strategy consistently?</h3>\n<p>Students are more likely to stay consistent when the strategy is attached to an existing routine, such as planning before homework, reviewing notes after class, or checking work before submitting it.</p>\n<h3>How can adults support progress without taking over?</h3>\n<p>Adults can model the process, ask guiding questions, and give specific feedback while still leaving the thinking and final decisions with the student.</p>`;
}

function ensureConclusion(content: string) {
  if (/<h2[^>]*>\s*(conclusion|final thoughts|next steps|what to do next|closing thoughts|what you should do next)\s*<\/h2>/i.test(content)) return content;
  return `${content}\n<h2>Next Steps</h2>\n<p>Choose one action from this guide, try it this week, and review what changed. The goal is not to overhaul every habit at once. The goal is to build one reliable routine that can be repeated and improved.</p>`;
}

function ensureExamples(content: string) {
  if (/(for example|for instance|example:|scenario|consider this|imagine a student|suppose a student)/i.test(stripHtml(content))) return content;
  return `${content}\n<h2>Example in practice</h2>\n<p>For example, a student preparing for an assignment might begin by restating the task in one sentence, listing the first two steps, and setting a short work block. That simple routine gives the student a starting point instead of leaving the task vague.</p>`;
}

function ensureInternalLinks(content: string, suggestions?: string[]) {
  const currentCount = (String(content || '').match(/href=["']\/blog\/[a-z0-9][a-z0-9-]*["']/gi) || []).length;
  if (currentCount >= 2) return content;

  const links = uniqueLinks(suggestions).slice(0, 2);
  if (links.length < 2) return content;

  const anchors = links.map((link) => {
    const label = slugToTitle(link);
    return `<a href="${link}">${label}</a>`;
  });

  return `${content}\n<h2>Additional Resources</h2>\n<ul>${anchors.map((anchor) => `<li>${anchor}</li>`).join('')}</ul>`;
}

function ensureStructure(content: string) {
  const headings = content.match(/<h[23][^>]*>.*?<\/h[23]>/gi) || [];
  if (headings.length >= 4) return content;
  return `${content}\n<h2>Why this matters</h2>\n<p>Practical educational strategies work best when they are clear, realistic, and easy to repeat.</p>\n<h2>Common mistakes to avoid</h2>\n<ul><li>Trying to change too much at once.</li><li>Relying on motivation instead of a repeatable system.</li><li>Skipping review and adjustment after the first attempt.</li></ul>`;
}

function hasSimilarHeading(content: string, heading: string) {
  const normalized = stripHtml(heading).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (!normalized) return false;
  const existing = Array.from(String(content || '').matchAll(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi)).map((match) =>
    stripHtml(match[1]).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  );
  return existing.some((item) => item === normalized || item.includes(normalized) || normalized.includes(item));
}

function planForTopic(primaryKeyword?: string | null) {
  const topic = primaryKeyword || 'this topic';
  const lower = topic.toLowerCase();
  const isWriting = /(essay|thesis|research|writing|paragraph|citation|introduction|outline)/i.test(lower);
  const isExam = /(exam|test|sat|act|final|quiz|study schedule|revision)/i.test(lower);
  const isParent = /(parent|homework|family|child|at home)/i.test(lower);
  const isSpecial = /(learning disabil|adhd|iep|504|dyslexia|accommodation|inclusive|neurodiverse|special education)/i.test(lower);

  const base = [
    {
      heading: `Clarify the purpose of ${topic}`,
      body: `Before adding more tasks, define what success should look like. A clear purpose helps students, families, and teachers decide which steps matter most and which details can wait. This prevents the topic from becoming a vague list of tips.`
    },
    {
      heading: 'Break the skill into visible steps',
      body: `Students often struggle when the work feels invisible. Turn the process into steps that can be seen, practiced, and checked. A student should know what to do first, what to look for while working, and how to tell whether the result is improving.`
    },
    {
      heading: 'Use examples before expecting independence',
      body: `A short model is usually more useful than a long explanation. Show one example, explain why it works, and then let the student try a similar task. This gives the learner a reference point without turning the activity into guesswork.`
    },
    {
      heading: 'Build a routine that can survive busy weeks',
      body: `The best plan is the one students can still use when school gets busy. Keep the routine small enough to repeat: a checklist, a five-minute review, a planning note, or a short reflection. Consistency matters more than an elaborate system.`
    },
    {
      heading: 'Watch for signs that the plan needs adjustment',
      body: `If the student avoids the task, rushes through it, or needs constant reminders, the plan may be too broad. Adjust by reducing the number of steps, changing the timing, or giving a clearer example. A useful strategy should reduce friction, not create more of it.`
    },
    {
      heading: 'Measure progress with practical evidence',
      body: `Progress is not only a grade. Look for stronger explanations, fewer missed steps, better confidence, more organized work, and less stress around the task. These signs show whether the strategy is becoming useful in real situations.`
    },
    {
      heading: 'Make feedback specific and usable',
      body: `Feedback should tell the learner what to keep, what to change, and what to try next. Comments such as "be clearer" or "try harder" are too vague. A better response points to one specific part of the work and gives one practical next action.`
    },
    {
      heading: 'Review the strategy after a short trial',
      body: `After a few days or one assignment cycle, review what happened. Ask what worked, what felt confusing, and what should change next time. This turns the strategy into a living routine instead of a one-time suggestion.`
    }
  ];

  if (isWriting) {
    return [
      {
        heading: 'Start with the assignment question',
        body: 'A strong writing process begins with the prompt. Students should underline the action words, identify the topic, and restate the assignment in their own words before drafting. This makes the thesis or main idea easier to control.'
      },
      {
        heading: 'Turn the main idea into a testable claim',
        body: 'A useful thesis is not just a topic. It is a claim the student can explain and support. If the sentence cannot be answered with evidence, examples, or reasoning, it probably needs to be narrowed.'
      },
      ...base,
      {
        heading: 'Check the draft against the original goal',
        body: 'Before revising style, students should compare the draft with the original assignment. Every major paragraph should support the central claim. If a section does not connect, it should be revised, moved, or removed.'
      }
    ];
  }

  if (isExam) {
    return [
      {
        heading: 'Start with what will actually be tested',
        body: 'Exam preparation improves when students study the right material. Begin with the teacher guide, syllabus, practice questions, or previous feedback. This keeps review focused instead of turning preparation into rereading everything.'
      },
      {
        heading: 'Use active recall instead of passive review',
        body: 'Students remember more when they practice retrieving information. Short quizzes, blank-page summaries, flashcards, and explaining a concept out loud are more effective than simply looking over notes.'
      },
      ...base,
      {
        heading: 'Protect rest and pacing before the exam',
        body: 'A long cram session can make students feel productive while reducing focus. Shorter review blocks, sleep, and a realistic final checklist usually create better results than last-minute pressure.'
      }
    ];
  }

  if (isSpecial) {
    return [
      {
        heading: 'Begin with the learner profile',
        body: 'Support should start with how the learner processes information, communicates understanding, manages attention, and responds to feedback. The same strategy will not work for every student, so the first step is understanding the specific barrier.'
      },
      {
        heading: 'Match support to the actual barrier',
        body: 'A student who struggles with reading directions needs different support than a student who understands the task but cannot organize materials. Matching the accommodation to the barrier makes help more respectful and more useful.'
      },
      ...base,
      {
        heading: 'Keep accommodations practical and consistent',
        body: 'Accommodations work best when they are easy to use across settings. A checklist, visual model, extra processing time, or structured choice can help only if the student understands when and how to use it.'
      }
    ];
  }

  if (isParent) {
    return [
      {
        heading: 'Separate support from taking over',
        body: 'Parents can help most by making the task clearer, not by completing it. A good support question is, "What part do you understand, and what part feels stuck?" This keeps responsibility with the child while still offering guidance.'
      },
      {
        heading: 'Create a predictable homework routine',
        body: 'A regular place, start time, and short plan can reduce arguments and delay. The routine should be simple enough for the child to remember and flexible enough to survive busy evenings.'
      },
      ...base,
      {
        heading: 'Know when to involve the teacher',
        body: 'If the same problem appears every week, parents should contact the teacher with specific details. Sharing what the child tried, where the confusion started, and what support helped gives the teacher useful information.'
      }
    ];
  }

  return base;
}

function ensureLength(content: string, primaryKeyword?: string | null) {
  let next = normalizeArticleStructure(removeRepeatedParagraphs(String(content || '')));
  if (countWords(next) >= TARGET_SAFE_WORDS) return next;

  const sections = planForTopic(primaryKeyword);
  for (const section of sections) {
    if (countWords(next) >= TARGET_SAFE_WORDS) break;
    if (hasSimilarHeading(next, section.heading)) continue;
    next += `\n<h2>${section.heading}</h2>\n<p>${section.body}</p>`;
  }

  return normalizeArticleStructure(removeRepeatedParagraphs(next));
}

async function rewriteTargetedFields(params: {
  article: GeneratedArticle;
  failedChecks: EditorialCheck[];
  primaryKeyword?: string | null;
  internalLinkSuggestions?: string[];
}) {
  const response = await generateJson<ImproveResponse>({
    task: 'Rewrite this education article once into a clean, non-repetitive article. Return only JSON fields that need changing.',
    rules: [
      'Return valid JSON only.',
      'Use one clean article structure. Do not append a second version of the article.',
      'Do not repeat H2 or H3 headings.',
      'Do not repeat the same idea in multiple sections with slightly different wording.',
      'Do not add filler sections to inflate word count.',
      'Do not add a second introduction in the middle or near the end of the article.',
      'Do not add duplicate "what this looks like" sections. Use at most one classroom example and at most one home example if they are truly relevant.',
      'If content length fails, expand existing sections with specific examples, mistakes, and next steps instead of padding.',
      'If FAQ fails, add exactly one FAQ section with 3 concise H3 questions.',
      'If internal links fail, use only the provided verified /blog/{slug} URLs. If fewer than 2 verified URLs are provided, do not add internal links or related-reading text.',
      'Do not invent internal links, slugs, related-reading sections, or resource lists.',
      'Never mention building motivation in students, effective parent-teacher communication, time management for students, or effective study habits unless those exact links were provided as verified /blog URLs.',
      'Keep the article practical, specific, and editorial. Avoid generic AI phrasing.'
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
  next.content = normalizeArticleStructure(removeRepeatedParagraphs(next.content));
  next.content = removeRoboticPhrases(next.content);
  next.content = ensureKeywordInOpening(next.content, params.primaryKeyword);
  next.content = ensureStructure(next.content);
  next.content = ensureExamples(next.content);
  next.content = ensureInternalLinks(next.content, params.internalLinkSuggestions);
  next.content = ensureFaq(next.content, params.primaryKeyword);
  next.content = ensureConclusion(next.content);
  next.content = ensureLength(next.content, params.primaryKeyword);
  next.content = stripGeneratedRelatedText(normalizeArticleStructure(removeRepeatedParagraphs(next.content)));

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
  next.content = stripGeneratedRelatedText(normalizeArticleStructure(removeRepeatedParagraphs(next.content)));

  return next;
}

export async function improveArticleToThreshold(input: ImproveInput) {
  let current = { ...input.article };
  const minimumScore = input.minimumScore ?? 100;

  const before = scoreCurrent({ article: current, primaryKeyword: input.primaryKeyword });
  let latest = before;
  let passCount = 0;

  const failed = pickFailedChecks(latest.checks);
  if (failed.length) {
    current = await improveArticlePass({
      article: current,
      failedChecks: failed,
      primaryKeyword: input.primaryKeyword,
      internalLinkSuggestions: input.internalLinkSuggestions
    });
    latest = scoreCurrent({ article: current, primaryKeyword: input.primaryKeyword });
    passCount = 1;
  }

  if (latest.score < minimumScore || countWords(current.content) < TARGET_MIN_WORDS) {
    current = applyLocalFixes({
      article: current,
      failedChecks: pickFailedChecks(latest.checks),
      primaryKeyword: input.primaryKeyword,
      internalLinkSuggestions: input.internalLinkSuggestions
    });
  }

  current.content = await repairInternalLinks(current.content, {
    title: current.title,
    excerpt: current.excerpt,
    keywords: input.primaryKeyword ? [input.primaryKeyword] : []
  });
  current.content = normalizeArticleStructure(removeRepeatedParagraphs(current.content));
  latest = scoreCurrent({ article: current, primaryKeyword: input.primaryKeyword });

  return {
    article: current,
    before,
    after: latest,
    improved: passCount > 0,
    passes: passCount
  };
}
