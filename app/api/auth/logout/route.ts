import { NextResponse } from 'next/server';

export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const res = NextResponse.redirect(new URL('/admin/login', appUrl));
  res.cookies.delete('nj-admin-token');
  return res;
}