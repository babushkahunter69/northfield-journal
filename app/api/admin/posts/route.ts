import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  estimateReadingTime,
  excerptFromContent,
  makeSlug,
  splitKeywords
} from '@/lib/utils';

/* =========================
   CREATE / UPDATE
========================= */

export async function POST(request: Request) {
  const allowed = await isAdmin();
  if (!allowed) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const title = String(body.title || '').trim();
    const content = String(body.content || '').trim();

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required.' },
        { status: 400 }
      );
    }

    const slug = String(body.slug || '').trim() || makeSlug(title);
    const requestedPublishedAt = String(body.published_at || '').trim();

    const payload = {
      title,
      slug,
      excerpt:
        String(body.excerpt || '').trim() ||
        excerptFromContent(content, 180),
      content,
      featured_image_url:
        String(body.featured_image_url || '').trim() || null,
      author_name: String(body.author_name || 'Editorial Team').trim(),
      author_bio: String(body.author_bio || '').trim() || null,
      category_id: String(body.category_id || '').trim() || null,
      meta_title: String(body.meta_title || '').trim() || title,
      meta_description:
        String(body.meta_description || '').trim() ||
        excerptFromContent(content, 155),
      keywords: splitKeywords(String(body.keywords || '')),
      is_featured: Boolean(body.is_featured),
      status: body.status === 'published' ? 'published' : 'draft',
      reading_time_minutes: estimateReadingTime(content)
    };

    if (body.id) {
      const existingResponse = await supabaseAdmin
        .from('posts')
        .select('published_at')
        .eq('id', body.id)
        .single();

      const existingPublishedAt = existingResponse.data?.published_at || null;

      const nextPublishedAt =
        payload.status === 'published'
          ? requestedPublishedAt || existingPublishedAt || new Date().toISOString()
          : null;

      const { data, error } = await supabaseAdmin
        .from('posts')
        .update({
          ...payload,
          published_at: nextPublishedAt
        })
        .eq('id', body.id)
        .select()
        .single();

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, post: data });
    }

    const { data, error } = await supabaseAdmin
      .from('posts')
      .insert({
        ...payload,
        published_at:
          payload.status === 'published'
            ? requestedPublishedAt || new Date().toISOString()
            : null
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, post: data });
  } catch {
    return NextResponse.json(
      { error: 'Invalid request.' },
      { status: 400 }
    );
  }
}

/* =========================
   DELETE
========================= */

export async function DELETE(request: Request) {
  const allowed = await isAdmin();
  if (!allowed) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Post ID is required.' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from('posts')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Invalid request.' },
      { status: 400 }
    );
  }
}