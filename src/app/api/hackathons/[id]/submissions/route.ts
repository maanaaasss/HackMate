import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
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

    // Verify organiser of hackathon
    const { data: hackathon } = await supabase
      .from('hackathons')
      .select('organiser_id')
      .eq('id', id)
      .single()

    if (!hackathon || hackathon.organiser_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get submissions with team info
    const { data: submissions, error: submissionsError } = await supabase
      .from('submissions')
      .select(`
        id,
        team_id,
        github_url,
        live_url,
        description,
        submitted_at,
        health_status,
        github_healthy,
        live_url_healthy,
        teams (
          id,
          name
        )
      `)
      .eq('hackathon_id', id)
      .order('submitted_at', { ascending: false })

    if (submissionsError) {
      console.error('Submissions fetch error:', submissionsError)
      return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 })
    }

    // Transform submissions
    const transformedSubmissions = submissions?.map(sub => ({
      ...sub,
      teams: Array.isArray(sub.teams) ? sub.teams[0] : sub.teams,
    })) || []

    return NextResponse.json(transformedSubmissions)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}