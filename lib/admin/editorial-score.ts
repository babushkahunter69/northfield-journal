export type EditorialCheck = {
  key: string;
  label: string;
  passed: boolean;
  hint?: string;
  detail?: string;
  weight: number;
};

export type EditorialScoreResult = {
  score: number;
  checks: EditorialCheck[];
  stats: {
    wordCount: number;
    internalLinks: number;
    headings: number;
    faqHeadings: number;
    titleLength: number;
    metaTitleLength: number;
    metaDescriptionLength: number;
    duplicateHeadings: number;
    repeatedParagraphs: number;
    rawMarkdownMarkers: number;
  };
};

type Input = {
  title: string;
  excerpt: string;
  content: string;
  metaTitle: string;
  metaDescription: string;
  featuredImageUrl?: string | null;
  primaryKeyword?: string | null;
};

const ROBOTIC_PATTERNS = [
  /in today's fast-paced world/i,
  /in today.s fast-paced world/i,
  /it is important to note/i,
  /in conclusion/i,
  /ever-evolving landscape/i,
  /delve into/i,
  /unlock the power of/i,
  /game-changer/i,
  /now more than ever/i,
  /seamlessly/i,
  /robust solution/i,
  /navigate the complexities/i,
  /take your learning to the next level/i
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

function countInternalLinks(html: string) {
  const matches = String(html || '').match(/href=["']\/(?!\/)[^"']+["']/gi);
  return matches ? matches.length : 0;
}

function countHeadings(html: string) {
  const htmlHeadings = String(html || '').match(/<h[23][^>]*>.*?<\/h[23]>/gi) || [];
  const markdownHeadings = String(html || '').match(/^#{2,3}\s+.+$/gim) || [];
  return htmlHeadings.length + markdownHeadings.length;
}

function getHeadingTexts(html: string) {
  const headings: string[] = [];
  for (const match of String(html || '').matchAll(/<h[23][^>]*>(.*?)<\/h[23]>/gi)) {
    headings.push(stripHtml(match[1]).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim());
  }
  for (const match of String(html || '').matchAll(/^#{2,3}\s+(.+)$/gim)) {
    headings.push(stripHtml(match[1]).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim());
  }
  return headings.filter(Boolean);
}

function countDuplicateHeadings(html: string) {
  const seen = new Set<string>();
  let duplicates = 0;
  for (const heading of getHeadingTexts(html)) {
    if (seen.has(heading)) duplicates += 1;
    seen.add(heading);
  }
  return duplicates;
}

function countRepeatedParagraphs(html: string) {
  const blocks = String(html || '')
    .replace(/<\/p>/gi, '</p>\n\n')
    .split(/\n{2,}|<p[^>]*>/gi)
    .map((block) => stripHtml(block).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim())
    .filter((block) => block.length > 90);

  const seen = new Set<string>();
  let repeated = 0;
  for (const block of blocks) {
    const key = block.slice(0, 220);
    if (seen.has(key)) repeated += 1;
    seen.add(key);
  }
  return repeated;
}

function countFaqHeadings(html: string) {
  const hasFaq = /<h[23][^>]*>\s*(frequently asked questions|faq|faqs)\s*<\/h[23]>|^#{2,3}\s*(frequently asked questions|faq|faqs)\s*$/im.test(html);
  if (!hasFaq) return 0;
  const htmlQuestions = String(html || '').match(/<h3[^>]*>.*?<\/h3>/gi) || [];
  const markdownQuestions = String(html || '').match(/^###\s+.+$/gim) || [];
  return htmlQuestions.length + markdownQuestions.length;
}

function firstTextSlice(html: string, words = 140) {
  return stripHtml(html).split(/\s+/).slice(0, words).join(' ').toLowerCase();
}

function hasExamples(text: string) {
  return /(for example|for instance|example:|scenario|consider this|imagine a student|suppose a student)/i.test(text);
}

function hasConclusion(html: string) {
  return /<h[23][^>]*>\s*(conclusion|final thoughts|next steps|what to do next|closing thoughts|what you should do next)\s*<\/h[23]>|^#{2,3}\s*(conclusion|final thoughts|next steps|what to do next|closing thoughts|what you should do next)\s*$/im.test(html);
}

function keywordAppearsNaturally(title: string, excerpt: string, html: string, primaryKeyword?: string | null) {
  const keyword = String(primaryKeyword || '').trim().toLowerCase();
  if (!keyword) return { passed: true, detail: 'No primary keyword provided.' };
  const titleLower = title.toLowerCase();
  const intro = `${excerpt} ${firstTextSlice(html, 100)}`.toLowerCase();
  const keywordWords = keyword.split(/[^a-z0-9]+/).filter((word) => word.length > 2);
  const hitInTitle = keywordWords.some((word) => titleLower.includes(word));
  const hitInIntro = keywordWords.some((word) => intro.includes(word));
  return {
    passed: hitInTitle && hitInIntro,
    detail: hitInTitle && hitInIntro ? 'Keyword appears in the title and opening.' : 'Place the target keyword in the title and first paragraph.'
  };
}

export function evaluateEditorialScore(input: Input): EditorialScoreResult {
  const title = String(input.title || '').trim();
  const excerpt = String(input.excerpt || '').trim();
  const content = String(input.content || '');
  const metaTitle = String(input.metaTitle || '').trim();
  const metaDescription = String(input.metaDescription || '').trim();
  const text = stripHtml(content);

  const stats = {
    wordCount: countWords(content),
    internalLinks: countInternalLinks(content),
    headings: countHeadings(content),
    faqHeadings: countFaqHeadings(content),
    titleLength: title.length,
    metaTitleLength: metaTitle.length,
    metaDescriptionLength: metaDescription.length,
    duplicateHeadings: countDuplicateHeadings(content),
    repeatedParagraphs: countRepeatedParagraphs(content),
    rawMarkdownMarkers: (content.match(/^#{1,6}\s+/gim) || []).length
  };

  const keywordCheck = keywordAppearsNaturally(title, excerpt, content, input.primaryKeyword);
  const roboticHits = ROBOTIC_PATTERNS.filter((pattern) => pattern.test(text));

  const checks: EditorialCheck[] = [
    { key: 'title_exists', label: 'Title exists', passed: Boolean(title), weight: 8 },
    {
      key: 'title_length', label: 'Title length looks healthy', passed: stats.titleLength >= 35 && stats.titleLength <= 70,
      hint: 'Aim for 35-70 characters.', detail: `${stats.titleLength} characters`, weight: 8
    },
    { key: 'excerpt_exists', label: 'Excerpt exists', passed: Boolean(excerpt), weight: 6 },
    {
      key: 'meta_title_length', label: 'Meta title length looks healthy', passed: stats.metaTitleLength >= 40 && stats.metaTitleLength <= 65,
      hint: 'Aim for 40-65 characters.', detail: `${stats.metaTitleLength} characters`, weight: 6
    },
    {
      key: 'meta_description_length', label: 'Meta description length looks healthy', passed: stats.metaDescriptionLength >= 120 && stats.metaDescriptionLength <= 160,
      hint: 'Aim for 120-160 characters.', detail: `${stats.metaDescriptionLength} characters`, weight: 6
    },
    {
      key: 'content_substantial', label: 'Content is substantial', passed: stats.wordCount >= 1200,
      hint: 'Aim for 1,200-1,800 useful words. Do not pad with repeated sections.', detail: `${stats.wordCount} words`, weight: 12
    },
    {
      key: 'no_duplicate_headings', label: 'No duplicate headings', passed: stats.duplicateHeadings === 0,
      hint: 'Remove repeated section headings.', detail: `${stats.duplicateHeadings} duplicates`, weight: 8
    },
    {
      key: 'no_repeated_paragraphs', label: 'No repeated paragraphs', passed: stats.repeatedParagraphs === 0,
      hint: 'Remove duplicated or lightly reworded filler paragraphs.', detail: `${stats.repeatedParagraphs} repeats`, weight: 8
    },
    {
      key: 'clean_formatting', label: 'Clean rendered formatting', passed: stats.rawMarkdownMarkers === 0,
      hint: 'Remove raw markdown markers from saved article HTML.', detail: `${stats.rawMarkdownMarkers} markdown heading markers`, weight: 6
    },
    {
      key: 'internal_links', label: 'Has internal links', passed: stats.internalLinks >= 1,
      hint: 'Add 1-3 real internal links to published articles only.', detail: `${stats.internalLinks} internal links`, weight: 6
    },
    {
      key: 'faq', label: 'Has FAQ section', passed: stats.faqHeadings >= 2,
      hint: 'Add a short FAQ section with at least 2 items.', detail: `${stats.faqHeadings} FAQ items`, weight: 7
    },
    { key: 'featured_image', label: 'Has featured image', passed: Boolean(input.featuredImageUrl), weight: 6 },
    {
      key: 'keyword', label: 'Keyword appears naturally', passed: keywordCheck.passed,
      hint: 'Include the keyword in the title and first paragraph.', detail: keywordCheck.detail, weight: 8
    },
    {
      key: 'structure', label: 'Has clear section structure', passed: stats.headings >= 4,
      hint: 'Use at least 4 H2/H3 sections.', detail: `${stats.headings} section headings`, weight: 7
    },
    {
      key: 'examples', label: 'Uses examples or scenarios', passed: hasExamples(text),
      hint: 'Add one concrete example or scenario.', weight: 4
    },
    {
      key: 'conclusion', label: 'Ends with conclusion or next steps', passed: hasConclusion(content),
      hint: 'Close with a practical conclusion or next steps section.', weight: 4
    },
    {
      key: 'robotic', label: 'Avoids robotic filler phrasing', passed: roboticHits.length === 0,
      hint: 'Trim template-like transitions and generic filler language.', detail: roboticHits.slice(0, 2).map((pattern) => pattern.source).join(', '), weight: 8
    }
  ];

  const totalWeight = checks.reduce((sum, check) => sum + check.weight, 0);
  const passedWeight = checks.reduce((sum, check) => sum + (check.passed ? check.weight : 0), 0);
  const score = Math.round((passedWeight / totalWeight) * 100);

  return { score, checks, stats };
}
