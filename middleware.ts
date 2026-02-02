import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Check role-based access
    if (path.startsWith('/admin') && token?.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // Operators and admins can access production entry
    if (
      (path.startsWith('/production/new') || path.includes('/production/edit')) &&
      token?.role === 'viewer'
    ) {
      return NextResponse.redirect(new URL('/production', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;
        
        // Public routes
        if (
          path === '/login' ||
          path === '/register' ||
          path.startsWith('/api/auth') ||
          path === '/api/signup'
        ) {
          return true;
        }

        // All other routes require authentication
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|favicon.svg|og-image.png|robots.txt).*)',
  ],
};
