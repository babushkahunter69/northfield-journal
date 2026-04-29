import { NextResponse } from 'next/server';
import { isCookieAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

const VALID_STATUSES = new Set(['candidate', 'queued', 'in_progress', 'done', 'rejected', 'skipped']);

export async function GET() {
  const allowed = await isCookieAdmin();
  if (!allowed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const response = await supabaseAdmin
    .from('content_keywords')
    .select('*')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false });

  return NextResponse.json({ keywords: response.data ?? [] });
}

export async function POST(request: Request) {
  const allowed = await isCookieAdmin();
  if (!allowed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const keyword = String(body?.keyword || '').trim();

  if (!keyword) {
    return NextResponse.json({ error: 'Keyword is required.' }, { status: 400 });
  }

  const requestedStatus = String(body?.status || 'candidate').trim();
  const status = VALID_STATUSES.has(requestedStatus) ? requestedStatus : 'candidate';

  const insert = await supabaseAdmin
    .from('content_keywords')
    .insert({
      keyword,
      cluster: String(body?.cluster || 'student-success').trim(),
      search_intent: String(body?.search_intent || 'informational').trim(),
      audience: String(body?.audience || 'students').trim(),
      priority: Number(body?.priority || 70),
      country_code: String(body?.country_code || 'US').trim(),
      status,
      last_error: null
    })
    .select('*')
    .single();

  if (insert.error) {
    return NextResponse.json({ error: insert.error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, keyword: insert.data });
}
