import { NextResponse } from 'next/server';
import { isCookieAdmin } from '@/lib/admin-auth';
import { draftNextQueuedKeyword } from '@/lib/automation/admin';
import { generateDraftFromKeywordId } from '@/lib/content/queue';

export async function POST(request: Request) {
  if (!(await isCookieAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const keywordId = String(body?.keyword_id || '').trim();
    const result = keywordId
      ? { success: true, processed: 1, post: await generateDraftFromKeywordId(keywordId) }
      : await draftNextQueuedKeyword();

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Draft generation failed.' },
      { status: 500 }
    );
  }
}
