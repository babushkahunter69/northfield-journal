import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { generateDraftFromKeywordId } from '@/lib/content/queue';

function isAuthorized(request: Request) {
  const auth = request.headers.get('authorization');
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data: keyword, error } = await supabaseAdmin
      .from('content_keywords')
      .select('id, status')
      .eq('status', 'queued')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!keyword?.id) {
      return NextResponse.json({
        success: true,
        message: 'No queued keywords found.'
      });
    }

    const post = await generateDraftFromKeywordId(keyword.id);

    return NextResponse.json({
      success: true,
      keyword_id: keyword.id,
      post
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown cron generation failure';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}