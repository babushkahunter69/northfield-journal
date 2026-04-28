import { supabaseAdmin } from '@/lib/supabase-admin';
import type {
  ContentBriefRow,
  ContentKeyword,
  GeneratedArticle,
  GeneratedBrief
} from '@/lib/types';
import { generateBrief } from '@/lib/ai/generate-brief';
import { generateArticle } from '@/lib/ai/generate-article';
import { createCoverForPost } from '@/lib/cover/create-cover';
import { validateGeneratedArticle } from '@/lib/content/quality';
import { evaluateEditorialScore } from '@/lib/admin/editorial-score';
import { getAutoAuthor } from '@/lib/seo-authors';
import { estimateReadingTime } from '@/lib/utils';

type EducationKeyword = ContentKeyword & {
  audience?: string | null;
  grade_band?: string | null;
  subject_area?: string | null;
  content_type?: string | null;
  target_country?: string | null;
  curriculum?: string | null;
  learning_objective?: string | null;
  tone?: string | null;
  attempt_count?: number | null;
  last_attempted_at?: string | null;
  last_error?: string | null;
};

type EducationBrief = GeneratedBrief & {
  keyword?: string;
  audience?: string | null;
  grade_band?: string | null;
  subject_area?: string | null;
  content_type?: string | null;
  target_country?: string | null;
  curriculum?: string | null;
  learning_objective?: string | null;
  tone?: string | null;
};


const GENERIC_FILLER_REPLACEMENTS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\bin today[’']s fast-paced world\b/gi, replacement: 'today' },
  { pattern: /\bever-evolving landscape\b/gi, replacement: 'current environment' },
  { pattern: /\bgame-changer\b/gi, replacement: 'meaningful improvement' },
  { pattern: /\bdelve into\b/gi, replacement: 'look at' },
  { pattern: /\bunlock the power of\b/gi, replacement: 'use' },
  { pattern: /\bnow more than ever\b/gi, replacement: 'right now' },
  { pattern: /\bit is important to note that\b/gi, replacement: '' },
  { pattern: /\bseamlessly\b/gi, replacement: 'effectively' },
  { pattern: /\brobust solution\b/gi, replacement: 'practical approach' },
  { pattern: /\bnavigate the complexities\b/gi, replacement: 'work through the details' },
  { pattern: /\btake your learning to the next level\b/gi, replacement: 'build stronger learning habits' }
];

function cleanSpacing(value: string) {
  return value
    .replace(/\s+,/g, ',')
    .replace(/\s+\./g, '.')
    .replace(/\s{2,}/g, ' ')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .trim();
}

function rewriteGenericFillerText(value: string) {
  let next = String(value || '');

  for (const rule of GENERIC_FILLER_REPLACEMENTS) {
    next = next.replace(rule.pattern, rule.replacement);
  }

  next = next
    .replace(/,\s*,/g, ', ')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,!?;:])/g, '$1');

  return cleanSpacing(next);
}

function autoFixBannedPhrases(article: GeneratedArticle): GeneratedArticle {
  return {
    ...article,
    title: rewriteGenericFillerText(article.title),
    excerpt: rewriteGenericFillerText(article.excerpt),
    meta_title: rewriteGenericFillerText(article.meta_title),
    meta_description: rewriteGenericFillerText(article.meta_description),
    content: rewriteGenericFillerText(article.content)
  };
}

function ensureEducationFaq(article: GeneratedArticle): GeneratedArticle {
  const fallbackFaq = [
    {
      question: `What is the main idea of ${article.title}?`,
      answer:
        'The main idea is to give students, teachers, and families practical guidance they can apply in real learning situations.'
    },
    {
      question: 'Who is this guide for?',
      answer:
        'This guide is for students, educators, and families who want clear, practical education advice.'
    },
    {
      question: 'How should students use this advice?',
      answer:
        'Students should choose one or two strategies, apply them consistently, and review what improves their learning.'
    },
    {
      question: 'How can teachers or parents help?',
      answer:
        'Teachers and parents can help by giving structure, feedback, and encouragement while allowing students to build independence.'
    },
    {
      question: 'Why does this topic matter?',
      answer:
        'It matters because strong learning habits and clear academic strategies can improve confidence, focus, and long-term progress.'
    }
  ];

  const faq =
    Array.isArray(article.faq) && article.faq.length >= 5
      ? article.faq.slice(0, 5)
      : fallbackFaq;

  let content = article.content || '';

  content = content.replace(
    /<h2[^>]*>\s*(FAQ|Frequently Asked Questions)\s*<\/h2>[\s\S]*?(?=<h2|$)/i,
    ''
  );

  content += `
<h2>Frequently Asked Questions</h2>
${faq
  .map(
    (item) => `
<h3>${item.question}</h3>
<p>${item.answer}</p>`
  )
  .join('\n')}
`;

  return {
    ...article,
    content,
    faq
  };
}


function hasGenericFillerValidationErrors(errors: string[]) {
  return errors.some((error) => /generic filler phrase/i.test(error));
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/--+/g, '-');
}

function titleCaseFromSlug(slug: string) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

async function getUniqueSlug(baseSlug: string) {
  const cleanBase = slugify(baseSlug) || `post-${Date.now()}`;

  const { data, error } = await supabaseAdmin
    .from('posts')
    .select('slug')
    .ilike('slug', `${cleanBase}%`);

  if (error) {
    throw new Error(error.message || 'Failed to check existing slugs.');
  }

  const existing = new Set((data || []).map((row) => String(row.slug)));

  if (!existing.has(cleanBase)) {
    return cleanBase;
  }

  let counter = 2;
  while (existing.has(`${cleanBase}-${counter}`)) {
    counter += 1;
  }

  return `${cleanBase}-${counter}`;
}

async function logGenerationRun(payload: {
  keyword_id?: string | null;
  brief_id?: string | null;
  post_id?: string | null;
  run_type: string;
  status: 'success' | 'failed';
  input_snapshot?: unknown;
  output_snapshot?: unknown;
  error_message?: string | null;
}) {
  await supabaseAdmin.from('content_generation_runs').insert({
    keyword_id: payload.keyword_id ?? null,
    brief_id: payload.brief_id ?? null,
    post_id: payload.post_id ?? null,
    run_type: payload.run_type,
    status: payload.status,
    model_name: process.env.AI_MODEL || 'gpt-4.1-mini',
    input_snapshot: payload.input_snapshot ?? null,
    output_snapshot: payload.output_snapshot ?? null,
    error_message: payload.error_message ?? null
  });
}

async function fetchKeywordById(keywordId: string): Promise<EducationKeyword> {
  const response = await supabaseAdmin
    .from('content_keywords')
    .select('*')
    .eq('id', keywordId)
    .single();

  if (response.error || !response.data) {
    throw new Error(response.error?.message || 'Keyword not found.');
  }

  return response.data as EducationKeyword;
}

async function upsertBrief(
  keyword: EducationKeyword,
  brief: EducationBrief
): Promise<ContentBriefRow> {
  const response = await supabaseAdmin
    .from('content_briefs')
    .insert({
      keyword_id: keyword.id,
      working_title: brief.working_title,
      slug: brief.slug,
      angle: brief.angle,
      outline_json: brief.outline,
      seo_title: brief.seo_title,
      seo_description: brief.seo_description,
      target_word_count: brief.target_word_count,
      internal_links_json: brief.internal_link_suggestions,
      external_sources_json: [],
      status: 'draft'
    })
    .select('*')
    .single();

  if (response.error || !response.data) {
    throw new Error(response.error?.message || 'Failed to save content brief.');
  }

  return response.data as ContentBriefRow;
}

async function ensureCategoryId(categorySlug: string | null | undefined) {
  const normalizedSlug = slugify(String(categorySlug || ''));

  const safeSlug = normalizedSlug || 'student-success';
  const safeName = titleCaseFromSlug(safeSlug);

  const existingResponse = await supabaseAdmin
    .from('categories')
    .select('id, slug, name')
    .eq('slug', safeSlug)
    .maybeSingle();

  if (existingResponse.error) {
    throw new Error(existingResponse.error.message || 'Failed to look up category.');
  }

  if (existingResponse.data?.id) {
    return existingResponse.data.id;
  }

  const insertPayload: Record<string, unknown> = {
    name: safeName,
    slug: safeSlug
  };

  const createResponse = await supabaseAdmin
    .from('categories')
    .insert(insertPayload)
    .select('id')
    .single();

  if (createResponse.error || !createResponse.data?.id) {
    throw new Error(createResponse.error?.message || 'Failed to create category.');
  }

  return createResponse.data.id;
}

function countArticleWords(html: string) {
  const text = String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return text ? text.split(' ').filter(Boolean).length : 0;
}

function hasCompleteFaq(article: GeneratedArticle) {
  return Array.isArray(article.faq) && article.faq.length >= 5;
}

function hasSourcesSection(article: GeneratedArticle) {
  return /<h2[^>]*>\s*Sources\s*<\/h2>/i.test(article.content || '') && /<a\s+/i.test(article.content || '');
}

function shouldAutoPublishArticle(
  article: GeneratedArticle,
  validation: { ok: boolean },
  coverUrl: string | null,
  authorName: string
) {
  if (!coverUrl) return false;
  if (!authorName || /editorial|northfield journal|admin/i.test(authorName)) return false;
  if (validation.ok !== true) return false;
  if (countArticleWords(article.content) < 1000) return false;
  if (!hasCompleteFaq(article)) return false;
  if (!hasSourcesSection(article)) return false;

  const score = evaluateEditorialScore({
    title: article.title,
    excerpt: article.excerpt,
    content: article.content,
    metaTitle: article.meta_title,
    metaDescription: article.meta_description,
    featuredImageUrl: coverUrl,
    primaryKeyword: Array.isArray(article.keywords) && article.keywords.length > 0 ? article.keywords[0] : null
  });

  return score.score >= 80;
}

function getGeneratedAuthor(brief: EducationBrief, article: GeneratedArticle) {
  return getAutoAuthor(
    'northfield',
    [
      brief.category_slug,
      brief.working_title,
      brief.keyword,
      article.title,
      article.keywords?.join(' ')
    ]
      .filter(Boolean)
      .join(' ')
  );
}


async function persistPost(
  keyword: EducationKeyword,
  brief: EducationBrief,
  article: GeneratedArticle,
  coverUrl: string | null,
  autoPublish = false,
  author = getGeneratedAuthor(brief, article)
) {
  const uniqueSlug = await getUniqueSlug(article.slug || brief.slug || brief.working_title);
  const categoryId = await ensureCategoryId(brief.category_slug);

  const response = await supabaseAdmin
    .from('posts')
    .insert({
      title: article.title,
      slug: uniqueSlug,
      excerpt: article.excerpt,
      content: article.content,
      reading_time_minutes: estimateReadingTime(article.content),
      featured_image_url: coverUrl,
      og_image_url: coverUrl,
      category_id: categoryId,
      author_name: author.name,
      author_bio: author.bio,
      meta_title: article.meta_title,
      meta_description: article.meta_description,
      keywords: article.keywords || [],
      status: autoPublish ? 'published' : 'draft',
      source_type: 'automation',
      generation_status: autoPublish ? 'auto_published' : 'ai_draft',
      faq_json: article.faq || null
    })
    .select('*')
    .single();

  if (response.error || !response.data) {
    throw new Error(response.error?.message || 'Failed to persist post.');
  }

  return response.data;
}

async function markKeywordAttempt(keyword: EducationKeyword) {
  await supabaseAdmin
    .from('content_keywords')
    .update({
      status: 'in_progress',
      attempt_count: (keyword.attempt_count ?? 0) + 1,
      last_attempted_at: new Date().toISOString(),
      last_error: null
    })
    .eq('id', keyword.id);
}

export async function generateDraftFromKeyword(keyword: EducationKeyword) {
  let savedBrief: ContentBriefRow | null = null;

  try {
    await markKeywordAttempt(keyword);

    const generatedBrief = await generateBrief(keyword);
    const uniqueBriefSlug = await getUniqueSlug(
      generatedBrief.slug || generatedBrief.working_title || keyword.keyword
    );

    const briefWithUniqueSlug: EducationBrief = {
      ...generatedBrief,
      slug: uniqueBriefSlug,
      keyword: keyword.keyword,
      audience: keyword.audience ?? null,
      grade_band: keyword.grade_band ?? null,
      subject_area: keyword.subject_area ?? null,
      content_type: keyword.content_type ?? null,
      target_country: keyword.target_country ?? null,
      curriculum: keyword.curriculum ?? null,
      learning_objective: keyword.learning_objective ?? null,
      tone: keyword.tone ?? null
    };

    savedBrief = await upsertBrief(keyword, briefWithUniqueSlug);

    await logGenerationRun({
      keyword_id: keyword.id,
      brief_id: savedBrief.id,
      run_type: 'brief',
      status: 'success',
      input_snapshot: keyword,
      output_snapshot: briefWithUniqueSlug
    });

    let article = ensureEducationFaq(await generateArticle(briefWithUniqueSlug));

    let validation = validateGeneratedArticle(article, briefWithUniqueSlug);

    if (!validation.ok && hasGenericFillerValidationErrors(validation.errors)) {
      const cleanedArticle = ensureEducationFaq(autoFixBannedPhrases(article));
      const cleanedValidation = validateGeneratedArticle(cleanedArticle, briefWithUniqueSlug);

      await logGenerationRun({
        keyword_id: keyword.id,
        brief_id: savedBrief.id,
        run_type: 'auto_fix_filler',
        status: cleanedValidation.ok ? 'success' : 'failed',
        input_snapshot: { article, validation },
        output_snapshot: { article: cleanedArticle, validation: cleanedValidation },
        error_message: cleanedValidation.ok ? null : `Auto-fix still failing: ${cleanedValidation.errors.join(' | ')}`
      });

      article = cleanedArticle;
      validation = cleanedValidation;
    }

    if (!validation.ok) {
      const retriedArticle = await generateArticle(briefWithUniqueSlug);
      const cleanedRetriedArticle = ensureEducationFaq(autoFixBannedPhrases(retriedArticle));
      const retriedValidation = validateGeneratedArticle(cleanedRetriedArticle, briefWithUniqueSlug);

      await logGenerationRun({
        keyword_id: keyword.id,
        brief_id: savedBrief.id,
        run_type: 'draft_retry',
        status: retriedValidation.ok ? 'success' : 'failed',
        input_snapshot: briefWithUniqueSlug,
        output_snapshot: { article: cleanedRetriedArticle, validation: retriedValidation },
        error_message: retriedValidation.ok ? null : `Retry validation failed: ${retriedValidation.errors.join(' | ')}`
      });

      article = cleanedRetriedArticle;
      validation = retriedValidation;
    }

    if (!validation.ok) {
      await logGenerationRun({
        keyword_id: keyword.id,
        brief_id: savedBrief.id,
        run_type: 'validation',
        status: 'failed',
        input_snapshot: briefWithUniqueSlug,
        output_snapshot: {
          article,
          validation
        },
        error_message: `Validation failed: ${validation.errors.join(' | ')}`
      });

      throw new Error(`Draft validation failed: ${validation.errors.join(' | ')}`);
    }

    await logGenerationRun({
      keyword_id: keyword.id,
      brief_id: savedBrief.id,
      run_type: 'validation',
      status: 'success',
      input_snapshot: briefWithUniqueSlug,
      output_snapshot: validation
    });

    await logGenerationRun({
      keyword_id: keyword.id,
      brief_id: savedBrief.id,
      run_type: 'draft',
      status: 'success',
      input_snapshot: briefWithUniqueSlug,
      output_snapshot: article
    });

    let coverUrl: string | null = null;

    try {
      coverUrl = await createCoverForPost({
        title: article.title,
        categorySlug: briefWithUniqueSlug.category_slug,
        slug: briefWithUniqueSlug.slug
      });

      await logGenerationRun({
        keyword_id: keyword.id,
        brief_id: savedBrief.id,
        run_type: 'cover',
        status: 'success',
        input_snapshot: {
          title: article.title,
          category: briefWithUniqueSlug.category_slug,
          slug: briefWithUniqueSlug.slug
        },
        output_snapshot: { cover_url: coverUrl }
      });
    } catch (error) {
      await logGenerationRun({
        keyword_id: keyword.id,
        brief_id: savedBrief.id,
        run_type: 'cover',
        status: 'failed',
        input_snapshot: {
          title: article.title,
          category: briefWithUniqueSlug.category_slug,
          slug: briefWithUniqueSlug.slug
        },
        error_message: error instanceof Error ? error.message : 'Cover generation failed.'
      });
    }

    const author = getGeneratedAuthor(briefWithUniqueSlug, article);
    const autoPublish = shouldAutoPublishArticle(article, validation, coverUrl, author.name);
    const post = await persistPost(keyword, briefWithUniqueSlug, article, coverUrl, autoPublish, author);

    await supabaseAdmin
      .from('content_keywords')
      .update({
        status: 'done',
        last_generated_at: new Date().toISOString(),
        last_error: null
      })
      .eq('id', keyword.id);

    await logGenerationRun({
      keyword_id: keyword.id,
      brief_id: savedBrief.id,
      post_id: post.id,
      run_type: 'persist',
      status: 'success',
      input_snapshot: {
        category_slug: briefWithUniqueSlug.category_slug,
        post_slug: post.slug
      },
      output_snapshot: {
        post_id: post.id,
        category_id: post.category_id ?? null,
        auto_published: autoPublish
      }
    });

    return post;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Draft generation failed.';

    await supabaseAdmin
      .from('content_keywords')
      .update({
        status: 'queued',
        last_error: message
      })
      .eq('id', keyword.id);

    await logGenerationRun({
      keyword_id: keyword.id,
      brief_id: savedBrief?.id ?? null,
      run_type: 'draft',
      status: 'failed',
      input_snapshot: keyword,
      error_message: message
    });

    throw error;
  }
}

export async function generateDraftFromKeywordId(keywordId: string) {
  const keyword = await fetchKeywordById(keywordId);
  return generateDraftFromKeyword(keyword);
}