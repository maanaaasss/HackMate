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
      .select('id, invited_user_id, status')
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

    // Update invitation status
    const { error: updateError } = await supabase
      .from('team_invitations')
      .update({ status: 'declined' })
      .eq('id', invitationId)

    if (updateError) {
      console.error('Error declining invitation:', updateError)
      return NextResponse.json({ error: 'Failed to decline invitation' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Invitation declined' })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}