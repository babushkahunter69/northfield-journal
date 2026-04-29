import { NextResponse } from 'next/server';
import { isCookieAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  const allowed = await isCookieAdmin();
  if (!allowed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const ids = Array.isArray(body?.ids)
    ? body.ids.map((id: unknown) => String(id)).filter(Boolean)
    : [String(body?.id || '')].filter(Boolean);

  if (ids.length === 0) {
    return NextResponse.json({ error: 'Keyword id is required.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('content_keywords')
    .update({
      status: 'rejected',
      last_error: null
    })
    .in('id', ids)
    .select('*');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, rejectd: data ?? [] });
}
