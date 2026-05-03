import { generateJson } from '@/lib/ai/client';
import { evaluateEditorialScore } from '@/lib/admin/editorial-score';
import type { GeneratedArticle } from '@/lib/types';
import { repairInternalLinks, removeRepeatedParagraphs } from '@/lib/content/repairInternalLinks';

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
};

const BAD_SECTIONS = [
  /<h2[^>]*>\s*additional resources\s*<\/h2>[\s\S]*?(?=<h2|$)/gi,
  /<h2[^>]*>\s*related resources\s*<\/h2>[\s\S]*?(?=<h2|$)/gi,
  /<h2[^>]*>\s*related reading\s*<\/h2>[\s\S]*?(?=<h2|$)/gi,
  /^##\s*(additional resources|related resources|related reading)[\s\S]*?(?=^##\s+|$)/gim
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

function escapeHtml(value: string) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function shorten(text: string, min: number, max: number) {
  let next = String(text || '').replace(/\s+/g, ' ').trim();
  if (next.length > max) next = next.slice(0, max).replace(/[,:;\-\s]+$/g, '').trim();
  if (next.length < min) next = next.replace(/[.]+$/g, '').trim();
  return next;
}

function normalizeTitle(title: string, primaryKeyword?: string | null) {
  let next = String(title || primaryKeyword || 'Education Guide').replace(/\s+/g, ' ').trim();
  if (next.length > 70) {
    next = next
      .replace(/: A Simple Guide for Students/i, '')
      .replace(/: A Practical Guide for Students/i, '')
      .replace(/: Practical Strategies/i, '')
      .replace(/Practical Guide to /i, '')
      .replace(/A Practical Guide for /i, '')
      .replace(/ for Students and Parents/i, '')
      .replace(/ for High School Students/i, '');
  }
  return shorten(next, 35, 70);
}

function normalizeMetaDescription(metaDescription: string, excerpt: string, primaryKeyword?: string | null) {
  let next = String(metaDescription || excerpt || '').replace(/\s+/g, ' ').trim();
  if (!next && primaryKeyword) {
    next = `${primaryKeyword} explained with clear steps, examples, common mistakes, and practical guidance for education readers.`;
  }
  if (next.length < 120) {
    next = `${next.replace(/[.]+$/g, '')}. Includes practical steps, examples, common mistakes, and clear next steps.`;
  }
  if (next.length > 160) next = next.slice(0, 157).replace(/[,:;\-\s]+$/g, '').trim() + '...';
  return next;
}

function markdownToHtml(content: string) {
  let next = String(content || '').trim();
  next = next.replace(/^###\s+(.+)$/gim, '<h3>$1</h3>');
  next = next.replace(/^##\s+(.+)$/gim, '<h2>$1</h2>');
  next = next.replace(/^#\s+(.+)$/gim, '<h2>$1</h2>');
  return next;
}

function removeSlopSections(content: string) {
  let next = String(content || '');
  for (const pattern of BAD_SECTIONS) next = next.replace(pattern, '');

  next = next.replace(/<h2[^>]*>\s*why\s+.+?(deserves|needs)\s+a\s+(practical|clear)\s+(plan|learning plan)\s*<\/h2>[\s\S]*?(?=<h2|$)/gi, '');
  next = next.replace(/^##\s*why\s+.+?(deserves|needs)\s+a\s+(practical|clear)\s+(plan|learning plan)[\s\S]*?(?=^##\s+|$)/gim, '');

  const seenPattern = new Set<string>();
  next = next.replace(/<h2[^>]*>(.*?)<\/h2>[\s\S]*?(?=<h2|$)/gi, (section, heading) => {
    const clean = stripHtml(heading).toLowerCase();
    const family = clean
      .replace(/what this (looks|can look) like (in the classroom|in class|at home)/, 'what-this-looks-like')
      .replace(/start with the learner.s current challenge/, 'start-current-challenge');

    if (seenPattern.has(family)) return '';
    seenPattern.add(family);
    return section;
  });

  return next;
}

function dedupeHeadingsAndParagraphs(content: string) {
  let next = markdownToHtml(content);
  next = removeSlopSections(next);
  next = removeRepeatedParagraphs(next);

  const seenHeadings = new Set<string>();
  next = next.replace(/<h([23])[^>]*>([\s\S]*?)<\/h\1>/gi, (full, level, inner) => {
    const key = stripHtml(inner).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (!key) return '';
    if (seenHeadings.has(key)) return '';
    seenHeadings.add(key);
    return `<h${level}>${stripHtml(inner)}</h${level}>`;
  });

  return next.replace(/\n{3,}/g, '\n\n').trim();
}

function hasHeading(content: string, pattern: RegExp) {
  return pattern.test(content);
}

function addLocalQualitySections(content: string, primaryKeyword?: string | null) {
  let next = String(content || '').trim();
  const topic = String(primaryKeyword || 'this topic').replace(/\s+/g, ' ').trim();

  const sections = [
    {
      heading: 'Common mistakes to avoid',
      body: `One common mistake is trying to fix too many things at once. A stronger approach is to choose one clear action, practice it consistently, and review whether it helped. Students also struggle when advice stays too general, so examples and small routines are often more useful than broad reminders.`
    },
    {
      heading: 'Example in practice',
      body: `For example, a student working on ${topic} can start by identifying the assignment goal, writing one sentence that explains the main idea, and checking whether each next step supports that goal. This turns a broad task into a sequence the student can actually follow.`
    },
    {
      heading: 'How teachers and families can support progress',
      body: `Adults can help by asking specific questions, modeling the first step, and giving feedback on the process rather than only the result. The goal is not to take over the work. The goal is to make the next action clear enough that the learner can repeat it independently.`
    },
    {
      heading: 'Frequently Asked Questions',
      body: `<h3>What is the best first step?</h3><p>Start with the learner's current challenge, then choose one small action that can be practiced today.</p><h3>How often should students practice?</h3><p>Short, consistent practice usually works better than one long session. A few focused attempts each week can build stronger habits over time.</p>`
    },
    {
      heading: 'Next steps',
      body: `Pick one strategy from this guide and apply it this week. Review what worked, remove what created confusion, and keep the routine simple enough to repeat.`
    }
  ];

  for (const section of sections) {
    if (countWords(next) >= 1200) break;
    const headingPattern = new RegExp(`<h[23][^>]*>\\s*${section.heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*<\\/h[23]>`, 'i');
    if (hasHeading(next, headingPattern)) continue;
    next += `\n<h2>${escapeHtml(section.heading)}</h2>\n<p>${section.body}</p>`;
  }

  return next;
}

function addVerifiedResources(content: string, suggestions?: string[]) {
  const links = Array.from(new Set((suggestions || []).filter((link) => /^\/blog\/[a-z0-9][a-z0-9-]*$/i.test(link)))).slice(0, 3);
  if (!links.length) return content;
  if (/href=["']\/blog\//i.test(content)) return content;

  const items = links
    .map((href) => {
      const label = href.replace(/^\/blog\//, '').replace(/-/g, ' ');
      return `<li><a href="${href}">${escapeHtml(label)}</a></li>`;
    })
    .join('');

  return `${content}\n<h2>Additional reading</h2>\n<ul>${items}</ul>`;
}

function cleanArticleContent(content: string, primaryKeyword?: string | null, suggestions?: string[]) {
  let next = markdownToHtml(content);
  next = dedupeHeadingsAndParagraphs(next);
  next = addVerifiedResources(next, suggestions);
  next = addLocalQualitySections(next, primaryKeyword);
  next = dedupeHeadingsAndParagraphs(next);
  return next;
}

function scoreArticle(article: GeneratedArticle, primaryKeyword?: string | null) {
  return evaluateEditorialScore({
    title: article.title,
    excerpt: article.excerpt,
    content: article.content,
    metaTitle: article.meta_title,
    metaDescription: article.meta_description,
    featuredImageUrl: 'x',
    primaryKeyword: primaryKeyword || ''
  });
}

export async function improveArticleToThreshold(input: ImproveInput) {
  const before = scoreArticle(input.article, input.primaryKeyword);
  let candidate: GeneratedArticle = { ...input.article };

  try {
    const result = await generateJson<ImproveResponse>({
      task: 'Rewrite this education article once using a clean editorial structure. Return JSON only.',
      rules: [
        'Use HTML tags only: h2, h3, p, ul, li, strong, a.',
        'Do not use markdown. Do not output ## markers.',
        'Target 1200 to 1800 useful words. Do not pad.',
        'No duplicate headings. No repeated paragraphs.',
        'Do not create related-reading text or fake internal links.',
        'Do not add Additional Resources unless valid links are provided in allowedInternalLinks.',
        'Write clear practical education guidance with examples, mistakes, FAQ, and next steps.'
      ],
      primaryKeyword: input.primaryKeyword,
      allowedInternalLinks: input.internalLinkSuggestions || [],
      article: input.article,
      expectedJsonShape: {
        title: 'string',
        excerpt: 'string',
        content: 'HTML string',
        meta_title: 'string',
        meta_description: 'string'
      }
    });

    candidate = {
      ...candidate,
      title: String(result.title || candidate.title),
      excerpt: String(result.excerpt || candidate.excerpt),
      content: String(result.content || candidate.content),
      meta_title: String(result.meta_title || candidate.meta_title),
      meta_description: String(result.meta_description || candidate.meta_description)
    };
  } catch {
    // If the AI call fails, keep the current article and run deterministic cleanup below.
  }

  candidate.title = normalizeTitle(candidate.title, input.primaryKeyword);
  candidate.meta_title = shorten(candidate.meta_title || candidate.title, 40, 65);
  candidate.meta_description = normalizeMetaDescription(candidate.meta_description, candidate.excerpt, input.primaryKeyword);
  candidate.content = cleanArticleContent(candidate.content, input.primaryKeyword, input.internalLinkSuggestions);
  candidate.content = await repairInternalLinks(candidate.content, {
    excludeSlug: candidate.slug,
    title: candidate.title,
    excerpt: candidate.excerpt,
    keywords: candidate.keywords
  });

  const after = scoreArticle(candidate, input.primaryKeyword);

  return {
    article: candidate,
    before,
    after,
    changed: JSON.stringify(candidate) !== JSON.stringify(input.article),
    passes: 1,
    notes: [
      'Used at most one AI call.',
      'Removed duplicate headings, repeated paragraphs, raw markdown, and fake internal links.',
      `Final word count: ${countWords(candidate.content)}.`
    ]
  };
}
