import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ invitationId: string }> }
) {
  try {
    const { invitationId } = await params
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('team_invitations')
      .select('id, team_id, invited_user_id, status')
      .eq('id', invitationId)
      .single()

    if (inviteError || !invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }

    // Verify user is the invited user
    if (invitation.invited_user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Verify invitation is pending
    if (invitation.status !== 'pending') {
      return NextResponse.json({ error: 'Invitation is no longer valid' }, { status: 400 })
    }

    // Check if user is already in a team for this hackathon
    const { data: team } = await supabase
      .from('teams')
      .select('hackathon_id')
      .eq('id', invitation.team_id)
      .single()

    if (team) {
      const { data: existingMembership } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .eq('teams.hackathon_id', team.hackathon_id)
        .single()

      if (existingMembership) {
        return NextResponse.json({ error: 'You are already in a team for this hackathon' }, { status: 400 })
      }
    }

    // Add user to team
    const { error: memberError } = await supabase
      .from('team_members')
      .insert({
        team_id: invitation.team_id,
        user_id: user.id,
        role: 'member',
      })

    if (memberError) {
      console.error('Error adding team member:', memberError)
      return NextResponse.json({ error: 'Failed to join team' }, { status: 500 })
    }

    // Update invitation status
    await supabase
      .from('team_invitations')
      .update({ status: 'accepted' })
      .eq('id', invitationId)

    // Get team details for response
    const { data: teamDetails } = await supabase
      .from('teams')
      .select('id, name')
      .eq('id', invitation.team_id)
      .single()

    return NextResponse.json({ 
      message: 'Invitation accepted!',
      team: teamDetails,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}