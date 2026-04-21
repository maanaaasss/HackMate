import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const { id: teamId, userId: targetUserId } = await params
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is team lead
    const { data: team } = await supabase
      .from('teams')
      .select('team_lead_id, hackathon_id')
      .eq('id', teamId)
      .single()

    if (!team || team.team_lead_id !== user.id) {
      return NextResponse.json({ error: 'Only team lead can remove members' }, { status: 403 })
    }

    // Cannot remove yourself
    if (targetUserId === user.id) {
      return NextResponse.json({ error: 'Cannot remove yourself. Transfer leadership first.' }, { status: 400 })
    }

    // Remove member
    const { error: deleteError } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', targetUserId)

    if (deleteError) {
      console.error('Delete member error:', deleteError)
      return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}