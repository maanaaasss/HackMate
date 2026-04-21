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
    const { hackathon_id, round_number, label, is_final } = body

    if (!hackathon_id || !round_number || !label) {
      return NextResponse.json({ error: 'hackathon_id, round_number, and label are required' }, { status: 400 })
    }

    // Verify organiser of hackathon
    const { data: hackathon } = await supabase
      .from('hackathons')
      .select('organiser_id')
      .eq('id', hackathon_id)
      .single()

    if (!hackathon || hackathon.organiser_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Create round
    const { data: round, error: insertError } = await supabase
      .from('judging_rounds')
      .insert({
        hackathon_id,
        round_number,
        label,
        is_final: is_final || false,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Round creation error:', insertError)
      return NextResponse.json({ error: 'Failed to create round' }, { status: 500 })
    }

    return NextResponse.json(round)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}