import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
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

    // Get hackathon
    const { data: hackathon, error: hackathonError } = await supabase
      .from('hackathons')
      .select('*')
      .eq('id', id)
      .single()

    if (hackathonError || !hackathon) {
      return NextResponse.json({ error: 'Hackathon not found' }, { status: 404 })
    }

    // Verify organiser role and ownership
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || profile?.role !== 'organiser' || hackathon.organiser_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    return NextResponse.json(hackathon)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
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

    // Verify organiser role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || profile?.role !== 'organiser') {
      return NextResponse.json({ error: 'Only organisers can update hackathons' }, { status: 403 })
    }

    // Verify hackathon ownership
    const { data: existingHackathon, error: existingError } = await supabase
      .from('hackathons')
      .select('organiser_id')
      .eq('id', id)
      .single()

    if (existingError || !existingHackathon) {
      return NextResponse.json({ error: 'Hackathon not found' }, { status: 404 })
    }

    if (existingHackathon.organiser_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()

    // Update hackathon
    const { data: hackathon, error: hackathonError } = await supabase
      .from('hackathons')
      .update({
        name: body.name,
        description: body.description,
        venue: body.venue,
        status: body.status,
        registration_deadline: body.registration_deadline || null,
        start_time: body.start_time || null,
        end_time: body.end_time || null,
        submission_deadline: body.submission_deadline || null,
        min_team_size: body.min_team_size,
        max_team_size: body.max_team_size,
        max_teams: body.max_teams || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (hackathonError) {
      console.error('Hackathon update error:', hackathonError)
      return NextResponse.json({ error: 'Failed to update hackathon' }, { status: 500 })
    }

    return NextResponse.json(hackathon)
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

    // Verify organiser role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || profile?.role !== 'organiser') {
      return NextResponse.json({ error: 'Only organisers can delete hackathons' }, { status: 403 })
    }

    // Verify hackathon ownership and status
    const { data: existingHackathon, error: existingError } = await supabase
      .from('hackathons')
      .select('organiser_id, status')
      .eq('id', id)
      .single()

    if (existingError || !existingHackathon) {
      return NextResponse.json({ error: 'Hackathon not found' }, { status: 404 })
    }

    if (existingHackathon.organiser_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Only allow deletion of draft hackathons
    if (existingHackathon.status !== 'draft') {
      return NextResponse.json({ error: 'Only draft hackathons can be deleted' }, { status: 400 })
    }

    // Delete hackathon
    const { error: deleteError } = await supabase
      .from('hackathons')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Hackathon deletion error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete hackathon' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Hackathon deleted successfully' })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}