import { NextResponse } from 'next/server';
import { refillQueuedKeywordBacklog } from '@/lib/automation/admin';
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
    const result = await refillQueuedKeywordBacklog({
      minQueueSize: 45,
      refillAmount: 50,
      focus: '',
      audience: 'mixed',
      grade_band: 'mixed'
    });

    await logAutomationEvent({
      source: 'cron:refill-keywords',
      event_type: 'refill',
      status: result.inserted > 0 ? 'success' : 'info',
      message: result.message,
      meta: result
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Keyword refill failed.';

    await logAutomationEvent({
      source: 'cron:refill-keywords',
      event_type: 'refill',
      status: 'error',
      message
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
