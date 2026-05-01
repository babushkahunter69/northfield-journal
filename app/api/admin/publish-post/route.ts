import { NextResponse } from 'next/server';
import { isCookieAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { evaluatePublishGate } from '@/lib/admin/publish-gate';
import { getNorthfieldAuthorAssignment } from '@/lib/seo-authors';

function plainTextFromHtml(value: string) {
  return String(value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function POST(request: Request) {
  const allowed = await isCookieAdmin();

  if (!allowed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => null);
    const postId = typeof body?.post_id === 'string' ? body.post_id.trim() : '';

    if (!postId) {
      return NextResponse.json({ error: 'post_id is required.' }, { status: 400 });
    }

    const postResponse = await supabaseAdmin
      .from('posts')
      .select('id, slug, title, excerpt, content, meta_title, meta_description, featured_image_url, author_name, author_bio, keywords, categories(name, slug)')
      .eq('id', postId)
      .single();

    if (postResponse.error || !postResponse.data) {
      return NextResponse.json(
        { error: postResponse.error?.message || 'Post not found.' },
        { status: 404 }
      );
    }

    const post = postResponse.data as any;
    const primaryKeyword = Array.isArray(post.keywords) && post.keywords.length > 0
      ? String(post.keywords[0])
      : post.slug?.replace(/-/g, ' ');

    const authorAssignment = getNorthfieldAuthorAssignment({
      primaryKeyword,
      keyword: primaryKeyword,
      title: post.title,
      excerpt: post.excerpt,
      content: plainTextFromHtml(post.content || ''),
      category: [post.categories?.name, post.categories?.slug].filter(Boolean).join(' '),
    });

    const gate = evaluatePublishGate({
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      meta_title: post.meta_title,
      meta_description: post.meta_description,
      featured_image_url: post.featured_image_url,
      author_name: authorAssignment.author.name,
      primary_keyword: primaryKeyword
    });

    if (!gate.ok) {
      return NextResponse.json(
        { error: 'This post is not ready to publish.', score: gate.score, failed: gate.failed, stats: gate.stats },
        { status: 422 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('posts')
      .update({
        status: 'published',
        author_name: authorAssignment.author.name,
        author_bio: authorAssignment.author.bio,
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        generation_status: `published_score_${gate.score}_author_${authorAssignment.author.initials.toLowerCase()}`
      })
      .eq('id', postId)
      .select('id, slug, status, published_at, author_name, author_bio')
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || 'Unable to publish post.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, score: gate.score, post: data, authorAssignment });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown publish error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
