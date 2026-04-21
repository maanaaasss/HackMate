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

    // Verify organiser of hackathon
    const { data: hackathon } = await supabase
      .from('hackathons')
      .select('organiser_id')
      .eq('id', id)
      .single()

    if (!hackathon || hackathon.organiser_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get all participants in this hackathon (through teams)
    const { data: teamMembers } = await supabase
      .from('team_members')
      .select(`
        user_id,
        teams!inner (
          hackathon_id
        ),
        profiles!inner (
          skills
        )
      `)
      .eq('teams.hackathon_id', id)

    if (!teamMembers) {
      return NextResponse.json([])
    }

    // Count skills
    const skillCounts: Record<string, number> = {}
    teamMembers.forEach(member => {
      const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles
      if (profile?.skills) {
        profile.skills.forEach((skill: string) => {
          skillCounts[skill] = (skillCounts[skill] || 0) + 1
        })
      }
    })

    // Convert to array and sort by count
    const skillArray = Object.entries(skillCounts)
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count)

    return NextResponse.json(skillArray)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}