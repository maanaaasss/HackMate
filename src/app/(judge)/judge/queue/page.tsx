import { createClient } from '@/lib/supabase/server'
import PresentationQueueView from '@/components/judge/PresentationQueueView'
import { redirect } from 'next/navigation'
import { Team } from '@/types'

export default async function JudgeQueuePage() {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Verify judge role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'judge') {
    redirect('/unauthorized')
  }

  // Get active hackathon
  const { data: hackathon } = await supabase
    .from('hackathons')
    .select('id, name, status, presentation_order')
    .in('status', ['ongoing', 'judging'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!hackathon) {
    redirect('/judge')
  }

  // Get teams in presentation order
  let teams: Team[] = []
  if (hackathon.presentation_order && Array.isArray(hackathon.presentation_order) && hackathon.presentation_order.length > 0) {
    // Fetch teams in presentation order
    const { data: orderedTeams } = await supabase
      .from('teams')
      .select('id, name')
      .in('id', hackathon.presentation_order)
    
    // Sort by presentation_order
    if (orderedTeams) {
      teams = hackathon.presentation_order
        .map((teamId: string) => orderedTeams.find(t => t.id === teamId))
        .filter((team): team is Team => team !== undefined)
    }
  } else {
    // Fallback to teams sorted by created_at
    const { data: fallbackTeams } = await supabase
      .from('teams')
      .select('id, name, hackathon_id, team_lead_id, status, created_at')
      .eq('hackathon_id', hackathon.id)
      .order('created_at', { ascending: true })
    
    teams = (fallbackTeams as Team[]) || []
  }

  // Get blind mappings
  const { data: blindMappings } = await supabase
    .from('blind_mappings')
    .select('team_id, anonymous_name')
    .eq('hackathon_id', hackathon.id)

  // Get scores from non-final rounds for summary
  const { data: nonFinalRounds } = await supabase
    .from('judging_rounds')
    .select('id')
    .eq('hackathon_id', hackathon.id)
    .eq('is_final', false)

  const teamScores: Record<string, number> = {}
  if (nonFinalRounds && nonFinalRounds.length > 0) {
    const roundIds = nonFinalRounds.map(r => r.id)
    
    // Get all scores for these rounds
    const { data: allScores } = await supabase
      .from('scores')
      .select('team_id, value, rubric_items(weight)')
      .in('round_id', roundIds)

    if (allScores) {
      // Calculate weighted average per team
      const teamTotals: Record<string, { totalWeightedScore: number; totalWeight: number }> = {}
      
      allScores.forEach(score => {
        const rubricItem = Array.isArray(score.rubric_items) ? score.rubric_items[0] : score.rubric_items
        if (!rubricItem) return
        
        if (!teamTotals[score.team_id]) {
          teamTotals[score.team_id] = { totalWeightedScore: 0, totalWeight: 0 }
        }
        
        const weightedScore = (score.value / 100) * rubricItem.weight
        teamTotals[score.team_id].totalWeightedScore += weightedScore
        teamTotals[score.team_id].totalWeight += rubricItem.weight
      })

      // Convert to average out of 100
      Object.keys(teamTotals).forEach(teamId => {
        const { totalWeightedScore, totalWeight } = teamTotals[teamId]
        teamScores[teamId] = totalWeight > 0 ? (totalWeightedScore / totalWeight) * 100 : 0
      })
    }
  }

  // Transform teams with blind names and scores
  const transformedTeams = teams.map(team => {
    const blindMapping = blindMappings?.find(m => m.team_id === team.id)
    return {
      ...team,
      display_name: blindMapping?.anonymous_name || team.name,
      average_score: teamScores[team.id] || 0,
    }
  })

  return (
    <PresentationQueueView
      hackathon={hackathon}
      teams={transformedTeams}
    />
  )
}