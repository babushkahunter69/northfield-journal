import { NextResponse } from 'next/server';
import { isCookieAdmin } from '@/lib/admin-auth';
import { generateAutomationKeywords } from '@/lib/automation/admin';

export async function POST(request: Request) {
  if (!(await isCookieAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const result = await generateAutomationKeywords({
      ...(body || {}),
      targetStatus: 'queued'
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Keyword generation failed.' },
      { status: 500 }
    );
  }
}
