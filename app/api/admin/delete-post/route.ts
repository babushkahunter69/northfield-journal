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

    const runsResponse = await supabaseAdmin
      .from('content_generation_runs')
      .delete()
      .eq('post_id', postId);

    if (runsResponse.error) {
      return NextResponse.json(
        { error: runsResponse.error.message || 'Failed to delete generation runs.' },
        { status: 500 }
      );
    }

    const postResponse = await supabaseAdmin
      .from('posts')
      .delete()
      .eq('id', postId);

    if (postResponse.error) {
      return NextResponse.json(
        { error: postResponse.error.message || 'Failed to delete post.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown delete error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}