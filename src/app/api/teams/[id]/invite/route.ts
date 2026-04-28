import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teamId } = await params
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is team lead
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, team_lead_id, hackathon_id')
      .eq('id', teamId)
      .single()

    if (teamError || !team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    if (team.team_lead_id !== user.id) {
      return NextResponse.json({ error: 'Only team lead can invite members' }, { status: 403 })
    }

    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Find user by email
    const { data: invitedUser, error: userLookupError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('email', email.toLowerCase())
      .single()

    if (userLookupError || !invitedUser) {
      return NextResponse.json({ error: 'User not found with this email' }, { status: 404 })
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', teamId)
      .eq('user_id', invitedUser.id)
      .single()

    if (existingMember) {
      return NextResponse.json({ error: 'User is already a member of this team' }, { status: 400 })
    }

    // Check if user is registered for this hackathon
    const { data: registration } = await supabase
      .from('hackathon_registrations')
      .select('id')
      .eq('hackathon_id', team.hackathon_id)
      .eq('user_id', invitedUser.id)
      .eq('status', 'registered')
      .single()

    if (!registration) {
      return NextResponse.json({ error: 'User is not registered for this hackathon' }, { status: 400 })
    }

    // Check if there's already a pending invitation
    const { data: existingInvite } = await supabase
      .from('team_invitations')
      .select('id')
      .eq('team_id', teamId)
      .eq('invited_user_id', invitedUser.id)
      .eq('status', 'pending')
      .single()

    if (existingInvite) {
      return NextResponse.json({ error: 'Invitation already sent to this user' }, { status: 400 })
    }

    // Check team size limit
    const { count: memberCount } = await supabase
      .from('team_members')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId)

    const { data: hackathon } = await supabase
      .from('hackathons')
      .select('max_team_size')
      .eq('id', team.hackathon_id)
      .single()

    if (hackathon && memberCount && memberCount >= hackathon.max_team_size) {
      return NextResponse.json({ error: 'Team is already at maximum capacity' }, { status: 400 })
    }

    // Create invitation
    const { error: inviteError } = await supabase
      .from('team_invitations')
      .insert({
        team_id: teamId,
        invited_by: user.id,
        invited_user_id: invitedUser.id,
        status: 'pending',
      })

    if (inviteError) {
      console.error('Invitation error:', inviteError)
      return NextResponse.json({ error: 'Failed to send invitation' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: `Invitation sent to ${invitedUser.full_name}`,
      invitedUser: {
        id: invitedUser.id,
        full_name: invitedUser.full_name,
        email: invitedUser.email,
      }
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}