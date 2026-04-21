import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: slotId } = await params
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get slot
    const { data: slot } = await supabase
      .from('ghost_slots')
      .select('id, team_id, filled')
      .eq('id', slotId)
      .single()

    if (!slot) {
      return NextResponse.json({ error: 'Ghost slot not found' }, { status: 404 })
    }

    if (slot.filled) {
      return NextResponse.json({ error: 'Cannot delete a filled slot' }, { status: 400 })
    }

    // Verify team lead
    const { data: team } = await supabase
      .from('teams')
      .select('team_lead_id')
      .eq('id', slot.team_id)
      .single()

    if (!team || team.team_lead_id !== user.id) {
      return NextResponse.json({ error: 'Only team lead can delete ghost slots' }, { status: 403 })
    }

    // Delete slot
    const { error: deleteError } = await supabase
      .from('ghost_slots')
      .delete()
      .eq('id', slotId)

    if (deleteError) {
      console.error('Delete ghost slot error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete ghost slot' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}