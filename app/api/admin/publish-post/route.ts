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

    const { data, error } = await supabaseAdmin
      .from('posts')
      .update({
        status: 'published',
        published_at: new Date().toISOString()
      })
      .eq('id', postId)
      .select('id, slug, status, published_at')
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || 'Unable to publish post.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      post: data
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown publish error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}