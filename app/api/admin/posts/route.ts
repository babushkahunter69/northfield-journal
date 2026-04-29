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

async function requireAdmin() {
  const allowed = await isCookieAdmin();

  if (!allowed) {
    return NextResponse.json(
      { error: 'Unauthorized: admin cookie missing or invalid.' },
      { status: 401 }
    );
  }

  return null;
}

function normalizePostPayload(body: any, existing?: any) {
  const title = String(body.title ?? existing?.title ?? '').trim();
  const content = String(body.content ?? existing?.content ?? '').trim();

  const slug =
    String(body.slug ?? existing?.slug ?? '').trim() ||
    makeSlug(title);

  const authorName = String(
    body.author_name ?? existing?.author_name ?? 'Emily Carter'
  ).trim();

  const keywords = Array.isArray(body.keywords)
    ? body.keywords
    : splitKeywords(String(body.keywords ?? existing?.keywords ?? ''));

  return {
    title,
    slug,
    excerpt:
      String(body.excerpt ?? existing?.excerpt ?? '').trim() ||
      excerptFromContent(content, 180),
    content,
    featured_image_url:
      String(body.featured_image_url ?? existing?.featured_image_url ?? '').trim() || null,
    og_image_url:
      String(
        body.og_image_url ??
          body.featured_image_url ??
          existing?.og_image_url ??
          existing?.featured_image_url ??
          ''
      ).trim() || null,
    canonical_url:
      String(body.canonical_url ?? existing?.canonical_url ?? '').trim() || null,
    author_name: authorName,
    author_bio:
      String(body.author_bio ?? existing?.author_bio ?? defaultAuthorBio(authorName)).trim() || null,
    category_id:
      String(body.category_id ?? existing?.category_id ?? '').trim() || null,
    meta_title:
      String(body.meta_title ?? existing?.meta_title ?? '').trim() || title,
    meta_description:
      String(body.meta_description ?? existing?.meta_description ?? '').trim() ||
      excerptFromContent(content, 155),
    keywords,
    faq_json: Array.isArray(body.faq_json)
      ? body.faq_json
      : Array.isArray(existing?.faq_json)
        ? existing.faq_json
        : null,
    source_type: String(body.source_type ?? existing?.source_type ?? 'editorial').trim(),
    generation_status: String(
      body.generation_status ?? existing?.generation_status ?? 'manual'
    ).trim(),
    is_featured: Boolean(body.is_featured ?? existing?.is_featured ?? false),
    status: body.status === 'published' ? 'published' : body.status === 'draft' ? 'draft' : existing?.status || 'draft',
    reading_time_minutes: estimateReadingTime(content)
  };
}

function validatePublish(payload: any) {
  const primaryKeyword =
    Array.isArray(payload.keywords) && payload.keywords.length > 0
      ? String(payload.keywords[0])
      : '';

  return evaluatePublishGate({
    title: payload.title,
    excerpt: payload.excerpt,
    content: payload.content,
    meta_title: payload.meta_title,
    meta_description: payload.meta_description,
    featured_image_url: payload.featured_image_url,
    author_name: payload.author_name,
    primary_keyword: primaryKeyword
  });
}

export async function POST(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const id = String(body.id || '').trim();

    if (id) {
      const { data: existing, error: existingError } = await supabaseAdmin
        .from('posts')
        .select('*')
        .eq('id', id)
        .single();

      if (existingError || !existing) {
        return NextResponse.json(
          { error: existingError?.message || 'Post not found.' },
          { status: 404 }
        );
      }

      const payload = normalizePostPayload(body, existing);

      if (!payload.title || !payload.content) {
        return NextResponse.json(
          { error: 'Title and content are required.' },
          { status: 400 }
        );
      }

      if (payload.status === 'published') {
        const gate = validatePublish(payload);

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

      const requestedPublishedAt = String(body.published_at || '').trim();
      const nextPublishedAt =
        payload.status === 'published'
          ? requestedPublishedAt || existing.published_at || new Date().toISOString()
          : null;

      const { data, error } = await supabaseAdmin
        .from('posts')
        .update({
          ...payload,
          published_at: nextPublishedAt,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, post: data });
    }

    const payload = normalizePostPayload(body);

    if (!payload.title || !payload.content) {
      return NextResponse.json(
        { error: 'Title and content are required.' },
        { status: 400 }
      );
    }

    if (payload.status === 'published') {
      const gate = validatePublish(payload);

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

    const requestedPublishedAt = String(body.published_at || '').trim();

    const { data, error } = await supabaseAdmin
      .from('posts')
      .insert({
        ...payload,
        published_at:
          payload.status === 'published'
            ? requestedPublishedAt || new Date().toISOString()
            : null,
        updated_at: new Date().toISOString()
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
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const id = String(body.id || body.post_id || '').trim();

    if (!id) {
      return NextResponse.json(
        { error: 'Post ID is required.' },
        { status: 400 }
      );
    }

    await supabaseAdmin
      .from('content_generation_runs')
      .delete()
      .eq('post_id', id);

    await supabaseAdmin
      .from('comments')
      .delete()
      .eq('post_id', id);

    const { error } = await supabaseAdmin
      .from('posts')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json(
        { error: error.message || 'Failed to delete post.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unknown delete error.',
      },
      { status: 500 }
    );
  }
}