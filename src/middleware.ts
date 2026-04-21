import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Add X-Request-Source header to all requests
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('X-Request-Source', 'middleware')

  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  // Reject form-urlencoded requests to API routes (CSRF prevention)
  const isApiRoute = request.nextUrl.pathname.startsWith('/api')
  const contentType = request.headers.get('content-type')
  
  if (isApiRoute && request.method !== 'GET' && request.method !== 'HEAD') {
    if (contentType?.includes('application/x-www-form-urlencoded')) {
      return new NextResponse(
        JSON.stringify({ error: 'Content-Type application/x-www-form-urlencoded not allowed' }),
        {
          status: 415,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    }
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Define protected routes and required roles
  const protectedRoutes: Record<string, string> = {
    '/dashboard': 'participant',
    '/organiser': 'organiser',
    '/judge': 'judge',
    '/mentor': 'mentor',
    '/sponsor': 'sponsor',
  }

  const pathname = request.nextUrl.pathname

  // Check if route is protected
  const protectedRoute = Object.keys(protectedRoutes).find((route) =>
    pathname.startsWith(route)
  )

  if (protectedRoute) {
    if (!user) {
      // Not authenticated: redirect to login
      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // Get role from cache cookie or fetch from DB
    const roleCookie = request.cookies.get('hackmate-role')
    let userRole: string | null = roleCookie?.value || null

    if (!userRole) {
      // Fetch role from profiles table
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role) {
        userRole = profile.role
        // Set cookie for 1 hour
        response.cookies.set('hackmate-role', userRole as string, {
          maxAge: 60 * 60,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
        })
      }
    }

    const requiredRole = protectedRoutes[protectedRoute]

    if (!userRole || userRole !== requiredRole) {
      // Wrong role: redirect to unauthorized
      return NextResponse.redirect(new URL('/unauthorized', request.url))
    }
  }

  // If user is authenticated and tries to access /login, redirect to their dashboard
  if (pathname === '/login' && user) {
    const roleCookie = request.cookies.get('hackmate-role')
    const userRole = roleCookie?.value

    if (userRole) {
      return NextResponse.redirect(new URL(`/${userRole}`, request.url))
    } else {
      // No role set - redirect to role selection
      return NextResponse.redirect(new URL('/auth/role', request.url))
    }
  }

  // Clear role cookie on logout (when accessing /login after logout)
  if (pathname === '/login' && !user) {
    response.cookies.delete('hackmate-role')
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}