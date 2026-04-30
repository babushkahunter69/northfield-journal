import { NextResponse } from 'next/server';
import { isCookieAdmin } from '@/lib/admin-auth';
import { cleanupDuplicateKeywords } from '@/lib/automation/admin';

export async function POST() {
  if (!(await isCookieAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    return NextResponse.json(await cleanupDuplicateKeywords());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Cleanup failed.' },
      { status: 500 }
    );
  }
}
