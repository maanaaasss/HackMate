import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: hackathonId } = await params
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user has participant role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || profile?.role !== 'participant') {
      return NextResponse.json({ error: 'Only participants can register for hackathons' }, { status: 403 })
    }

    // Check if hackathon exists and registration is open
    const { data: hackathon, error: hackathonError } = await supabase
      .from('hackathons')
      .select('id, status, registration_deadline')
      .eq('id', hackathonId)
      .single()

    if (hackathonError || !hackathon) {
      return NextResponse.json({ error: 'Hackathon not found' }, { status: 404 })
    }

    if (hackathon.status !== 'registration_open') {
      return NextResponse.json({ error: 'Registration is not open for this hackathon' }, { status: 400 })
    }

    // Check registration deadline
    if (hackathon.registration_deadline && new Date(hackathon.registration_deadline) < new Date()) {
      return NextResponse.json({ error: 'Registration deadline has passed' }, { status: 400 })
    }

    // Check if already registered
    const { data: existingRegistration, error: existingError } = await supabase
      .from('hackathon_registrations')
      .select('id, status')
      .eq('hackathon_id', hackathonId)
      .eq('user_id', user.id)
      .single()

    if (existingRegistration) {
      if (existingRegistration.status === 'registered') {
        return NextResponse.json({ error: 'Already registered for this hackathon' }, { status: 400 })
      }
      
      // Re-register if previously cancelled
      const { error: updateError } = await supabase
        .from('hackathon_registrations')
        .update({
          status: 'registered',
          registered_at: new Date().toISOString(),
        })
        .eq('id', existingRegistration.id)

      if (updateError) {
        console.error('Registration update error:', updateError)
        return NextResponse.json({ error: 'Failed to register' }, { status: 500 })
      }

      return NextResponse.json({ message: 'Successfully registered for hackathon' })
    }

    // Create registration
    const { error: insertError } = await supabase
      .from('hackathon_registrations')
      .insert({
        hackathon_id: hackathonId,
        user_id: user.id,
        status: 'registered',
      })

    if (insertError) {
      console.error('Registration insert error:', insertError)
      return NextResponse.json({ error: 'Failed to register' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Successfully registered for hackathon' })
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
    const { id: hackathonId } = await params
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if registration exists
    const { data: registration, error: registrationError } = await supabase
      .from('hackathon_registrations')
      .select('id')
      .eq('hackathon_id', hackathonId)
      .eq('user_id', user.id)
      .eq('status', 'registered')
      .single()

    if (registrationError || !registration) {
      return NextResponse.json({ error: 'Not registered for this hackathon' }, { status: 404 })
    }

    // Update registration status to cancelled
    const { error: updateError } = await supabase
      .from('hackathon_registrations')
      .update({
        status: 'cancelled',
      })
      .eq('id', registration.id)

    if (updateError) {
      console.error('Registration update error:', updateError)
      return NextResponse.json({ error: 'Failed to unregister' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Successfully unregistered from hackathon' })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}