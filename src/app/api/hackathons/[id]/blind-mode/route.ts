import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
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

    // Verify organiser of hackathon
    const { data: hackathon } = await supabase
      .from('hackathons')
      .select('organiser_id')
      .eq('id', id)
      .single()

    if (!hackathon || hackathon.organiser_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get all teams for this hackathon
    const { data: teams } = await supabase
      .from('teams')
      .select('id, name')
      .eq('hackathon_id', id)

    if (!teams || teams.length === 0) {
      return NextResponse.json({ error: 'No teams found for this hackathon' }, { status: 400 })
    }

    // Delete existing blind mappings for this hackathon
    await supabase
      .from('blind_mappings')
      .delete()
      .eq('hackathon_id', id)

    // Generate anonymous names
    const adjectives = [
      'Quantum', 'Cosmic', 'Solar', 'Stellar', 'Galactic', 'Nebula', 'Photon',
      'Lunar', 'Atomic', 'Binary', 'Digital', 'Neural', 'Cyber', 'Radiant', 'Sonic'
    ]
    const nouns = [
      'Pulsar', 'Nebula', 'Quasar', 'Vortex', 'Prism', 'Cipher', 'Vector', 'Matrix',
      'Comet', 'Orbit', 'Pixel', 'Signal', 'Axiom', 'Beacon', 'Zenith'
    ]

    const usedNames = new Set<string>()
    const blindMappings = teams.map(team => {
      let anonymousName: string
      do {
        const adjective = adjectives[Math.floor(Math.random() * adjectives.length)]
        const noun = nouns[Math.floor(Math.random() * nouns.length)]
        anonymousName = `${adjective} ${noun}`
      } while (usedNames.has(anonymousName))
      
      usedNames.add(anonymousName)
      
      return {
        hackathon_id: id,
        team_id: team.id,
        anonymous_name: anonymousName,
      }
    })

    // Insert blind mappings
    const { error: insertError } = await supabase
      .from('blind_mappings')
      .insert(blindMappings)

    if (insertError) {
      console.error('Blind mappings insert error:', insertError)
      return NextResponse.json({ error: 'Failed to create blind mappings' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Blind mode enabled',
      mappings_count: blindMappings.length 
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
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

    // Verify organiser of hackathon
    const { data: hackathon } = await supabase
      .from('hackathons')
      .select('organiser_id')
      .eq('id', id)
      .single()

    if (!hackathon || hackathon.organiser_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete all blind mappings for this hackathon
    const { error: deleteError } = await supabase
      .from('blind_mappings')
      .delete()
      .eq('hackathon_id', id)

    if (deleteError) {
      console.error('Blind mappings delete error:', deleteError)
      return NextResponse.json({ error: 'Failed to disable blind mode' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Blind mode disabled' })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}