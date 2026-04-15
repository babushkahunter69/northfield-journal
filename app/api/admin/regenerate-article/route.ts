import { NextResponse } from 'next/server';
import { isCookieAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { generateArticle } from '@/lib/ai/generate-article';
import { improveArticleToThreshold } from '@/lib/ai/improve-article';
import type { ContentBriefRow, GeneratedBrief } from '@/lib/types';

function toGeneratedBrief(
  brief: ContentBriefRow,
  fallbackCategorySlug: string
): GeneratedBrief {
  return {
    working_title: brief.working_title,
    slug: brief.slug,
    angle: brief.angle || '',
    seo_title: brief.seo_title || brief.working_title,
    seo_description: brief.seo_description || '',
    target_word_count: brief.target_word_count || 1400,
    secondary_keywords: [],
    outline: Array.isArray(brief.outline_json) ? brief.outline_json : [],
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
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => null);
    const postId = String(body?.post_id || '').trim();

    if (!postId) {
      return NextResponse.json({ error: 'post_id is required.' }, { status: 400 });
    }

    const postResponse = await supabaseAdmin
      .from('posts')
      .select('*, categories(slug)')
      .eq('id', postId)
      .single();

    if (postResponse.error || !postResponse.data) {
      return NextResponse.json({ error: 'Post not found.' }, { status: 404 });
    }

    const post = postResponse.data as {
      id: string;
      slug: string;
      title: string;
      excerpt: string | null;
      content: string;
      meta_title: string | null;
      meta_description: string | null;
      status: 'draft' | 'published';
      faq_json?: Array<{ question: string; answer: string }> | null;
      categories?: { slug?: string | null } | null;
    };

    if (post.status !== 'draft') {
      return NextResponse.json(
        { error: 'Only draft posts can be regenerated.' },
        { status: 400 }
      );
    }

    const briefResponse = await supabaseAdmin
      .from('content_briefs')
      .select('*')
      .eq('slug', post.slug)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (briefResponse.error || !briefResponse.data) {
      return NextResponse.json(
        { error: 'No matching content brief found for this draft.' },
        { status: 404 }
      );
    }

    const brief = briefResponse.data as ContentBriefRow;
    const categorySlug = post.categories?.slug || 'student-success';

    const briefInput = toGeneratedBrief(brief, categorySlug);
    let article = await generateArticle(briefInput);
    const improved = await improveArticleToThreshold({
      article,
      primaryKeyword: brief.working_title,
      internalLinkSuggestions: briefInput.internal_link_suggestions
    });
    article = improved.article;

    await supabaseAdmin.from('content_generation_runs').insert({
      brief_id: brief.id,
      post_id: post.id,
      run_type: 'draft_regeneration',
      status: 'success',
      model_name: process.env.AI_MODEL || 'gpt-4.1-mini',
      input_snapshot: {
        post_id: post.id,
        previous_title: post.title,
        previous_excerpt: post.excerpt,
        previous_content: post.content,
        brief
      },
      output_snapshot: article
    });

    const updateResponse = await supabaseAdmin
      .from('posts')
      .update({
        title: article.title || post.title,
        excerpt: article.excerpt || post.excerpt || '',
        content: article.content,
        meta_title: article.meta_title || post.meta_title || post.title,
        meta_description:
          article.meta_description || post.meta_description || post.excerpt || '',
        faq_json: article.faq || post.faq_json || null,
        generation_status: 'ai_regenerated'
      })
      .eq('id', post.id)
      .select('id')
      .single();

    if (updateResponse.error || !updateResponse.data) {
      return NextResponse.json(
        { error: updateResponse.error?.message || 'Unable to update post.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      post: updateResponse.data
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown regeneration failure';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}