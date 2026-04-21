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

    // Verify organiser
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'organiser') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { action } = body

    if (!action) {
      return NextResponse.json({ error: 'action is required' }, { status: 400 })
    }

    // Get round to verify it belongs to organiser's hackathon
    const { data: round } = await supabase
      .from('judging_rounds')
      .select('hackathon_id, opened_at, closed_at')
      .eq('id', id)
      .single()

    if (!round) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 })
    }

    // Verify organiser of hackathon
    const { data: hackathon } = await supabase
      .from('hackathons')
      .select('organiser_id')
      .eq('id', round.hackathon_id)
      .single()

    if (!hackathon || hackathon.organiser_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let updateData: { opened_at?: string, closed_at?: string } = {}

    switch (action) {
      case 'open':
        if (round.opened_at) {
          return NextResponse.json({ error: 'Round is already open' }, { status: 400 })
        }
        updateData = { opened_at: new Date().toISOString() }
        break

      case 'close':
        if (!round.opened_at) {
          return NextResponse.json({ error: 'Round is not open' }, { status: 400 })
        }
        if (round.closed_at) {
          return NextResponse.json({ error: 'Round is already closed' }, { status: 400 })
        }
        updateData = { closed_at: new Date().toISOString() }
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const { data: updatedRound, error: updateError } = await supabase
      .from('judging_rounds')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Round update error:', updateError)
      return NextResponse.json({ error: 'Failed to update round' }, { status: 500 })
    }

    return NextResponse.json(updatedRound)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}