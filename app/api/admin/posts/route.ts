import { NextResponse } from 'next/server';
import { isCookieAdmin } from '@/lib/admin-auth';
import { evaluatePublishGate } from '@/lib/admin/publish-gate';
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  estimateReadingTime,
  excerptFromContent,
  makeSlug,
  splitKeywords
} from '@/lib/utils';

function defaultAuthorBio(authorName: string) {
  if (authorName === 'Mark Reyes') {
    return 'Mark Reyes focuses on practical education strategies, student productivity, memory improvement, and exam preparation.';
  }

  return 'Emily Carter writes about study skills, learning systems, productivity, and academic improvement for students and lifelong learners.';
}

export async function POST(request: Request) {
  const allowed = await isCookieAdmin();

  if (!allowed) {
    return NextResponse.json(
      { error: 'Unauthorized: admin cookie missing or invalid.' },
      { status: 401 }
    );
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
    const authorName = String(body.author_name || 'Emily Carter').trim();
    const keywords = splitKeywords(String(body.keywords || ''));

    const payload = {
      title,
      slug,
      excerpt:
        String(body.excerpt || '').trim() ||
        excerptFromContent(content, 180),
      content,
      featured_image_url:
        String(body.featured_image_url || '').trim() || null,
      og_image_url: String(body.og_image_url || body.featured_image_url || '').trim() || null,
      canonical_url: String(body.canonical_url || '').trim() || null,
      author_name: authorName,
      author_bio: String(body.author_bio || defaultAuthorBio(authorName)).trim() || null,
      category_id: String(body.category_id || '').trim() || null,
      meta_title: String(body.meta_title || '').trim() || title,
      meta_description:
        String(body.meta_description || '').trim() ||
        excerptFromContent(content, 155),
      keywords,
      faq_json: Array.isArray(body.faq_json) ? body.faq_json : null,
      source_type: String(body.source_type || 'editorial').trim(),
      generation_status: String(body.generation_status || 'manual').trim(),
      is_featured: Boolean(body.is_featured),
      status: body.status === 'published' ? 'published' : 'draft',
      reading_time_minutes: estimateReadingTime(content)
    };

    if (payload.status === 'published') {
      const gate = evaluatePublishGate({
        title: payload.title,
        excerpt: payload.excerpt,
        content: payload.content,
        meta_title: payload.meta_title,
        meta_description: payload.meta_description,
        featured_image_url: payload.featured_image_url,
        author_name: payload.author_name,
        primary_keyword: keywords.length > 0 ? String(keywords[0]) : ''
      });

      if (!gate.ok) {
        return NextResponse.json(
          {
            error: 'This post is not ready to publish.',
            score: gate.score,
            failed: gate.failed,
            stats: gate.stats
          },
          { status: 422 }
        );
      }
    }

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
        return NextResponse.json({ error: error.message }, { status: 500 });
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
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, post: data });
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const allowed = await isCookieAdmin();

  if (!allowed) {
    return NextResponse.json(
      { error: 'Unauthorized: admin cookie missing or invalid.' },
      { status: 401 }
    );
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
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
}
