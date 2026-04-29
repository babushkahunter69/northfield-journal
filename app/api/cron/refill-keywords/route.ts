import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { generateKeywordIdeas } from '@/lib/ai/generate-keywords';
import { logAutomationEvent } from '@/lib/logging/automation';

function isAuthorized(request: Request) {
  return request.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    await logAutomationEvent({
      source: 'cron:refill-keywords',
      event_type: 'auth',
      status: 'error',
      message: 'Unauthorized keyword refill request'
    });

    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const minCandidateSize = 30;
    const refillAmount = 20;

    const { count, error: countError } = await supabaseAdmin
      .from('content_keywords')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'candidate');

    if (countError) throw countError;

    const candidateCount = count ?? 0;

    if (candidateCount >= minCandidateSize) {
      await logAutomationEvent({
        source: 'cron:refill-keywords',
        event_type: 'refill',
        status: 'info',
        message: 'Candidate pool healthy, no refill needed',
        meta: { candidate_count: candidateCount, min_candidate_size: minCandidateSize }
      });

      return NextResponse.json({
        success: true,
        message: 'Candidate keyword pool is healthy. No refill needed.',
        candidate_count: candidateCount,
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

    if (existingError) throw existingError;

    const existingSet = new Set(
      (existing || []).map((row) => String(row.keyword || '').toLowerCase())
    );

    const rows = generated
      .filter((item) => !existingSet.has(item.keyword.toLowerCase()))
      .map((item) => ({
        keyword: item.keyword,
        status: 'candidate',
        priority: item.quality_score,
        quality_score: item.quality_score,
        approval_recommendation: item.approval_recommendation,
        scoring_notes: item.scoring_notes,
        score_breakdown: item.score_breakdown,
        pillar: item.pillar,
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

    if (rows.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('content_keywords')
        .insert(rows);

      if (insertError) throw insertError;
    }

    await logAutomationEvent({
      source: 'cron:refill-keywords',
      event_type: 'refill',
      status: 'success',
      message: `Keyword refill inserted ${rows.length} candidate keywords`,
      meta: {
        candidate_count_before: candidateCount,
        inserted: rows.length,
        skipped: generated.length - rows.length
      }
    });

    return NextResponse.json({
      success: true,
      candidate_count_before: candidateCount,
      inserted: rows.length,
      skipped: generated.length - rows.length
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Keyword refill failed.';

    await logAutomationEvent({
      source: 'cron:refill-keywords',
      event_type: 'refill',
      status: 'error',
      message
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
