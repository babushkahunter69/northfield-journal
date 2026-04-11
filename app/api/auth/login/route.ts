import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      return NextResponse.json(
        { error: 'ADMIN_PASSWORD environment variable is not set' },
        { status: 500 }
      );
    }

    if (String(password || '').trim() !== adminPassword.trim()) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    const res = NextResponse.json({ ok: true });

    res.cookies.set('nj-admin-token', adminPassword, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7
    });

    return res;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}