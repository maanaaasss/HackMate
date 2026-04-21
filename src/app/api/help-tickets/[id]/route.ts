import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
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

    const body = await request.json()
    const { status, claimed_by } = body

    if (!status) {
      return NextResponse.json({ error: 'status is required' }, { status: 400 })
    }

    // Get ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('help_tickets')
      .select('*')
      .eq('id', id)
      .single()

    if (ticketError || !ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Verify user is mentor for claim/resolve
    if (status === 'claimed' || status === 'resolved') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!profile || profile.role !== 'mentor') {
        return NextResponse.json({ error: 'Only mentors can claim/resolve tickets' }, { status: 403 })
      }
    }

    // For claiming, verify ticket is still open
    if (status === 'claimed' && ticket.status !== 'open') {
      return NextResponse.json({ error: 'Ticket is no longer open' }, { status: 400 })
    }

    // For resolving, verify ticket is claimed by current user
    if (status === 'resolved' && ticket.claimed_by !== user.id) {
      return NextResponse.json({ error: 'You can only resolve tickets you have claimed' }, { status: 403 })
    }

    // Update ticket
    const updateData: { status: string, claimed_by?: string, resolved_at?: string } = { status }
    if (status === 'claimed') {
      updateData.claimed_by = claimed_by || user.id
    } else if (status === 'resolved') {
      updateData.resolved_at = new Date().toISOString()
    }

    const { data: updatedTicket, error: updateError } = await supabase
      .from('help_tickets')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Ticket update error:', updateError)
      return NextResponse.json({ error: 'Failed to update ticket' }, { status: 500 })
    }

    return NextResponse.json(updatedTicket)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}