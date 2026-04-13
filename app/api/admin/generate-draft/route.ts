import { NextResponse } from 'next/server';
import { isCookieAdmin } from '@/lib/admin-auth';
import { generateDraftFromKeywordId } from '@/lib/content/queue';

export async function POST(request: Request) {
  const allowed = await isCookieAdmin();

  if (!allowed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => null);
    const keywordId = String(body?.keyword_id || '').trim();

    if (!keywordId) {
      return NextResponse.json(
        { error: 'keyword_id is required.' },
        { status: 400 }
      );
    }

    const post = await generateDraftFromKeywordId(keywordId);

    return NextResponse.json({
      success: true,
      post
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown draft generation failure';

    console.error('GENERATE_DRAFT_ROUTE_ERROR:', message);

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}