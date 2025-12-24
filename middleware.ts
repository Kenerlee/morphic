import { type NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  // Get the protocol from X-Forwarded-Proto header or request protocol
  const protocol =
    request.headers.get('x-forwarded-proto') || request.nextUrl.protocol

  // Get the host from X-Forwarded-Host header or request host
  const host =
    request.headers.get('x-forwarded-host') || request.headers.get('host') || ''

  // Construct the base URL - ensure protocol has :// format
  const baseUrl = `${protocol}${protocol.endsWith(':') ? '//' : '://'}${host}`

  // Better Auth session 检查 (通过 cookie)
  // 注意：这里只检查 cookie 是否存在，详细验证在 API 层
  const sessionCookie = request.cookies.get('better-auth.session_token')
  const hasSession = !!sessionCookie?.value

  // 需要认证的路径
  const protectedPaths = ['/profile', '/expert', '/admin']
  const pathname = request.nextUrl.pathname

  // 检查是否需要认证
  const isProtected = protectedPaths.some(path => pathname.startsWith(path))

  if (isProtected && !hasSession) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('returnUrl', pathname)
    return NextResponse.redirect(url)
  }

  const response = NextResponse.next({ request })

  // Add request information to response headers
  response.headers.set('x-url', request.url)
  response.headers.set('x-host', host)
  response.headers.set('x-protocol', protocol)
  response.headers.set('x-base-url', baseUrl)

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
  ]
}
