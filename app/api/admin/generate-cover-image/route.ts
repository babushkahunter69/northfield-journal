import { NextResponse } from 'next/server';
import { isCookieAdmin } from '@/lib/admin-auth';
import { getStockCoverImage } from '@/lib/cover/stock-image';

export async function POST(request: Request) {
  const allowed = await isCookieAdmin();

  if (!allowed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => null);

    const title = String(body?.title || '').trim();
    const excerpt = String(body?.excerpt || '').trim();
    const content = String(body?.content || '').trim();
    const slug =
      String(body?.slug || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || `cover-${Date.now()}`;
    const category = String(body?.category || 'education').trim();

    if (!title) {
      return NextResponse.json({ error: 'title is required.' }, { status: 400 });
    }

    const result = await getStockCoverImage({
      title,
      excerpt,
      content,
      slug,
      category
    });

    return NextResponse.json({
      success: true,
      url: result.url,
      provider: result.provider,
      sourceId: result.sourceId,
      photographer: result.photographer,
      photographerUrl: result.photographerUrl,
      alt: result.alt,
      queryUsed: result.queryUsed
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown stock cover error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
