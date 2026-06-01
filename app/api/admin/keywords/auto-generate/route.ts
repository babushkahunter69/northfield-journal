import { NextResponse } from 'next/server';
import { isCookieAdmin } from '@/lib/admin-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { generateKeywordIdeas } from '@/lib/ai/generate-keywords';
import { diversifyKeywordIdeas } from '@/lib/ai/keyword-diversity';

function normalizeText(value: unknown) {
  return String(value || '').trim();
}

export async function POST(request: Request) {
  if (!(await isCookieAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const count = typeof body?.count === 'number' && Number.isFinite(body.count) ? body.count : 20;
    const focus = normalizeText(body?.focus);
    const audience = normalizeText(body?.audience) || 'mixed';
    const gradeBand = normalizeText(body?.grade_band) || 'mixed';

    const requestedCount = Math.max(1, Math.min(count, 50));
    const generatedPool = await generateKeywordIdeas({
      count: Math.max(requestedCount * 8, 120),
      focus,
      audience,
      grade_band: gradeBand
    });

    if (generatedPool.length === 0) {
      return NextResponse.json({ error: 'No keyword ideas were generated.' }, { status: 500 });
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('content_keywords')
      .select('keyword')
      .neq('status', 'rejected')
      .limit(2000);

    if (existingError) throw existingError;

    const existingKeywords = (existing || [])
      .map((row) => String(row.keyword || '').toLowerCase().trim())
      .filter(Boolean);

    const ideas = diversifyKeywordIdeas(generatedPool, {
      max: requestedCount,
      existingKeywords,
      maxPerCluster: 3
    });

    const rows = ideas.map((item) => ({
      keyword: item.keyword,
      status: 'review',
      priority: item.priority,
      audience: item.audience,
      grade_band: item.grade_band,
      subject_area: item.subject_area,
      content_type: item.content_type,
      cluster: item.cluster,
      target_country: item.target_country,
      curriculum: item.curriculum,
      learning_objective: item.learning_objective,
      tone: item.tone
    }));

    if (rows.length === 0) {
      return NextResponse.json({
        success: true,
        inserted: 0,
        skipped: generatedPool.length,
        ideas: [],
        message: 'All generated keyword intents already exist. Clean duplicates or approve existing keywords before generating more.'
      });
    }

    const { data: insertedRows, error: insertError } = await supabaseAdmin
      .from('content_keywords')
      .insert(rows)
      .select('*');

    if (insertError) throw insertError;

    return NextResponse.json({
      success: true,
      inserted: insertedRows?.length ?? rows.length,
      skipped: generatedPool.length - rows.length,
      ideas: insertedRows ?? rows,
      message: 'Generated diverse keyword ideas are ready for review.'
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Auto keyword generation failed.' }, { status: 500 });
  }
}
