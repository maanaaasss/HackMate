import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get submission
    const { data: submission, error: submissionError } = await supabase
      .from('submissions')
      .select('*')
      .eq('id', id)
      .single()

    if (submissionError || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    // Verify user is member of the team
    const { data: teamMember } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('team_id', submission.team_id)
      .eq('user_id', user.id)
      .single()

    if (!teamMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Set health_status to 'checking'
    const { error: updateError } = await supabase
      .from('submissions')
      .update({
        health_status: 'checking',
        last_checked_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      console.error('Update health_status error:', updateError)
      return NextResponse.json({ error: 'Failed to start health check' }, { status: 500 })
    }

    // Start async health check (do NOT await)
    Promise.resolve().then(async () => {
      try {
        // Ping GitHub URL
        let githubHealthy = false
        try {
          const githubResponse = await fetch(submission.github_url, {
            method: 'HEAD',
            signal: AbortSignal.timeout(5000),
          })
          githubHealthy = githubResponse.ok
        } catch {
          githubHealthy = false
        }

        // Ping Live URL if provided
        let liveUrlHealthy: boolean | null = null
        if (submission.live_url) {
          try {
            const liveResponse = await fetch(submission.live_url, {
              method: 'HEAD',
              signal: AbortSignal.timeout(5000),
            })
            liveUrlHealthy = liveResponse.ok
          } catch {
            liveUrlHealthy = false
          }
        }

        // Determine overall health status
        const overallHealthy = githubHealthy && (liveUrlHealthy === null || liveUrlHealthy === true)

        // Update submission with results
        await supabase
          .from('submissions')
          .update({
            health_status: overallHealthy ? 'healthy' : 'broken',
            github_healthy: githubHealthy,
            live_url_healthy: liveUrlHealthy,
            last_checked_at: new Date().toISOString(),
          })
          .eq('id', id)

      } catch (error) {
        console.error('Health check error:', error)
        // Mark as broken on error
        await supabase
          .from('submissions')
          .update({
            health_status: 'broken',
            github_healthy: false,
            live_url_healthy: submission.live_url ? false : null,
            last_checked_at: new Date().toISOString(),
          })
          .eq('id', id)
      }
    })

    return NextResponse.json({ message: 'Health check started' }, { status: 202 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}