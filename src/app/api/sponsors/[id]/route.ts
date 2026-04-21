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
    const { prize_description } = body

    if (prize_description === undefined) {
      return NextResponse.json({ error: 'prize_description is required' }, { status: 400 })
    }

    // Get sponsor record
    const { data: sponsor, error: sponsorError } = await supabase
      .from('sponsors')
      .select('*')
      .eq('id', id)
      .single()

    if (sponsorError || !sponsor) {
      return NextResponse.json({ error: 'Sponsor not found' }, { status: 404 })
    }

    // Verify user owns this sponsor record
    if (sponsor.user_id !== user.id) {
      return NextResponse.json({ error: 'You can only update your own sponsor record' }, { status: 403 })
    }

    // Update sponsor prize description
    const { data: updatedSponsor, error: updateError } = await supabase
      .from('sponsors')
      .update({ prize_description })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Sponsor update error:', updateError)
      return NextResponse.json({ error: 'Failed to update sponsor' }, { status: 500 })
    }

    return NextResponse.json(updatedSponsor)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
