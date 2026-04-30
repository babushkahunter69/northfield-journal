import { NextResponse } from 'next/server';
import { isCookieAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { improveArticleToThreshold } from '@/lib/ai/improve-article';
import { evaluateEditorialScore } from '@/lib/admin/editorial-score';
import { estimateReadingTime } from '@/lib/utils';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ postId: string }> | { postId: string } }
) {
  if (!(await isCookieAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const resolved = await params;
    const postId = String(resolved.postId || '').trim();

    if (!postId) {
      return NextResponse.json({ error: 'postId is required.' }, { status: 400 });
    }

    const postResponse = await supabaseAdmin
      .from('posts')
      .select('id, slug, title, excerpt, content, meta_title, meta_description, featured_image_url, keywords, status')
      .eq('id', postId)
      .single();

    if (postResponse.error || !postResponse.data) {
      return NextResponse.json({ error: 'Post not found.' }, { status: 404 });
    }

    const post = postResponse.data as any;
    const briefResponse = await supabaseAdmin
      .from('content_briefs')
      .select('working_title, slug, internal_links_json')
      .eq('slug', post.slug)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const primaryKeyword =
      briefResponse.data?.working_title ||
      (Array.isArray(post.keywords) && post.keywords[0]) ||
      post.slug.replace(/-/g, ' ');

    const improved = await improveArticleToThreshold({
      article: {
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt || '',
        content: post.content || '',
        meta_title: post.meta_title || post.title,
        meta_description: post.meta_description || post.excerpt || '',
        keywords: Array.isArray(post.keywords) ? post.keywords : [],
        category_slug: 'education',
        faq: []
      },
      primaryKeyword,
      internalLinkSuggestions: Array.isArray(briefResponse.data?.internal_links_json)
        ? briefResponse.data.internal_links_json
        : [],
      minimumScore: 100,
      maxPasses: 4
    });

    const updateResponse = await supabaseAdmin
      .from('posts')
      .update({
        title: improved.article.title,
        excerpt: improved.article.excerpt,
        content: improved.article.content,
        reading_time_minutes: estimateReadingTime(improved.article.content),
        meta_title: improved.article.meta_title,
        meta_description: improved.article.meta_description,
        generation_status: `seo_fixed_${improved.after.score}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', postId)
      .select('id, slug, title, excerpt, content, meta_title, meta_description, featured_image_url, status')
      .single();

    if (updateResponse.error || !updateResponse.data) {
      return NextResponse.json(
        { error: updateResponse.error?.message || 'Unable to update post.' },
        { status: 500 }
      );
    }

    const score = evaluateEditorialScore({
      title: updateResponse.data.title,
      excerpt: updateResponse.data.excerpt || '',
      content: updateResponse.data.content || '',
      metaTitle: updateResponse.data.meta_title || updateResponse.data.title,
      metaDescription: updateResponse.data.meta_description || updateResponse.data.excerpt || '',
      featuredImageUrl: updateResponse.data.featured_image_url,
      primaryKeyword
    });

    return NextResponse.json({
      success: true,
      before: improved.before.score,
      after: score.score,
      remainingFailed: score.checks.filter((check) => !check.passed).map((check) => check.key),
      post: updateResponse.data
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'SEO fix failed.' },
      { status: 500 }
    );
  }
}
