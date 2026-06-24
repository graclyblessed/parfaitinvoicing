import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

// Simple middleware that redirects to login if not authenticated
export default withAuth(
  function middleware(req) {
    // Allow the request to proceed
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        // If no token, user is not authenticated
        return !!token
      },
    },
    pages: {
      signIn: '/login',
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes (all API routes need to be accessible)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login page (for authentication)
     * - public files (images, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|login|images).*)',
  ],
}
