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

    // Get total teams
    const { count: totalTeams } = await supabase
      .from('teams')
      .select('*', { count: 'exact', head: true })
      .eq('hackathon_id', id)

    // Get checked in count (from attendance_records)
    const { count: checkedInCount } = await supabase
      .from('attendance_records')
      .select('*', { count: 'exact', head: true })
      .eq('hackathon_id', id)

    // Get submissions count
    const { count: submissionsCount } = await supabase
      .from('submissions')
      .select('*', { count: 'exact', head: true })
      .eq('hackathon_id', id)

    // Get open tickets count
    const { count: openTicketsCount } = await supabase
      .from('help_tickets')
      .select('*', { count: 'exact', head: true })
      .eq('hackathon_id', id)
      .in('status', ['open', 'claimed'])

    return NextResponse.json(
      {
        total_teams: totalTeams || 0,
        checked_in_count: checkedInCount || 0,
        submissions_count: submissionsCount || 0,
        open_tickets_count: openTicketsCount || 0,
      },
      {
        headers: {
          'Cache-Control': 's-maxage=60, stale-while-revalidate=120',
        },
      }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}