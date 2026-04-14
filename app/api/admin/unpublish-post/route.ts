import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(req: Request) {
  try {
    const { post_id } = await req.json();

    if (!post_id) {
      return NextResponse.json({ error: 'Missing post_id' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('posts')
      .update({
        status: 'draft',
        published_at: null
      })
      .eq('id', post_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}