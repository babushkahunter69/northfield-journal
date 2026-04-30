import { NextRequest, NextResponse } from 'next/server';

const ADMIN_COOKIE = 'nj-admin-token';

function isAdminPath(pathname: string) {
  return pathname.startsWith('/admin') && pathname !== '/admin/login';
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isAdminPath(pathname)) {
    return NextResponse.next();
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  const token = request.cookies.get(ADMIN_COOKIE)?.value;

  if (adminPassword && token === adminPassword) {
    return NextResponse.next();
  }

  const loginUrl = new URL('/admin/login', request.url);
  loginUrl.searchParams.set('from', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/admin/:path*']
};
