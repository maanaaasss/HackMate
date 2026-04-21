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
      .select('id, team_id, status')
      .eq('id', requestId)
      .eq('status', 'pending')
      .single()

    if (!joinRequest) {
      return NextResponse.json({ error: 'Join request not found or already processed' }, { status: 404 })
    }

    // Verify user is team lead
    const { data: team } = await supabase
      .from('teams')
      .select('team_lead_id')
      .eq('id', joinRequest.team_id)
      .single()

    if (!team || team.team_lead_id !== user.id) {
      return NextResponse.json({ error: 'Only team lead can decline join requests' }, { status: 403 })
    }

    // Update join request status
    const { error: updateError } = await supabase
      .from('join_requests')
      .update({ status: 'rejected' })
      .eq('id', requestId)

    if (updateError) {
      console.error('Update join request error:', updateError)
      return NextResponse.json({ error: 'Failed to decline join request' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}