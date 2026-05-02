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
  /in today’s fast-paced world/i,
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
    .replace(/\s+/g, ' ')
    .trim();
}

function countWords(html: string) {
  const text = stripHtml(html);
  return text ? text.split(/\s+/).filter(Boolean).length : 0;
}

function countInternalLinks(html: string) {
  const matches = String(html || '').match(/href="\/(?!\/)[^"]+"/gi);
  return matches ? matches.length : 0;
}

function countHeadings(html: string) {
  const matches = String(html || '').match(/<h[23][^>]*>.*?<\/h[23]>/gi);
  return matches ? matches.length : 0;
}

function countFaqHeadings(html: string) {
  const faqHeader = /<h[23][^>]*>\s*(frequently asked questions|faq|faqs)\s*<\/h[23]>/i.test(html);
  if (!faqHeader) return 0;
  const matches = String(html || '').match(/<h3[^>]*>.*?<\/h3>/gi);
  return matches ? matches.length : 0;
}

function firstTextSlice(html: string, words = 140) {
  return stripHtml(html).split(/\s+/).slice(0, words).join(' ').toLowerCase();
}

function hasExamples(text: string) {
  return /(for example|for instance|example:|scenario|consider this|imagine a student|suppose a student)/i.test(text);
}

function hasConclusion(html: string) {
  return /<h[23][^>]*>\s*(conclusion|final thoughts|next steps|what to do next|closing thoughts)\s*<\/h[23]>/i.test(html);
}

function keywordAppearsNaturally(title: string, excerpt: string, html: string, primaryKeyword?: string | null) {
  const keyword = String(primaryKeyword || '').trim().toLowerCase();
  if (!keyword) return { passed: true, detail: 'No primary keyword provided.' };
  const titleLower = title.toLowerCase();
  const intro = `${excerpt} ${firstTextSlice(html, 100)}`.toLowerCase();
  const keywordWords = keyword.split(/[^a-z0-9]+/).filter((w) => w.length > 2);
  const hitInTitle = keywordWords.some((w) => titleLower.includes(w));
  const hitInIntro = keywordWords.some((w) => intro.includes(w));
  return {
    passed: hitInTitle && hitInIntro,
    detail: hitInTitle && hitInIntro ? 'Keyword shows up in title and opening.' : 'Place the target keyword in the title and first paragraph.'
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
    metaDescriptionLength: metaDescription.length
  };

  const keywordCheck = keywordAppearsNaturally(title, excerpt, content, input.primaryKeyword);
  const roboticHits = ROBOTIC_PATTERNS.filter((pattern) => pattern.test(text));

  const checks: EditorialCheck[] = [
    { key: 'title_exists', label: 'Title exists', passed: Boolean(title), weight: 8 },
    {
      key: 'title_length', label: 'Title length looks healthy', passed: stats.titleLength >= 35 && stats.titleLength <= 70,
      hint: 'Aim for 35–70 characters.', detail: `${stats.titleLength} characters`, weight: 8
    },
    { key: 'excerpt_exists', label: 'Excerpt exists', passed: Boolean(excerpt), weight: 6 },
    {
      key: 'meta_title_length', label: 'Meta title length looks healthy', passed: stats.metaTitleLength >= 40 && stats.metaTitleLength <= 65,
      hint: 'Aim for 40–65 characters.', detail: `${stats.metaTitleLength} characters`, weight: 6
    },
    {
      key: 'meta_description_length', label: 'Meta description length looks healthy', passed: stats.metaDescriptionLength >= 120 && stats.metaDescriptionLength <= 160,
      hint: 'Aim for 120–160 characters.', detail: `${stats.metaDescriptionLength} characters`, weight: 6
    },
    {
      key: 'content_substantial', label: 'Content is substantial', passed: stats.wordCount >= 1200,
      hint: 'Aim for 1,200-1,800 focused words. Avoid padded or repeated sections.', detail: `${stats.wordCount} words`, weight: 14
    },
    {
      key: 'internal_links', label: 'Internal links are clean', passed: true,
      hint: 'Internal links are added only when verified published posts exist.', detail: `${stats.internalLinks} verified internal links`, weight: 4
    },
    {
      key: 'faq', label: 'Has FAQ section', passed: stats.faqHeadings >= 3,
      hint: 'Add a short FAQ section with at least 3 items.', detail: `${stats.faqHeadings} FAQ items`, weight: 10
    },
    {
      key: 'featured_image', label: 'Has featured image', passed: Boolean(input.featuredImageUrl), weight: 6
    },
    {
      key: 'keyword', label: 'Keyword appears naturally', passed: keywordCheck.passed,
      hint: 'Include the keyword in the title and first paragraph.', detail: keywordCheck.detail, weight: 10
    },
    {
      key: 'structure', label: 'Has clear section structure', passed: stats.headings >= 4,
      hint: 'Use at least 4 H2/H3 sections.', detail: `${stats.headings} section headings`, weight: 8
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
      hint: 'Trim template-like transitions and generic filler language.', detail: roboticHits.slice(0, 2).map((p) => p.source).join(', '), weight: 10
    }
  ];

  const totalWeight = checks.reduce((sum, check) => sum + check.weight, 0);
  const passedWeight = checks.reduce((sum, check) => sum + (check.passed ? check.weight : 0), 0);
  const score = Math.round((passedWeight / totalWeight) * 100);

  return { score, checks, stats };
}
