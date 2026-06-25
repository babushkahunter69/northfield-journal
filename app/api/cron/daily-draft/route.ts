import { NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/cron/run-next-draft';
import { runAutomationBatch } from '@/lib/automation/admin';
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
    const result = await runAutomationBatch({ limit: 1, refillIfEmpty: true });

    await logAutomationEvent({
      source: 'cron:daily-draft',
      event_type: 'run',
      status: result.failed > 0 ? 'warning' : 'success',
      message:
        result.processed === 0
          ? result.message || 'Cron ran but no draft was created'
          : `Cron processed ${result.processed}, succeeded ${result.succeeded}, failed ${result.failed}`,
      meta: result
    });

    return NextResponse.json({
      ...result,
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
