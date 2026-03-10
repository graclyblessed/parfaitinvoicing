export { default } from 'next-auth/middleware'

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api/auth routes (NextAuth)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login page (for authentication)
     * - public files
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico|login|images).*)',
  ],
}
