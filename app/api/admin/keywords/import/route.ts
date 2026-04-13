import { NextResponse } from 'next/server';
import { isCookieAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

type ImportRow = {
  keyword: string;
  cluster?: string;
  audience?: string;
  search_intent?: string;
  priority?: number;
  country_code?: string;
};

function parseCsvLike(input: string): ImportRow[] {
  return input
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(',').map((part) => part.trim());

      return {
        keyword: parts[0] || '',
        cluster: parts[1] || 'student-success',
        audience: parts[2] || 'students',
        search_intent: parts[3] || 'informational',
        priority: Number(parts[4] || 50),
        country_code: parts[5] || 'US'
      };
    })
    .filter((row) => row.keyword);
}

export async function POST(request: Request) {
  const allowed = await isCookieAdmin();

  if (!allowed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => null);
    const raw = String(body?.raw || '').trim();

    if (!raw) {
      return NextResponse.json({ error: 'raw is required.' }, { status: 400 });
    }

    const rows = parseCsvLike(raw);

    if (!rows.length) {
      return NextResponse.json({ error: 'No valid keywords found.' }, { status: 400 });
    }

    const keywords = rows.map((row) => ({
      keyword: row.keyword,
      cluster: row.cluster || 'student-success',
      audience: row.audience || 'students',
      search_intent: row.search_intent || 'informational',
      priority: Number.isFinite(row.priority) ? Number(row.priority) : 50,
      country_code: row.country_code || 'US',
      status: 'queued'
    }));

    const { data, error } = await supabaseAdmin
      .from('content_keywords')
      .insert(keywords)
      .select('*');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      imported: data?.length || 0,
      keywords: data || []
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown import error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}