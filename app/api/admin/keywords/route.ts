import { NextResponse } from 'next/server';
import { isCookieAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { scoreKeywordIdea } from '@/lib/seo/keyword-intelligence';

export async function GET() {
  const allowed = await isCookieAdmin();
  if (!allowed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const response = await supabaseAdmin
    .from('content_keywords')
    .select('*')
    .order('quality_score', { ascending: false, nullsFirst: false })
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

  const intelligence = scoreKeywordIdea({
    keyword,
    cluster: body?.cluster,
    audience: body?.audience,
    grade_band: body?.grade_band,
    subject_area: body?.subject_area,
    content_type: body?.content_type
  });

  const insert = await supabaseAdmin
    .from('content_keywords')
    .insert({
      keyword,
      cluster: intelligence.cluster,
      search_intent: intelligence.search_intent,
      audience: String(body?.audience || 'students').trim(),
      priority: intelligence.quality_score,
      quality_score: intelligence.quality_score,
      approval_recommendation: intelligence.recommendation,
      scoring_notes: { reasons: intelligence.reasons, risks: intelligence.risks },
      score_breakdown: intelligence.score_breakdown,
      pillar: intelligence.pillar,
      country_code: String(body?.country_code || 'US').trim(),
      status: 'candidate'
    })
    .select('*')
    .single();

  if (insert.error) {
    return NextResponse.json({ error: insert.error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, keyword: insert.data });
}
