import { NextResponse } from 'next/server';
import { isCookieAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { evaluatePublishGate } from '@/lib/admin/publish-gate';
import { estimateReadingTime } from '@/lib/utils';
import { getNorthfieldAuthorAssignment } from '@/lib/seo-authors';

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/--+/g, '-');
}

function plainTextFromHtml(value: string) {
  return String(value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function getUniqueSlug(baseTitle: string, currentId?: string) {
  const baseSlug = slugify(baseTitle) || `post-${Date.now()}`;

  const { data, error } = await supabaseAdmin
    .from('posts')
    .select('id, slug')
    .ilike('slug', `${baseSlug}%`);

  if (error) {
    throw new Error(error.message || 'Failed to check slug uniqueness.');
  }

  const existing = (data || []).filter((row) => row.id !== currentId);
  const used = new Set(existing.map((row) => String(row.slug)));

  if (!used.has(baseSlug)) return baseSlug;

  let i = 2;
  while (used.has(`${baseSlug}-${i}`)) i += 1;
  return `${baseSlug}-${i}`;
}

export async function POST(request: Request) {
  const allowed = await isCookieAdmin();

  if (!allowed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => null);

    const id = typeof body?.id === 'string' ? body.id.trim() : '';
    const title = typeof body?.title === 'string' ? body.title.trim() : '';
    const excerpt = typeof body?.excerpt === 'string' ? body.excerpt.trim() : '';
    const content = typeof body?.content === 'string' ? body.content.trim() : '';
    const status = body?.status === 'published' ? 'published' : 'draft';
    const meta_title = typeof body?.meta_title === 'string' ? body.meta_title.trim() : '';
    const meta_description = typeof body?.meta_description === 'string' ? body.meta_description.trim() : '';
    const featured_image_url =
      typeof body?.featured_image_url === 'string' && body.featured_image_url.trim()
        ? body.featured_image_url.trim()
        : null;
    const primary_keyword =
      typeof body?.primary_keyword === 'string' ? body.primary_keyword.trim() : '';

    if (!title) {
      return NextResponse.json({ error: 'Title is required.' }, { status: 400 });
    }

    const authorAssignment = getNorthfieldAuthorAssignment({
      primaryKeyword: primary_keyword,
      keyword: primary_keyword,
      title,
      excerpt,
      content: plainTextFromHtml(content),
    });
    const author_name = authorAssignment.author.name;
    const author_bio = authorAssignment.author.bio;
    const reading_time_minutes = estimateReadingTime(content);

    if (status === 'published') {
      const gate = evaluatePublishGate({
        title,
        excerpt,
        content,
        meta_title,
        meta_description,
        featured_image_url,
        author_name,
        primary_keyword,
      });

      if (!gate.ok) {
        return NextResponse.json(
          {
            error: 'This post is not ready to publish.',
            score: gate.score,
            failed: gate.failed,
            stats: gate.stats,
          },
          { status: 422 }
        );
      }
    }

    if (id) {
      const slug = await getUniqueSlug(title, id);

      const { data, error } = await supabaseAdmin
        .from('posts')
        .update({
          title,
          slug,
          excerpt,
          content,
          reading_time_minutes,
          status,
          meta_title,
          meta_description,
          featured_image_url,
          author_name,
          author_bio,
          generation_status: `author_${authorAssignment.author.initials.toLowerCase()}_${authorAssignment.matchedTopic.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}`,
          published_at: status === 'published' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('id, slug, status, featured_image_url, reading_time_minutes, author_name, author_bio')
        .single();

      if (error || !data) {
        return NextResponse.json(
          { error: error?.message || 'Unable to update post.' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, post: data, authorAssignment });
    }

    const slug = await getUniqueSlug(title);

    const { data, error } = await supabaseAdmin
      .from('posts')
      .insert({
        title,
        slug,
        excerpt,
        content,
        reading_time_minutes,
        status,
        meta_title,
        meta_description,
        featured_image_url,
        author_name,
        author_bio,
        source_type: 'manual',
        generation_status: `manual_draft_author_${authorAssignment.author.initials.toLowerCase()}`,
        published_at: status === 'published' ? new Date().toISOString() : null,
      })
      .select('id, slug, status, featured_image_url, reading_time_minutes, author_name, author_bio')
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || 'Unable to create post.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, post: data, authorAssignment });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown save error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
