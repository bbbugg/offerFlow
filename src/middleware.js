import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'

const COOKIE_NAME = 'session'

async function getTokenPayload(request) {
  const token = request.cookies.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyToken(token)
}

export default async function middleware(request) {
  const { pathname } = request.nextUrl

  // Public routes — always allow
  if (
    pathname.startsWith('/auth') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.svg' ||
    pathname.startsWith('/images')
  ) {
    return NextResponse.next()
  }

  // API routes (non-auth) — return JSON 401 for unauthenticated requests
  // so client-side fetch calls can handle errors gracefully instead of
  // trying to parse an HTML redirect page as JSON.
  if (pathname.startsWith('/api/')) {
    const payload = await getTokenPayload(request)
    if (!payload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.next()
  }

  // Page routes — redirect to login
  const payload = await getTokenPayload(request)
  if (!payload) {
    const url = new URL('/auth/login', request.url)
    url.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.svg|images).*)',
  ],
}
