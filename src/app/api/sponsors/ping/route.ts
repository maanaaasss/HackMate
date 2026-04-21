import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const MAX_PINGS = 3

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { sponsor_id, message } = body

    if (!sponsor_id || !message) {
      return NextResponse.json({ error: 'sponsor_id and message are required' }, { status: 400 })
    }

    if (message.length > 200) {
      return NextResponse.json({ error: 'Message must be 200 characters or less' }, { status: 400 })
    }

    // Get sponsor record
    const { data: sponsor, error: sponsorError } = await supabase
      .from('sponsors')
      .select('*')
      .eq('id', sponsor_id)
      .single()

    if (sponsorError || !sponsor) {
      return NextResponse.json({ error: 'Sponsor not found' }, { status: 404 })
    }

    // Verify user is the sponsor or an organiser
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isSponsor = sponsor.user_id === user.id
    const isOrganiser = profile?.role === 'organiser'

    if (!isSponsor && !isOrganiser) {
      return NextResponse.json({ error: 'Only sponsors and organisers can send pings' }, { status: 403 })
    }

    // Check ping count
    const { count: pingCount, error: countError } = await supabase
      .from('sponsor_pings')
      .select('*', { count: 'exact', head: true })
      .eq('sponsor_id', sponsor_id)
      .eq('hackathon_id', sponsor.hackathon_id)

    if (countError) {
      console.error('Ping count error:', countError)
      return NextResponse.json({ error: 'Failed to check ping count' }, { status: 500 })
    }

    if ((pingCount || 0) >= MAX_PINGS) {
      return NextResponse.json({ error: 'You have used all 3 pings for this hackathon' }, { status: 429 })
    }

    // Create ping record
    const { data: ping, error: pingError } = await supabase
      .from('sponsor_pings')
      .insert({
        sponsor_id,
        hackathon_id: sponsor.hackathon_id,
        message,
      })
      .select()
      .single()

    if (pingError) {
      console.error('Ping creation error:', pingError)
      return NextResponse.json({ error: 'Failed to create ping' }, { status: 500 })
    }

    // Create announcement
    const { error: announcementError } = await supabase
      .from('announcements')
      .insert({
        hackathon_id: sponsor.hackathon_id,
        title: `Message from ${sponsor.name}`,
        message,
        channel: 'website',
      })

    if (announcementError) {
      console.error('Announcement creation error:', announcementError)
      // Don't fail the request if announcement creation fails
    }

    return NextResponse.json(ping)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
