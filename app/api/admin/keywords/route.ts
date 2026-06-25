import { NextResponse } from 'next/server';
import { isCookieAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { archiveAndDeleteRejectedKeywords } from '@/lib/automation/admin';

export async function GET() {
  const allowed = await isCookieAdmin();
  if (!allowed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const response = await supabaseAdmin
    .from('content_keywords')
    .select('*')
    .order('created_at', { ascending: false })
    .order('priority', { ascending: false });

  return NextResponse.json({ keywords: response.data ?? [] });
}

export async function POST(request: Request) {
  const allowed = await isCookieAdmin();
  if (!allowed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const keyword = String(body?.keyword || '').trim();
  if (!keyword) return NextResponse.json({ error: 'Keyword is required.' }, { status: 400 });

  const insert = await supabaseAdmin
    .from('content_keywords')
    .insert({
      keyword,
      cluster: String(body?.cluster || 'student-success').trim(),
      search_intent: String(body?.search_intent || 'informational').trim(),
      audience: String(body?.audience || 'students').trim(),
      priority: Number(body?.priority || 50),
      country_code: String(body?.country_code || 'US').trim(),
      status: 'queued'
    })
    .select('*')
    .single();

  if (insert.error) return NextResponse.json({ error: insert.error.message }, { status: 500 });
  return NextResponse.json({ success: true, keyword: insert.data });
}

export async function PATCH(request: Request) {
  const allowed = await isCookieAdmin();
  if (!allowed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const id = String(body?.id || '').trim();
  const status = String(body?.status || '').trim();

  if (!id) return NextResponse.json({ error: 'Keyword id is required.' }, { status: 400 });
  if (!['review', 'queued', 'skipped'].includes(status)) {
    return NextResponse.json({ error: 'Unsupported keyword status.' }, { status: 400 });
  }

  const update = await supabaseAdmin
    .from('content_keywords')
    .update({ status })
    .eq('id', id)
    .select('*')
    .single();

  if (update.error) return NextResponse.json({ error: update.error.message }, { status: 500 });

  if (status === 'skipped') {
    await archiveAndDeleteRejectedKeywords();
    return NextResponse.json({ success: true, keyword: { ...update.data, status: 'skipped' }, deleted: true });
  }

  return NextResponse.json({ success: true, keyword: update.data });
}
