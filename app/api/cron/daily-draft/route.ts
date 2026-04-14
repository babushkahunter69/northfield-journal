import { NextResponse } from 'next/server';
import { isCronAuthorized, runDraftBatch } from '@/lib/cron/run-next-draft';
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
    const result = await runDraftBatch(1);

    await logAutomationEvent({
      source: 'cron:daily-draft',
      event_type: 'run',
      status: result.failed > 0 ? 'warning' : 'success',
      message:
        result.processed === 0
          ? 'Cron ran with no queued keywords'
          : `Cron processed ${result.processed}, succeeded ${result.succeeded}, failed ${result.failed}`,
      meta: result
    });

    return NextResponse.json({
      ...result,
      route: '/api/cron/daily-draft'
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown cron generation failure';

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