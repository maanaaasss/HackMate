export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import EvaluationInterface from '@/components/judge/EvaluationInterface'
import { redirect } from 'next/navigation'

export default async function EvaluatePage({
  params,
}: {
  params: { teamId: string }
}) {
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
    .select('id, name, status')
    .in('status', ['ongoing', 'judging'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!hackathon) {
    redirect('/judge')
  }

  // Get active judging round
  const { data: activeRound } = await supabase
    .from('judging_rounds')
    .select('*')
    .eq('hackathon_id', hackathon.id)
    .is('closed_at', null)
    .not('opened_at', 'is', null)
    .order('round_number', { ascending: true })
    .limit(1)
    .single()

  if (!activeRound) {
    redirect('/judge')
  }

  // Get team
  const { data: team } = await supabase
    .from('teams')
    .select('id, name, hackathon_id')
    .eq('id', params.teamId)
    .eq('hackathon_id', hackathon.id)
    .single()

  if (!team) {
    redirect('/judge')
  }

  // Get team submission
  const { data: submission } = await supabase
    .from('submissions')
    .select('*')
    .eq('team_id', team.id)
    .eq('hackathon_id', hackathon.id)
    .single()

  // Get rubric items
  const { data: rubric } = await supabase
    .from('rubrics')
    .select(`
      id,
      rubric_items (
        id,
        label,
        description,
        max_score,
        weight,
        sort_order
      )
    `)
    .eq('hackathon_id', hackathon.id)
    .single()

  const rubricItems = rubric?.rubric_items?.sort((a, b) => a.sort_order - b.sort_order) || []

  // Get existing scores by this judge for this round and team
  const { data: existingScores } = await supabase
    .from('scores')
    .select('*')
    .eq('judge_id', user.id)
    .eq('round_id', activeRound.id)
    .eq('team_id', team.id)

  // Get blind mapping for this team
  const { data: blindMapping } = await supabase
    .from('blind_mappings')
    .select('anonymous_name')
    .eq('hackathon_id', hackathon.id)
    .eq('team_id', team.id)
    .single()

  // Get all teams for navigation
  const { data: allTeams } = await supabase
    .from('teams')
    .select('id, name')
    .eq('hackathon_id', hackathon.id)
    .order('name', { ascending: true })

  const teamIndex = allTeams?.findIndex(t => t.id === team.id) || 0
  const previousTeam = teamIndex > 0 ? allTeams?.[teamIndex - 1] : null
  const nextTeam = teamIndex < (allTeams?.length || 0) - 1 ? allTeams?.[teamIndex + 1] : null

  return (
    <EvaluationInterface
      hackathon={hackathon}
      activeRound={activeRound}
      team={team}
      submission={submission}
      rubricItems={rubricItems}
      existingScores={existingScores || []}
      blindMapping={blindMapping}
      previousTeam={previousTeam}
      nextTeam={nextTeam}
      judgeId={user.id}
    />
  )
}