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
      count: body?.count,
      focus: body?.focus,
      audience: body?.audience,
      grade_band: body?.grade_band,
      targetStatus: 'review'
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Auto keyword generation failed.' }, { status: 500 });
  }
}
