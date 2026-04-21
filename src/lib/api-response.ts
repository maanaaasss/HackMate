import { NextResponse, NextRequest } from 'next/server'

/**
 * Utility functions for consistent API responses in Route Handlers
 */

type ApiResponse<T = unknown> = {
  data?: T
  error?: string
  message?: string
}

/**
 * Success response with data
 */
export function success<T>(data: T, status = 200, noStore = false): NextResponse<ApiResponse<T>> {
  const headers: Record<string, string> = {}
  if (noStore) {
    headers['Cache-Control'] = 'no-store'
  }
  return NextResponse.json({ data }, { status, headers })
}

/**
 * Error response with message
 */
export function error(message: string, status = 400): NextResponse<ApiResponse> {
  return NextResponse.json({ error: message }, { status })
}

/**
 * 401 Unauthorized response
 */
export function unauthorized(): NextResponse<ApiResponse> {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

/**
 * 403 Forbidden response
 */
export function forbidden(): NextResponse<ApiResponse> {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

/**
 * 404 Not Found response
 */
export function notFound(message = 'Not found'): NextResponse<ApiResponse> {
  return NextResponse.json({ error: message }, { status: 404 })
}

/**
 * 409 Conflict response (e.g., duplicate submission)
 */
export function conflict(message: string): NextResponse<ApiResponse> {
  return NextResponse.json({ error: message }, { status: 409 })
}

/**
 * 429 Too Many Requests response
 */
export function rateLimit(
  message = 'Too many requests',
  retryAfter?: number
): NextResponse<ApiResponse> {
  const headers: Record<string, string> = {}
  if (retryAfter) {
    headers['Retry-After'] = String(retryAfter)
  }
  return NextResponse.json({ error: message }, { status: 429, headers })
}

/**
 * 500 Internal Server Error response
 * Logs the error to console (and Sentry if configured)
 * Never exposes stack trace to client
 */
export function serverError(error: unknown): NextResponse<ApiResponse> {
  // Log error for debugging
  console.error('Server error:', error)

  // Report to Sentry (if configured)
  // In production, you would use: Sentry.captureException(error)
  // if (typeof window !== 'undefined') {
  //   import('@sentry/nextjs').then((Sentry) => {
  //     Sentry.captureException(error)
  //   })
  // }

  // Never expose stack trace or internal details to client
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  )
}

/**
 * Helper to wrap async route handlers with error handling
 * Usage: export const POST = withErrorHandling(async (request) => { ... })
 */
export function withErrorHandling<T>(
  handler: (request: NextRequest, ...args: unknown[]) => Promise<NextResponse<T>>
) {
  return async (request: NextRequest, ...args: unknown[]): Promise<NextResponse<T | ApiResponse>> => {
    try {
      return await handler(request, ...args)
    } catch (err) {
      return serverError(err)
    }
  }
}
