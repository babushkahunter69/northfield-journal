import type { GeneratedArticle } from '@/lib/types';

const BLOCKED_IMAGE_HOSTS = [
  'pexels.com',
  'images.pexels.com',
  'unsplash.com',
  'images.unsplash.com',
  'pixabay.com'
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

function sentenceCase(value: string) {
  const clean = String(value || '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function escapeRegExp(value: string) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function plainText(value: string) {
  return String(value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function trimTrailingPunctuation(value: string) {
  return String(value || '').replace(/[.!?:;]+$/g, '').trim();
}

function topicFromTitle(title: string, primaryKeyword?: string | null) {
  return sentenceCase(primaryKeyword || title || 'this topic').toLowerCase();
}

function limitAnchorWords(label: string, fallback = 'Related guide') {
  const words = plainText(label).split(/\s+/).filter(Boolean);
  if (words.length <= 8) return plainText(label) || fallback;
  return words.slice(0, 8).join(' ');
}

function extractAnchors(html: string) {
  const anchors: Array<{ href: string; label: string }> = [];
  for (const match of String(html || '').matchAll(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = String(match[1] || '').trim();
    const label = limitAnchorWords(match[2] || 'Related guide');
    if (!href || !label) continue;
    if (!href.startsWith('/blog/') && href !== '/blog' && href !== '/journal') continue;
    if (anchors.some((item) => item.href === href)) continue;
    anchors.push({ href, label });
  }
  return anchors.slice(0, 3);
}


function normalizeLooseText(value: string) {
  return plainText(value)
    .toLowerCase()
    .replace(/&amp;/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}


function wordTokensWithOffsets(value: string) {
  const tokens: Array<{ word: string; start: number; end: number }> = [];
  const source = String(value || '');
  const regex = /[a-z0-9]+/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(source)) !== null) {
    tokens.push({ word: match[0].toLowerCase(), start: match.index, end: match.index + match[0].length });
  }
  return tokens;
}

function matchedTitleLeadLength(text: string, title: string) {
  const titleWords = normalizeLooseText(title).split(' ').filter(Boolean);
  const textTokens = wordTokensWithOffsets(text);
  if (titleWords.length < 3 || textTokens.length < 4) return 0;

  let matched = 0;
  const max = Math.min(titleWords.length, textTokens.length, 24);
  while (matched < max && titleWords[matched] === textTokens[matched].word) {
    matched += 1;
  }

  const enoughTitle = matched >= Math.min(6, titleWords.length);
  const mostTitle = matched >= Math.ceil(titleWords.length * 0.7);
  if (!enoughTitle && !mostTitle) return 0;

  return textTokens[matched - 1]?.end || 0;
}

function startsWithTitleLead(text: string, title: string) {
  return matchedTitleLeadLength(text, title) > 0;
}

function rewriteTitleLeadText(text: string, title: string) {
  const source = String(text || '').replace(/\s+/g, ' ').trim();
  const cut = matchedTitleLeadLength(source, title);
  if (!cut) return source;

  const remainder = source.slice(cut).replace(/^[\s:;,.\-–—]+/, '').trim();
  if (!remainder) {
    return 'Students make better progress when the next step is clear, manageable, and easy to practice consistently.';
  }

  return titleLeadReplacement(remainder);
}

function titleLeadPattern(title: string) {
  const loose = normalizeLooseText(title);
  if (!loose || loose.length < 12) return null;
  const words = loose.split(' ').filter(Boolean).slice(0, 18);
  if (words.length < 3) return null;
  return new RegExp('^\\s*' + words.map(escapeRegExp).join('[^a-zA-Z0-9]+') + '(?:[^a-zA-Z0-9]+)?', 'i');
}

function titleLeadReplacement(remainder: string) {
  let clean = String(remainder || '')
    .replace(/\s+/g, ' ')
    .trim();

  const easierMatch = clean.match(/\b(?:becomes easier when|is easier when|works best when|helps when|starts when)\b\s*(.*)$/i);
  if (easierMatch) {
    clean = easierMatch[1] || '';
  } else {
    clean = clean
      .replace(/^(requires|means|involves)\b\s*/i, '')
      .replace(/^(becomes|is|can|will|works|helps|starts|matters)\b\s*/i, '')
      .replace(/^when\b\s*/i, '')
      .trim();
  }

  clean = clean
    .replace(/^the learner\b\s*/i, 'students ')
    .replace(/^a student\b\s*/i, 'students ')
    .replace(/^student\b\s*/i, 'students ')
    .trim();

  clean = clean.replace(/^students does\b/i, 'students do');

  if (clean) {
    const lowerClean = clean.charAt(0).toLowerCase() + clean.slice(1);
    if (/^students\b/i.test(clean)) {
      return `Students make better progress when they ${clean.replace(/^students\s+/i, '').trim()}`;
    }
    return `Students make better progress when ${lowerClean}`;
  }

  return 'Students make better progress when the next step is clear, manageable, and easy to practice consistently.';
}


function escapeHtml(value: string) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function firstSentence(value: string) {
  const clean = plainText(value).replace(/\s+/g, ' ').trim();
  const match = clean.match(/^(.{80,240}?[.!?])\s/);
  if (match?.[1]) return match[1].trim();
  return clean.slice(0, 220).replace(/\s+\S*$/, '').trim();
}

function hasHtmlHeading(content: string, heading: string) {
  const escaped = escapeRegExp(heading);
  return new RegExp(`<h[23][^>]*>\\s*${escaped}\\s*<\\/h[23]>`, 'i').test(String(content || ''));
}

function headingId(value: string) {
  return normalizeLooseText(value).replace(/\s+/g, '-').slice(0, 80) || 'section';
}

function ensureQuickAnswer(content: string, title: string, primaryKeyword?: string | null) {
  let next = String(content || '');
  if (hasHtmlHeading(next, 'Quick Answer')) return next;

  const topic = sentenceCase(primaryKeyword || title || 'this topic');
  const body = firstSentence(next) || `This guide explains ${topic.toLowerCase()} in a practical way for students, teachers, and families.`;
  return `<h2>Quick Answer</h2><p>${escapeHtml(body)}</p>\n${next}`.trim();
}

function ensureTableOfContents(content: string) {
  let next = String(content || '');
  if (hasHtmlHeading(next, 'Table of Contents')) return next;

  const headings = Array.from(next.matchAll(/<h2[^>]*>\s*([\s\S]*?)\s*<\/h2>/gi))
    .map((match) => plainText(match[1] || ''))
    .filter((heading) => heading && !/^(table of contents)$/i.test(heading))
    .slice(0, 8);

  if (headings.length < 3) return next;

  const used = new Set<string>();
  next = next.replace(/<h2([^>]*)>\s*([\s\S]*?)\s*<\/h2>/gi, (match, attrs, inner) => {
    const label = plainText(inner);
    if (!headings.includes(label)) return match;
    let id = headingId(label);
    let counter = 2;
    while (used.has(id)) id = `${headingId(label)}-${counter++}`;
    used.add(id);
    const cleanAttrs = String(attrs || '').replace(/\s+id=["'][^"']*["']/i, '');
    return `<h2${cleanAttrs} id="${id}">${inner}</h2>`;
  });

  const items = headings
    .map((heading) => `<li><a href="#${headingId(heading)}">${escapeHtml(heading)}</a></li>`)
    .join('');

  const toc = `<h2>Table of Contents</h2><ul>${items}</ul>`;
  const quickAnswerPattern = /(<h2[^>]*>\s*Quick Answer\s*<\/h2>[\s\S]*?)(?=<h2[^>]*>|$)/i;

  if (quickAnswerPattern.test(next)) {
    return next.replace(quickAnswerPattern, (section) => `${section}\n${toc}\n`).trim();
  }

  return `${toc}\n${next}`.trim();
}

function ensureClassroomApplication(content: string, title: string, primaryKeyword?: string | null) {
  let next = String(content || '');
  if (hasHtmlHeading(next, 'Classroom Application')) return next;
  const topic = topicFromTitle(title, primaryKeyword);
  const block = `<h2>Classroom Application</h2><p>Teachers can use this guide by turning ${escapeHtml(topic)} into a short lesson, a guided practice activity, or a reflection task. Students can apply the same idea through examples, checklists, peer feedback, and short practice cycles.</p>`;
  return next.replace(/<h2[^>]*>\s*Frequently Asked Questions\s*<\/h2>/i, `${block}\n<h2>Frequently Asked Questions</h2>`);
}

export function cleanSeoTitle(title: string, fallback = 'Practical Education Guide') {
  let clean = String(title || fallback)
    .replace(/\s+[|–—]\s+Northfield Journal\s*$/i, '')
    .replace(/\s+[|–—]\s+.*$/g, '')
    .replace(/\s+-\s+Northfield Journal\s*$/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (!clean) clean = fallback;
  return clean;
}

export function removeTitleLeadsFromParagraphs(content: string, title: string, primaryKeyword?: string | null) {
  const possibleTitles = Array.from(new Set([
    title,
    cleanSeoTitle(title),
    trimTrailingPunctuation(title),
    trimTrailingPunctuation(cleanSeoTitle(title))
  ].map((item) => plainText(item)).filter((item) => item.length >= 12)));

  if (!possibleTitles.length) return content;

  const fixText = (text: string) => {
    const source = String(text || '').replace(/\s+/g, ' ').trim();
    if (!source) return source;

    for (const possibleTitle of possibleTitles) {
      if (startsWithTitleLead(source, possibleTitle)) {
        return rewriteTitleLeadText(source, possibleTitle);
      }
    }

    return source;
  };

  let next = String(content || '').replace(/<p([^>]*)>\s*([\s\S]*?)<\/p>/gi, (match, attrs, inner) => {
    const original = plainText(inner);
    const fixed = fixText(original);
    return fixed === original ? match : `<p${attrs}>${fixed}</p>`;
  });

  // Clean raw text immediately after headings. This catches editor content that was saved as mixed HTML/text.
  next = next.replace(/(<h[23][^>]*>[\s\S]*?<\/h[23]>\s*)([^<\n][\s\S]*?)(?=<h[23][^>]*>|<p|<ul|$)/gi, (match, heading, rawText) => {
    const original = String(rawText || '').replace(/\s+/g, ' ').trim();
    const fixed = fixText(original);
    return fixed === original ? match : `${heading}<p>${fixed}</p>`;
  });

  return next;
}

export function normalizeGenericHeadings(content: string, title: string, primaryKeyword?: string | null) {
  const topic = topicFromTitle(title, primaryKeyword);
  const replacements: Array<[RegExp, string]> = [
    [/^build the skill step by step$/i, 'Helping Students Improve Gradually'],
    [/^build the\b/i, `Practical Ways to Improve ${topic}`],
    [/^master the\b/i, `How to Practice ${topic} More Effectively`],
    [/^unlock\b/i, `A Clearer Way to Approach ${topic}`],
    [/^discover\b/i, `What to Know About ${topic}`],
    [/^elevate\b/i, `How to Improve ${topic}`],
    [/^transform\b/i, `How to Make ${topic} More Manageable`]
  ];

  return String(content || '').replace(/<h([23])([^>]*)>\s*([\s\S]*?)\s*<\/h\1>/gi, (match, level, attrs, inner) => {
    const heading = plainText(inner);
    for (const [pattern, replacement] of replacements) {
      if (pattern.test(heading)) return `<h${level}${attrs}>${sentenceCase(replacement)}</h${level}>`;
    }
    return match;
  });
}

export function cleanRelatedGuidesSection(content: string) {
  return String(content || '').replace(
    /<h2[^>]*>\s*Related Guides\s*<\/h2>([\s\S]*?)(?=<h2[^>]*>|$)/gi,
    (_full, body) => {
      const anchors = extractAnchors(body);
      if (!anchors.length) return '';
      const items = anchors
        .map(({ href, label }) => `<li><a href="${href}">${label}</a></li>`)
        .join('');
      return `<h2>Related Guides</h2><p>Continue with these related Northfield Journal guides.</p><ul>${items}</ul>`;
    }
  );
}


function removeDuplicateEndingSections(content: string, title?: string) {
  const source = String(content || '');
  const sectionRegex = /<h2([^>]*)>\s*([\s\S]*?)\s*<\/h2>([\s\S]*?)(?=<h2[^>]*>|$)/gi;
  const matches = Array.from(source.matchAll(sectionRegex));
  if (matches.length < 2) return source;

  const prefix = source.slice(0, matches[0].index || 0);
  const sections = matches.map((match) => {
    const heading = plainText(match[2] || '');
    const bodyHtml = String(match[3] || '');
    const bodyText = plainText(bodyHtml);
    const normalizedHeading = normalizeLooseText(heading);
    const wordCount = bodyText.split(/\s+/).filter(Boolean).length;
    const hasTitleLead = title ? startsWithTitleLead(bodyText, title) || startsWithTitleLead(bodyText, cleanSeoTitle(title)) : false;
    const hasLinksOnly = /<ul/i.test(bodyHtml) && wordCount < 35;
    const score = wordCount - (hasTitleLead ? 120 : 0) - (hasLinksOnly ? 20 : 0);

    return {
      full: match[0],
      normalizedHeading,
      bodyLead: normalizeLooseText(bodyText).split(' ').slice(0, 32).join(' '),
      score,
      remove: false
    };
  });

  const keepByHeading = new Map<string, number>();

  sections.forEach((section, index) => {
    if (!section.normalizedHeading) return;
    const previousIndex = keepByHeading.get(section.normalizedHeading);
    if (previousIndex === undefined) {
      keepByHeading.set(section.normalizedHeading, index);
      return;
    }

    const previous = sections[previousIndex];
    if (section.score > previous.score) {
      previous.remove = true;
      keepByHeading.set(section.normalizedHeading, index);
    } else {
      section.remove = true;
    }
  });

  // Also remove near-identical bodies even when headings differ, keeping the better version.
  for (let i = 0; i < sections.length; i += 1) {
    if (sections[i].remove || !sections[i].bodyLead) continue;
    for (let j = i + 1; j < sections.length; j += 1) {
      if (sections[j].remove || !sections[j].bodyLead) continue;
      const a = sections[i].bodyLead;
      const b = sections[j].bodyLead;
      const duplicateBody = a === b || (a.length > 40 && b.length > 40 && (a.includes(b) || b.includes(a)));
      if (!duplicateBody) continue;

      if (sections[j].score > sections[i].score) {
        sections[i].remove = true;
      } else {
        sections[j].remove = true;
      }
    }
  }

  return prefix + sections.filter((section) => !section.remove).map((section) => section.full).join('');
}

export function countArticleWords(html: string) {
  const text = stripHtml(html);
  return text ? text.split(/\s+/).filter(Boolean).length : 0;
}

export function naturalMetaTitle(title: string, primaryKeyword?: string | null) {
  const clean = cleanSeoTitle(title, sentenceCase(primaryKeyword || '') || 'Practical Education Guide');
  if (clean.length >= 40 && clean.length <= 65) return clean;

  const topic = sentenceCase(primaryKeyword || clean) || 'Practical Learning Strategies';
  const candidates = [
    clean,
    `${topic} Guide for Students`,
    `${topic} Tips for Students and Families`,
    'Practical Learning Strategies for Students'
  ].map((item) => cleanSeoTitle(item));

  const fit = candidates.find((item) => item.length >= 40 && item.length <= 65);
  if (fit) return fit;

  return candidates.find((item) => item.length <= 65) || 'Practical Learning Strategies for Students';
}

export function naturalMetaDescription(value: string, title: string, primaryKeyword?: string | null) {
  const topic = sentenceCase(primaryKeyword || title || 'this education topic').toLowerCase();
  const clean = String(value || '').replace(/\s+/g, ' ').trim();
  if (clean.length >= 120 && clean.length <= 160) return clean;

  const generated = `Learn practical steps for ${topic}, with examples, common mistakes, FAQs, and clear next actions for students, parents, and teachers.`;
  if (generated.length <= 160) return generated;
  return generated.slice(0, 157).replace(/\s+\S*$/, '').trim() + '.';
}

export function removeFakeSourcesSection(content: string) {
  return String(content || '')
    .replace(/<h[23][^>]*>\s*(Sources|Additional Resources|References)\s*<\/h[23]>[\s\S]*?(?=<h2[^>]*>|$)/gi, '')
    .replace(/(^|\n)#{2,3}\s*(Sources|Additional Resources|References)[\s\S]*?(?=\n#{2,3}\s|$)/gi, '\n')
    .trim();
}

export function ensureSingleQuickSummary(content: string) {
  let next = String(content || '')
    .replace(/<h2[^>]*>\s*(Key Takeaways|Key Insights|Important Notes|What to Know)\s*<\/h2>/gi, '<h2>Quick Summary</h2>');

  let seen = false;
  next = next.replace(/<h2[^>]*>\s*Quick Summary\s*<\/h2>[\s\S]*?(?=<h2[^>]*>|$)/gi, (section) => {
    if (seen) return '';
    seen = true;
    return section;
  });

  if (!seen) {
    next = `<h2>Quick Summary</h2><p>This guide explains the main idea clearly, shows how to apply it in real learning situations, and gives students, parents, and teachers practical next steps.</p>\n${next}`;
  }

  return next.trim();
}

export function normalizeExistingArticleContent(params: {
  title: string;
  content: string;
  primaryKeyword?: string | null;
}) {
  const title = cleanSeoTitle(params.title);
  let content = String(params.content || '');
  content = removeFakeSourcesSection(content);
  content = ensureQuickAnswer(content, title, params.primaryKeyword);
  content = ensureSingleQuickSummary(content);
  content = ensureClassroomApplication(content, title, params.primaryKeyword);
  content = normalizeGenericHeadings(content, title, params.primaryKeyword);
  content = ensureTableOfContents(content);
  content = removeTitleLeadsFromParagraphs(content, title, params.primaryKeyword);
  content = removeDuplicateEndingSections(content, title);
  content = cleanRelatedGuidesSection(content);
  content = removeTitleLeadsFromParagraphs(content, title, params.primaryKeyword);
  return content.replace(/\n{3,}/g, '\n\n').trim();
}

export function normalizeArticleForSeo(article: GeneratedArticle, primaryKeyword?: string | null): GeneratedArticle {
  const title = cleanSeoTitle(article.title, sentenceCase(primaryKeyword || '') || 'Practical Education Guide');
  const content = normalizeExistingArticleContent({
    title,
    content: article.content || '',
    primaryKeyword
  });

  return {
    ...article,
    title,
    meta_title: naturalMetaTitle(article.meta_title || title, primaryKeyword),
    meta_description: naturalMetaDescription(article.meta_description || article.excerpt, title, primaryKeyword),
    content
  };
}

export function isAllowedImageUrl(url: string) {
  const value = String(url || '').trim();
  if (!value) return false;
  if (value.startsWith('/images/')) return true;

  try {
    const host = new URL(value).hostname.replace(/^www\./, '');
    return !BLOCKED_IMAGE_HOSTS.some((blocked) => host === blocked || host.endsWith(`.${blocked}`));
  } catch {
    return false;
  }
}

export function normalizeImageUrl(url: string | null | undefined, fallback = '/images/default-education.jpg') {
  const value = String(url || '').trim();
  return isAllowedImageUrl(value) ? value : fallback;
}
