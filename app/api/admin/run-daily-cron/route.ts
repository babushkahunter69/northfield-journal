import { NextResponse } from 'next/server';
import { isCookieAdmin } from '@/lib/admin-auth';

export async function POST(request: Request) {
  const allowed = await isCookieAdmin();

  if (!allowed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;

    const response = await fetch(`${baseUrl}/api/cron/daily-draft`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.CRON_SECRET}`
      },
      cache: 'no-store'
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.error || 'Cron execution failed.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown cron run error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}