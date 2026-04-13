import { NextResponse } from 'next/server';
import { isCookieAdmin } from '@/lib/admin-auth';
import { createCoverForPost } from '@/lib/cover/create-cover';

export async function POST(request: Request) {
  const allowed = await isCookieAdmin();
  if (!allowed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const title = String(body?.title || '').trim();
  const categorySlug = String(body?.category_slug || 'student-success').trim();

  if (!title) {
    return NextResponse.json({ error: 'title is required.' }, { status: 400 });
  }

  const url = await createCoverForPost({ title, categorySlug, slug: String(body?.slug || '').trim() || undefined });
  return NextResponse.json({ success: true, url });
}
