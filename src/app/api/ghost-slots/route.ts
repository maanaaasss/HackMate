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
    const { team_id, skill_needed, description } = body

    if (!team_id || !skill_needed) {
      return NextResponse.json({ error: 'team_id and skill_needed are required' }, { status: 400 })
    }

    // Verify user is team lead
    const { data: team } = await supabase
      .from('teams')
      .select('team_lead_id')
      .eq('id', team_id)
      .single()

    if (!team || team.team_lead_id !== user.id) {
      return NextResponse.json({ error: 'Only team lead can create ghost slots' }, { status: 403 })
    }

    // Create ghost slot
    const { data: slot, error: slotError } = await supabase
      .from('ghost_slots')
      .insert({
        team_id,
        skill_needed,
        description,
        filled: false,
      })
      .select()
      .single()

    if (slotError) {
      console.error('Ghost slot creation error:', slotError)
      return NextResponse.json({ error: 'Failed to create ghost slot' }, { status: 500 })
    }

    return NextResponse.json(slot)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}