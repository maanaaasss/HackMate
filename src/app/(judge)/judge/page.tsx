import { createClient } from '@/lib/supabase/server'
import JudgeDashboardView from '@/components/judge/JudgeDashboardView'
import { redirect } from 'next/navigation'

export default async function JudgePage() {
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
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No Active Hackathon</h1>
          <p className="text-gray-600">There&apos;s no hackathon currently active for judging.</p>
        </div>
      </div>
    )
  }

  // Get open judging rounds for this hackathon
  const { data: rounds } = await supabase
    .from('judging_rounds')
    .select('*')
    .eq('hackathon_id', hackathon.id)
    .is('closed_at', null)
    .not('opened_at', 'is', null)
    .order('round_number', { ascending: true })

  const activeRound = rounds && rounds.length > 0 ? rounds[0] : null

  // Get all teams, scored teams, and blind mappings in parallel
  const [{ data: allTeams }, scoredTeamsResult, { data: blindMappings }] = await Promise.all([
    supabase
      .from('teams')
      .select('id, name')
      .eq('hackathon_id', hackathon.id),
    
    activeRound ? supabase
      .from('scores')
      .select('team_id')
      .eq('judge_id', user.id)
      .eq('round_id', activeRound.id) : Promise.resolve({ data: [] }),
    
    supabase
      .from('blind_mappings')
      .select('team_id, anonymous_name')
      .eq('hackathon_id', hackathon.id),
  ])

  // Get unique team_ids from scored teams
  const scoredTeams = scoredTeamsResult?.data 
    ? Array.from(new Set(scoredTeamsResult.data.map(score => score.team_id)))
    : []

  // Transform teams to include blind names and scored status
  const teamsWithStatus = allTeams?.map(team => {
    const blindMapping = blindMappings?.find(mapping => mapping.team_id === team.id)
    return {
      ...team,
      display_name: blindMapping?.anonymous_name || team.name,
      is_scored: scoredTeams.includes(team.id) || false,
    }
  }) || []

  return (
    <JudgeDashboardView
      hackathon={hackathon}
      activeRound={activeRound}
      teams={teamsWithStatus}
    />
  )
}