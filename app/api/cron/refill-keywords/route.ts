import { NextResponse } from 'next/server';
import { refillQueuedKeywords } from '@/lib/automation/admin';
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
    const result = await refillQueuedKeywords({ minQueueSize: 45, refillAmount: 45 });

    await logAutomationEvent({
      source: 'cron:refill-keywords',
      event_type: 'refill',
      status: 'success',
      message: result.message || `Keyword refill inserted ${result.inserted || 0} keyword intents`,
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
