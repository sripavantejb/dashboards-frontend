import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const DEFAULT_ADMIN_LOGIN_PATH = '/super-admin';
const ADMIN_LOGIN_PATH = process.env.NEXT_PUBLIC_ADMIN_LOGIN_PATH || DEFAULT_ADMIN_LOGIN_PATH;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/admin/login' || pathname.startsWith('/ops/')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (ADMIN_LOGIN_PATH !== DEFAULT_ADMIN_LOGIN_PATH && pathname === ADMIN_LOGIN_PATH) {
    return NextResponse.rewrite(new URL(DEFAULT_ADMIN_LOGIN_PATH, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/login', '/super-admin', '/ops/:path*'],
};
