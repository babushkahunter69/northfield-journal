import { NextResponse } from 'next/server';
import { isCookieAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/--+/g, '-');
}

export async function POST(request: Request) {
  const allowed = await isCookieAdmin();

  if (!allowed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => null);

    const title = typeof body?.title === 'string' ? body.title.trim() : '';
    const excerpt = typeof body?.excerpt === 'string' ? body.excerpt.trim() : '';
    const content = typeof body?.content === 'string' ? body.content.trim() : '';
    const status = body?.status === 'published' ? 'published' : 'draft';
    const meta_title =
      typeof body?.meta_title === 'string' ? body.meta_title.trim() : '';
    const meta_description =
      typeof body?.meta_description === 'string'
        ? body.meta_description.trim()
        : '';
    const featured_image_url =
      typeof body?.featured_image_url === 'string' && body.featured_image_url.trim()
        ? body.featured_image_url.trim()
        : null;

    if (!title) {
      return NextResponse.json({ error: 'Title is required.' }, { status: 400 });
    }

    const payload = {
      title,
      excerpt,
      content,
      status,
      meta_title,
      meta_description,
      featured_image_url
    };

    if (body?.id) {
      const { data, error } = await supabaseAdmin
        .from('posts')
        .update(payload)
        .eq('id', body.id)
        .select('id, slug, status')
        .single();

      if (error || !data) {
        return NextResponse.json(
          { error: error?.message || 'Unable to update post.' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, post: data });
    }

    const baseSlug = slugify(title) || `post-${Date.now()}`;

    const { data: existing } = await supabaseAdmin
      .from('posts')
      .select('slug')
      .ilike('slug', `${baseSlug}%`);

    const used = new Set((existing || []).map((row) => String(row.slug)));
    let slug = baseSlug;
    let i = 2;
    while (used.has(slug)) {
      slug = `${baseSlug}-${i}`;
      i += 1;
    }

    const { data, error } = await supabaseAdmin
      .from('posts')
      .insert({
        ...payload,
        slug,
        author_name: 'Northfield Journal Editorial Desk'
      })
      .select('id, slug, status')
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || 'Unable to create post.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, post: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown save error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}