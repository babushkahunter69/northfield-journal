import { NextResponse } from 'next/server';
import { isCookieAdmin } from '@/lib/admin-auth';
import { runAutomationBatch } from '@/lib/automation/admin';

export async function POST(request: Request) {
  if (!(await isCookieAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const result = await runAutomationBatch({
      limit: body?.limit,
      refillIfEmpty: body?.refill_if_empty !== false,
      focus: body?.focus,
      audience: body?.audience,
      grade_band: body?.grade_band
    });

    return NextResponse.json({ ...result, success: result.failed === 0 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Automation run failed.' },
      { status: 500 }
    );
  }
}
