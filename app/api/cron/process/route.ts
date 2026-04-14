import { NextResponse } from 'next/server';
import { isCronAuthorized, runDraftBatch } from '@/lib/cron/run-next-draft';

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const batchParam = Number(url.searchParams.get('batch') || '3');
    const batchSize = Number.isFinite(batchParam) ? batchParam : 3;

    const result = await runDraftBatch(batchSize);

    return NextResponse.json({
      ...result,
      route: '/api/cron/process',
      batch_size: Math.max(1, Math.min(batchSize, 10))
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown cron generation failure';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}