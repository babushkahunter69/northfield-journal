import { NextResponse } from 'next/server';
import { getNextQueuedKeyword, generateDraftFromKeyword } from '@/lib/content/queue';

function isAuthorized(request: Request) {
  const auth = request.headers.get('authorization');
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

async function handleRequest(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const keyword = await getNextQueuedKeyword();

  if (!keyword) {
    return NextResponse.json({ ok: true, message: 'No queued keywords available.' });
  }

  const result = await generateDraftFromKeyword(keyword);
  return NextResponse.json({
    ok: true,
    keyword: result.keyword.keyword,
    briefId: result.brief.id,
    postId: result.post.id,
    slug: result.post.slug
  });
}

export async function GET(request: Request) {
  return handleRequest(request);
}

export async function POST(request: Request) {
  return handleRequest(request);
}
