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

    // Verify organiser of hackathon
    const { data: hackathon } = await supabase
      .from('hackathons')
      .select('organiser_id, submission_deadline, end_time')
      .eq('id', id)
      .single()

    if (!hackathon || hackathon.organiser_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { action, minutes } = body

    if (!action) {
      return NextResponse.json({ error: 'action is required' }, { status: 400 })
    }

    switch (action) {
      case 'lock_submissions': {
        // Set submission deadline to now (effectively locking submissions)
        const { error } = await supabase
          .from('hackathons')
          .update({
            submission_deadline: new Date().toISOString(),
          })
          .eq('id', id)

        if (error) {
          console.error('Lock submissions error:', error)
          return NextResponse.json({ error: 'Failed to lock submissions' }, { status: 500 })
        }

        return NextResponse.json({ message: 'Submissions locked successfully' })
      }

      case 'extend_deadline': {
        if (!minutes || typeof minutes !== 'number' || minutes <= 0) {
          return NextResponse.json({ error: 'Valid minutes required' }, { status: 400 })
        }

        const currentDeadline = hackathon.submission_deadline || hackathon.end_time
        if (!currentDeadline) {
          return NextResponse.json({ error: 'No deadline to extend' }, { status: 400 })
        }

        const newDeadline = new Date(currentDeadline)
        newDeadline.setMinutes(newDeadline.getMinutes() + minutes)

        const { error } = await supabase
          .from('hackathons')
          .update({
            submission_deadline: newDeadline.toISOString(),
          })
          .eq('id', id)

        if (error) {
          console.error('Extend deadline error:', error)
          return NextResponse.json({ error: 'Failed to extend deadline' }, { status: 500 })
        }

        return NextResponse.json({ 
          message: `Deadline extended by ${minutes} minutes`,
          new_deadline: newDeadline.toISOString()
        })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}