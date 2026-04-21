import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, hackathon_id } = body

    if (!name || !hackathon_id) {
      return NextResponse.json({ error: 'Name and hackathon_id are required' }, { status: 400 })
    }

    // Verify user is participant
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'participant') {
      return NextResponse.json({ error: 'Only participants can create teams' }, { status: 403 })
    }

    // Verify hackathon exists and is open
    const { data: hackathon } = await supabase
      .from('hackathons')
      .select('id, status')
      .eq('id', hackathon_id)
      .single()

    if (!hackathon || !['registration_open', 'ongoing'].includes(hackathon.status)) {
      return NextResponse.json({ error: 'Hackathon is not open for registration' }, { status: 400 })
    }

    // Check if user is already in a team for this hackathon
    const { data: existingTeam } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', user.id)
      .single()

    if (existingTeam) {
      return NextResponse.json({ error: 'You are already in a team for this hackathon' }, { status: 400 })
    }

    // Create team
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert({
        name,
        description,
        hackathon_id,
        team_lead_id: user.id,
        status: 'forming',
      })
      .select()
      .single()

    if (teamError) {
      console.error('Team creation error:', teamError)
      return NextResponse.json({ error: 'Failed to create team' }, { status: 500 })
    }

    // Add creator as team lead
    const { error: memberError } = await supabase
      .from('team_members')
      .insert({
        team_id: team.id,
        user_id: user.id,
        role: 'lead',
      })

    if (memberError) {
      console.error('Team member creation error:', memberError)
      // Continue anyway, team created
    }

    return NextResponse.json(team)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}