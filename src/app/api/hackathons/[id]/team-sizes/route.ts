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

    // Get teams with member counts
    const { data: teams } = await supabase
      .from('teams')
      .select(`
        id,
        team_members (
          user_id
        )
      `)
      .eq('hackathon_id', id)

    if (!teams) {
      return NextResponse.json([])
    }

    // Count team sizes
    const sizeCounts: Record<number, number> = {}
    teams.forEach(team => {
      const memberCount = team.team_members?.length || 0
      sizeCounts[memberCount] = (sizeCounts[memberCount] || 0) + 1
    })

    // Convert to array and sort by size
    const sizeArray = Object.entries(sizeCounts)
      .map(([size, count]) => ({ size: parseInt(size), count }))
      .sort((a, b) => a.size - b.size)

    return NextResponse.json(sizeArray)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}