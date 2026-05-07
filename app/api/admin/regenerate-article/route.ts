import { NextResponse } from 'next/server';
import { isCookieAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { generateArticle } from '@/lib/ai/generate-article';
import { improveArticleToThreshold } from '@/lib/ai/improve-article';
import { evaluateEditorialScore } from '@/lib/admin/editorial-score';
import type { ContentBriefRow, GeneratedBrief } from '@/lib/types';
import { estimateReadingTime } from '@/lib/utils';

function countWords(html: string) {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function toGeneratedBrief(
  brief: Partial<ContentBriefRow>,
  fallbackCategorySlug: string,
  fallbackPost?: any
): GeneratedBrief {
  return {
    working_title:
      brief.working_title ||
      fallbackPost?.title ||
      'Practical Education Guide',

    slug:
      brief.slug ||
      fallbackPost?.slug ||
      'education-guide',

    angle: brief.angle || '',

    seo_title:
      brief.seo_title ||
      fallbackPost?.title ||
      brief.working_title ||
      'Education Guide',

    seo_description:
      brief.seo_description ||
      fallbackPost?.excerpt ||
      '',

    target_word_count: 2400,

    secondary_keywords: [],

    outline: Array.isArray(brief.outline_json)
      ? brief.outline_json
      : [],

    faq: [],

    internal_link_suggestions: Array.isArray(brief.internal_links_json)
      ? brief.internal_links_json
      : [],

    category_slug: fallbackCategorySlug || 'student-success'
  };
}

export async function POST(request: Request) {
  const allowed = await isCookieAdmin();

  if (!allowed) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json().catch(() => null);

    const postId = String(body?.post_id || '').trim();

    if (!postId) {
      return NextResponse.json(
        { error: 'post_id is required.' },
        { status: 400 }
      );
    }

    const postResponse = await supabaseAdmin
      .from('posts')
      .select('*, categories(slug)')
      .eq('id', postId)
      .single();

    if (postResponse.error || !postResponse.data) {
      return NextResponse.json(
        { error: 'Post not found.' },
        { status: 404 }
      );
    }

    const post = postResponse.data as any;

    if (post.status !== 'draft') {
      return NextResponse.json(
        { error: 'Only draft posts can be regenerated.' },
        { status: 400 }
      );
    }

    // IMPORTANT FIX:
    // no longer fail if content brief does not exist

    const briefResponse = await supabaseAdmin
      .from('content_briefs')
      .select('*')
      .eq('slug', post.slug)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const brief = briefResponse.data || null;

    const categorySlug =
      post.categories?.slug || 'student-success';

    const briefInput = toGeneratedBrief(
      brief || {},
      categorySlug,
      post
    );

    let article = await generateArticle(briefInput);

    // HARD ENFORCEMENT
    // NEVER SAVE SHORT CONTENT

    let attempts = 0;

    while (
      countWords(article.content) < 2000 &&
      attempts < 2
    ) {
      article = await generateArticle(briefInput);
      attempts += 1;
    }

    // deterministic repair pass
    // no repeated AI credit burn

    const improved = await improveArticleToThreshold({
      article,
      primaryKeyword:
        brief?.working_title ||
        post.title ||
        post.slug.replace(/-/g, ' '),

      internalLinkSuggestions:
        briefInput.internal_link_suggestions,

      minimumScore: 100,
      maxPasses: 1
    });

    article = improved.article;

    const finalWordCount = countWords(article.content);

    if (finalWordCount < 2000) {
      return NextResponse.json(
        {
          error:
            'Article generation failed minimum word requirement.',
          wordCount: finalWordCount
        },
        { status: 500 }
      );
    }

    await supabaseAdmin
      .from('content_generation_runs')
      .insert({
        brief_id: brief?.id || null,
        post_id: post.id,
        run_type: 'draft_regeneration',
        status: 'success',
        model_name:
          process.env.AI_MODEL || 'gpt-4.1-mini',
        input_snapshot: {
          post_id: post.id,
          brief: brief || null
        },
        output_snapshot: article
      });

    const updateResponse = await supabaseAdmin
      .from('posts')
      .update({
        title: article.title,
        excerpt: article.excerpt,
        content: article.content,
        reading_time_minutes:
          estimateReadingTime(article.content),

        meta_title: article.meta_title,
        meta_description:
          article.meta_description,

        faq_json: article.faq || [],

        generation_status: 'ai_regenerated'
      })
      .eq('id', post.id)
      .select(`
        id,
        slug,
        title,
        excerpt,
        content,
        meta_title,
        meta_description,
        featured_image_url,
        status
      `)
      .single();

    if (
      updateResponse.error ||
      !updateResponse.data
    ) {
      return NextResponse.json(
        {
          error:
            updateResponse.error?.message ||
            'Unable to update post.'
        },
        { status: 500 }
      );
    }

    const rescored = evaluateEditorialScore({
      title: updateResponse.data.title,
      excerpt:
        updateResponse.data.excerpt || '',

      content:
        updateResponse.data.content || '',

      metaTitle:
        updateResponse.data.meta_title ||
        updateResponse.data.title,

      metaDescription:
        updateResponse.data.meta_description ||
        updateResponse.data.excerpt ||
        '',

      featuredImageUrl:
        updateResponse.data.featured_image_url,

      primaryKeyword:
        brief?.working_title ||
        post.title
    });

    return NextResponse.json({
      success: true,
      score: rescored.score,
      wordCount: rescored.stats.wordCount,
      remainingFailed: rescored.checks
        .filter((c) => !c.passed)
        .map((c) => c.key),
      post: updateResponse.data
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unknown regeneration failure'
      },
      { status: 500 }
    );
  }
}