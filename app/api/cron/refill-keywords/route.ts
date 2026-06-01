import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { generateKeywordIdeas } from '@/lib/ai/generate-keywords';
import { logAutomationEvent } from '@/lib/logging/automation';

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;

  const auth = request.headers.get('authorization')?.trim();
  return auth === `Bearer ${secret}`;
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
    const minQueueSize = 30;
    const refillAmount = 20;

    const { count, error: countError } = await supabaseAdmin
      .from('content_keywords')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'queued');

    if (countError) throw countError;

    const queuedCount = count ?? 0;

    if (queuedCount >= minQueueSize) {
      await logAutomationEvent({
        source: 'cron:refill-keywords',
        event_type: 'refill',
        status: 'info',
        message: 'Queue healthy, no refill needed',
        meta: { queued_count: queuedCount, min_queue_size: minQueueSize }
      });

      return NextResponse.json({
        success: true,
        message: 'Queue is healthy. No refill needed.',
        queued_count: queuedCount,
        inserted: 0
      });
    }

    const needed = Math.max(refillAmount, minQueueSize - queuedCount);
    const generated = await generateKeywordIdeas({
      count: Math.max(needed * 4, 80),
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
      .slice(0, needed)
      .map((item) => ({
        keyword: item.keyword,
        status: 'queued',
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
      message: `Keyword refill inserted ${rows.length} new keywords`,
      meta: {
        queued_count_before: queuedCount,
        inserted: rows.length,
        skipped: generated.length - rows.length
      }
    });

    return NextResponse.json({
      success: true,
      queued_count_before: queuedCount,
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