/**
 * Keep-alive endpoint for Vercel cron job.
 * Prevents cold starts by pinging every 14 minutes.
 */

export async function GET() {
  return Response.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'hackmate',
  })
}

// Use edge runtime for faster cold starts
export const runtime = 'edge'
