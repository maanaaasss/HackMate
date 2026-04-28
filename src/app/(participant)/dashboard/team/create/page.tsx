export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CreateTeamForm from '@/components/participant/CreateTeamForm'

interface HackathonOption {
  id: string
  name: string
  status: string
  min_team_size: number
  max_team_size: number
}

interface CreateTeamPageProps {
  searchParams: Promise<{
    hackathon?: string
  }>
}

export default async function CreateTeamPage({ searchParams }: CreateTeamPageProps) {
  const { hackathon: hackathonId } = await searchParams
  const supabase = await createClient()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Get user's registered hackathons
  const { data: registrations } = await supabase
    .from('hackathon_registrations')
    .select('hackathon_id')
    .eq('user_id', user.id)
    .eq('status', 'registered')

  const registeredHackathonIds = registrations?.map(r => r.hackathon_id) || []

  // Get hackathon details
  let availableHackathons: HackathonOption[] = []
  if (registeredHackathonIds.length > 0) {
    const { data: hackathons } = await supabase
      .from('hackathons')
      .select('id, name, status, min_team_size, max_team_size')
      .in('id', registeredHackathonIds)
      .in('status', ['registration_open', 'ongoing'])
    
    availableHackathons = hackathons || []
  }

  // Get hackathons user already has teams for
  const { data: existingTeams } = await supabase
    .from('team_members')
    .select('teams!inner(hackathon_id)')
    .eq('user_id', user.id)

  const hackathonIdsWithTeams = (existingTeams || [])
    .map(t => (t.teams as any)?.hackathon_id)
    .filter(Boolean)

  // Filter to only hackathons without teams
  const hackathonsWithoutTeams = availableHackathons.filter(
    h => !hackathonIdsWithTeams.includes(h.id)
  )

  // If specific hackathon requested, verify it's available
  let selectedHackathon: HackathonOption | null = null
  if (hackathonId) {
    selectedHackathon = hackathonsWithoutTeams.find(h => h.id === hackathonId) || null
    if (!selectedHackathon) {
      const { data: hackathon } = await supabase
        .from('hackathons')
        .select('id, name, status, min_team_size, max_team_size')
        .eq('id', hackathonId)
        .single()
      
      if (hackathon && !hackathonIdsWithTeams.includes(hackathon.id)) {
        selectedHackathon = hackathon
      }
    }
  }

  if (!selectedHackathon && hackathonsWithoutTeams.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No Hackathons Available</h1>
          <p className="text-gray-600 mb-6">
            You need to register for a hackathon before creating a team. 
            You may already have teams in all your registered hackathons.
          </p>
          <a
            href="/dashboard/hackathons"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Browse Hackathons
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <a 
            href="/dashboard"
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            ← Back to Dashboard
          </a>
          <h1 className="text-3xl font-bold text-gray-900 mt-4 mb-2">Create a Team</h1>
          <p className="text-gray-600">
            Set up your team and start looking for members.
          </p>
        </div>

        <CreateTeamForm 
          hackathon={selectedHackathon}
          availableHackathons={hackathonsWithoutTeams}
          userId={user.id}
        />
      </div>
    </div>
  )
}