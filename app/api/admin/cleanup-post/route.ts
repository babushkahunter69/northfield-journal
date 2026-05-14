import { NextResponse } from 'next/server';
import { isCookieAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { evaluateEditorialScore } from '@/lib/admin/editorial-score';
import { estimateReadingTime } from '@/lib/utils';
import { normalizeExistingArticleContent, cleanSeoTitle, naturalMetaTitle, naturalMetaDescription } from '@/lib/seo/finalize-article';
import { repairInternalLinks } from '@/lib/content/internal-links';

export async function POST(request: Request) {
  if (!(await isCookieAdmin())) {
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
      .select('id, slug, title, excerpt, content, meta_title, meta_description, featured_image_url, keywords, status')
      .eq('id', postId)
      .single();

    if (postResponse.error || !postResponse.data) {
      return NextResponse.json({ error: 'Post not found.' }, { status: 404 });
    }

    const post = postResponse.data as any;
    const primaryKeyword =
      (Array.isArray(post.keywords) && post.keywords[0]) ||
      post.title ||
      String(post.slug || '').replace(/-/g, ' ');

    const title = cleanSeoTitle(post.title);
    const normalizedContent = normalizeExistingArticleContent({
      title,
      content: post.content || '',
      primaryKeyword
    });

    const linkedContent = await repairInternalLinks(normalizedContent, {
      excludeSlug: post.slug,
      title,
      excerpt: post.excerpt || '',
      keywords: Array.isArray(post.keywords) ? post.keywords : []
    });

    const repairedContent = normalizeExistingArticleContent({
      title,
      content: linkedContent,
      primaryKeyword
    });

    const updateResponse = await supabaseAdmin
      .from('posts')
      .update({
        title,
        content: repairedContent,
        reading_time_minutes: estimateReadingTime(repairedContent),
        meta_title: naturalMetaTitle(post.meta_title || title, primaryKeyword),
        meta_description: naturalMetaDescription(post.meta_description || post.excerpt || '', title, primaryKeyword),
        generation_status: 'deterministic_cleanup',
        updated_at: new Date().toISOString()
      })
      .eq('id', postId)
      .select('id, slug, title, excerpt, content, meta_title, meta_description, featured_image_url, status')
      .single();

    if (updateResponse.error || !updateResponse.data) {
      return NextResponse.json({ error: updateResponse.error?.message || 'Unable to clean post.' }, { status: 500 });
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
      score: score.score,
      wordCount: score.stats.wordCount,
      remainingFailed: score.checks.filter((check) => !check.passed).map((check) => check.key),
      post: updateResponse.data
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Cleanup failed.' },
      { status: 500 }
    );
  }
}
