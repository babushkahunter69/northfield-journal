import { NextResponse } from 'next/server';
import { isCronAuthorized, runDraftBatch } from '@/lib/cron/run-next-draft';
import { refillQueuedKeywordBacklog } from '@/lib/automation/admin';
import { logAutomationEvent } from '@/lib/logging/automation';

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    await logAutomationEvent({
      source: 'cron:daily-draft',
      event_type: 'auth',
      status: 'error',
      message: 'Unauthorized cron request'
    });

    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let result = await runDraftBatch(1);
    let refill: Awaited<ReturnType<typeof refillQueuedKeywordBacklog>> | null = null;

    if (result.succeeded === 0) {
      refill = await refillQueuedKeywordBacklog({
        minQueueSize: 45,
        refillAmount: 50,
        focus: '',
        audience: 'mixed',
        grade_band: 'mixed'
      });

      if (refill.inserted > 0) {
        result = await runDraftBatch(1);
      }
    }

    await logAutomationEvent({
      source: 'cron:daily-draft',
      event_type: 'run',
      status: result.failed > 0 ? 'warning' : 'success',
      message:
        result.succeeded > 0
          ? `Cron created ${result.succeeded} draft(s)`
          : refill?.inserted
            ? `Cron refilled ${refill.inserted} keyword(s), but no draft was created`
            : 'Cron ran with no usable queued keywords',
      meta: { ...result, refill }
    });

    return NextResponse.json({
      ...result,
      refill,
      route: '/api/cron/daily-draft'
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown cron generation failure';

    await logAutomationEvent({
      source: 'cron:daily-draft',
      event_type: 'run',
      status: 'error',
      message,
      meta: { route: '/api/cron/daily-draft' }
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
