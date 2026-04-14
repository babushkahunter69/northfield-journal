import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { generateKeywordIdeas } from '@/lib/ai/generate-keywords';

function isAuthorized(request: Request) {
  return request.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const minQueueSize = 30;
    const refillAmount = 20;

    const { count, error: countError } = await supabaseAdmin
      .from('content_keywords')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'queued');

    if (countError) {
      throw countError;
    }

    const queuedCount = count ?? 0;

    if (queuedCount >= minQueueSize) {
      return NextResponse.json({
        success: true,
        message: 'Queue is healthy. No refill needed.',
        queued_count: queuedCount,
        inserted: 0
      });
    }

    const generated = await generateKeywordIdeas({
      count: refillAmount,
      focus: 'education',
      audience: 'mixed',
      grade_band: 'mixed'
    });

    const lowerKeywords = generated.map((item) => item.keyword.toLowerCase());

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('content_keywords')
      .select('keyword')
      .in('keyword', lowerKeywords);

    if (existingError) {
      throw existingError;
    }

    const existingSet = new Set(
      (existing || []).map((row) => String(row.keyword || '').toLowerCase())
    );

    const rows = generated
      .filter((item) => !existingSet.has(item.keyword.toLowerCase()))
      .map((item) => ({
        keyword: item.keyword,
        status: 'queued',
        priority: item.priority,
        audience: item.audience,
        grade_band: item.grade_band,
        subject_area: item.subject_area,
        content_type: item.content_type,
        target_country: item.target_country,
        curriculum: item.curriculum,
        learning_objective: item.learning_objective,
        tone: item.tone
      }));

    if (rows.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('content_keywords')
        .insert(rows);

      if (insertError) {
        throw insertError;
      }
    }

    return NextResponse.json({
      success: true,
      queued_count_before: queuedCount,
      inserted: rows.length,
      skipped: generated.length - rows.length
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Keyword refill failed.'
      },
      { status: 500 }
    );
  }
}