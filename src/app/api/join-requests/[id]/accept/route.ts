import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: requestId } = await params
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get join request
    const { data: joinRequest } = await supabase
      .from('join_requests')
      .select('id, team_id, user_id, ghost_slot_id, status')
      .eq('id', requestId)
      .eq('status', 'pending')
      .single()

    if (!joinRequest) {
      return NextResponse.json({ error: 'Join request not found or already processed' }, { status: 404 })
    }

    // Verify user is team lead
    const { data: team } = await supabase
      .from('teams')
      .select('team_lead_id, hackathon_id, name')
      .eq('id', joinRequest.team_id)
      .single()

    if (!team || team.team_lead_id !== user.id) {
      return NextResponse.json({ error: 'Only team lead can accept join requests' }, { status: 403 })
    }

    // Check if user is already in a team for this hackathon
    const { data: existingMember } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', joinRequest.user_id)
      .single()

    if (existingMember) {
      return NextResponse.json({ error: 'User is already in a team' }, { status: 400 })
    }

    // Add user to team
    const { error: memberError } = await supabase
      .from('team_members')
      .insert({
        team_id: joinRequest.team_id,
        user_id: joinRequest.user_id,
        role: 'member',
      })

    if (memberError) {
      console.error('Add member error:', memberError)
      return NextResponse.json({ error: 'Failed to add member to team' }, { status: 500 })
    }

    // Update join request status
    const { error: updateError } = await supabase
      .from('join_requests')
      .update({ status: 'accepted' })
      .eq('id', requestId)

    if (updateError) {
      console.error('Update join request error:', updateError)
      // Continue anyway, member added
    }

    // If ghost_slot_id exists, mark it as filled
    if (joinRequest.ghost_slot_id) {
      const { error: slotError } = await supabase
        .from('ghost_slots')
        .update({ filled: true })
        .eq('id', joinRequest.ghost_slot_id)

      if (slotError) {
        console.error('Update ghost slot error:', slotError)
        // Continue anyway
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}