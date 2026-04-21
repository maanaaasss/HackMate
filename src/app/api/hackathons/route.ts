import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { HackathonSchema } from '@/lib/validations'

export async function POST(request: NextRequest) {
  try {
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
      return NextResponse.json({ error: 'Only organisers can create hackathons' }, { status: 403 })
    }

    const body = await request.json()
    
    // Validate with Zod
    const result = HackathonSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten() },
        { status: 400 }
      )
    }

    const {
      name,
      description,
      venue,
      registration_deadline,
      start_time,
      end_time,
      submission_deadline,
      min_team_size,
      max_team_size,
      max_teams,
      status,
      judges = [],
      mentors = [],
    } = body

    // Insert hackathon
    const { data: hackathon, error: hackathonError } = await supabase
      .from('hackathons')
      .insert({
        name,
        description,
        venue,
        organiser_id: user.id,
        status: status || 'draft',
        registration_deadline: registration_deadline || null,
        start_time: start_time || null,
        end_time: end_time || null,
        submission_deadline: submission_deadline || null,
        min_team_size,
        max_team_size,
        max_teams: max_teams || null,
      })
      .select()
      .single()

    if (hackathonError) {
      console.error('Hackathon insert error:', hackathonError)
      return NextResponse.json({ error: 'Failed to create hackathon' }, { status: 500 })
    }

    const hackathonId = hackathon.id

    // Insert judges
    if (judges.length > 0) {
      const judgeInserts = judges.map((judgeId: string) => ({
        hackathon_id: hackathonId,
        judge_id: judgeId,
      }))

      const { error: judgesError } = await supabase
        .from('hackathon_judges')
        .insert(judgeInserts)

      if (judgesError) {
        console.error('Judges insert error:', judgesError)
        // Continue anyway, hackathon created
      }
    }

    // Insert mentors
    if (mentors.length > 0) {
      const mentorInserts = mentors.map((mentorId: string) => ({
        hackathon_id: hackathonId,
        mentor_id: mentorId,
      }))

      const { error: mentorsError } = await supabase
        .from('hackathon_mentors')
        .insert(mentorInserts)

      if (mentorsError) {
        console.error('Mentors insert error:', mentorsError)
        // Continue anyway
      }
    }

    // Auto-create timeline entries from date fields
    const timelineEntries = []
    
    if (registration_deadline) {
      timelineEntries.push({
        hackathon_id: hackathonId,
        title: 'Registration Deadline',
        description: 'Last chance to register for the hackathon',
        scheduled_at: registration_deadline,
        type: 'registration',
      })
    }
    
    if (start_time) {
      timelineEntries.push({
        hackathon_id: hackathonId,
        title: 'Hackathon Kickoff',
        description: 'Opening ceremony and team formation',
        scheduled_at: start_time,
        type: 'kickoff',
      })
    }
    
    if (end_time) {
      timelineEntries.push({
        hackathon_id: hackathonId,
        title: 'Hackathon Ends',
        description: 'Submission deadline and closing ceremony',
        scheduled_at: end_time,
        type: 'final_presentation',
      })
    }

    if (timelineEntries.length > 0) {
      const { error: timelineError } = await supabase
        .from('hackathon_timeline')
        .insert(timelineEntries)

      if (timelineError) {
        console.error('Timeline insert error:', timelineError)
        // Continue anyway
      }
    }

    return NextResponse.json(hackathon)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}