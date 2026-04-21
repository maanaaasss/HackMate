import { createClient } from '@/lib/supabase/server'
import JudgingControlPanel from '@/components/organiser/JudgingControlPanel'
import { redirect } from 'next/navigation'
import { Score } from '@/types'

export default async function OrganiserJudgingPage() {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Verify organiser role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'organiser') {
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

  // Fetch all judging rounds
  const { data: rounds } = await supabase
    .from('judging_rounds')
    .select('*')
    .eq('hackathon_id', hackathon.id)
    .order('round_number', { ascending: true })

  // Fetch all teams
  const { data: teams } = await supabase
    .from('teams')
    .select('id, name')
    .eq('hackathon_id', hackathon.id)
    .order('name', { ascending: true })

  // Fetch all judges for this hackathon
  const { data: judges } = await supabase
    .from('hackathon_judges')
    .select(`
      judge_id,
      profiles (
        id,
        full_name,
        avatar_url
      )
    `)
    .eq('hackathon_id', hackathon.id)

  // Fetch scores for current round (if any)
  const currentRound = rounds?.find(r => !r.closed_at && r.opened_at)
  let scoresData: Pick<Score, 'judge_id' | 'team_id'>[] = []
  
  if (currentRound) {
    const { data: scores } = await supabase
      .from('scores')
      .select('judge_id, team_id')
      .eq('round_id', currentRound.id)
    
    scoresData = scores || []
  }

  // Fetch blind mappings
  const { data: blindMappings } = await supabase
    .from('blind_mappings')
    .select('team_id, anonymous_name')
    .eq('hackathon_id', hackathon.id)

  // Transform judges with their profiles
  const transformedJudges = judges?.map(judge => ({
    ...judge,
    profile: Array.isArray(judge.profiles) ? judge.profiles[0] : judge.profiles,
  })) || []

  return (
    <JudgingControlPanel
      hackathon={hackathon}
      rounds={rounds || []}
      teams={teams || []}
      judges={transformedJudges}
      scores={scoresData}
      blindMappings={blindMappings || []}
    />
  )
}