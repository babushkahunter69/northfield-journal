import { NextResponse } from 'next/server';
import { isCookieAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

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

    const unsetResponse = await supabaseAdmin
      .from('posts')
      .update({ is_featured_homepage: false })
      .eq('is_featured_homepage', true);

    if (unsetResponse.error) {
      return NextResponse.json(
        { error: unsetResponse.error.message || 'Failed to unset current featured post.' },
        { status: 500 }
      );
    }

    const setResponse = await supabaseAdmin
      .from('posts')
      .update({ is_featured_homepage: true })
      .eq('id', postId)
      .select('id, title, slug, is_featured_homepage')
      .single();

    if (setResponse.error || !setResponse.data) {
      return NextResponse.json(
        { error: setResponse.error?.message || 'Failed to set featured post.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      post: setResponse.data
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown featured post error';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}