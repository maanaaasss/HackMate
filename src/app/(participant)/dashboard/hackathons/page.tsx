export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import HackathonBrowser from '@/components/participant/HackathonBrowser'

export default async function HackathonsPage() {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Fetch all ongoing hackathons (registration_open, ongoing)
  const { data: hackathons, error } = await supabase
    .from('hackathons')
    .select('*')
    .in('status', ['registration_open', 'ongoing'])
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching hackathons:', error)
  }

  // Get user's current team memberships for these hackathons
  const hackathonIds = hackathons?.map(h => h.id) || []
  
  let userTeams: { team_id: string; teams: { id: string; hackathon_id: string } }[] = []
  if (hackathonIds.length > 0) {
    const { data: teams } = await supabase
      .from('team_members')
      .select(`
        team_id,
        teams (
          id,
          hackathon_id
        )
      `)
      .eq('user_id', user.id)
      .in('teams.hackathon_id', hackathonIds)
    
    userTeams = (teams as unknown as { team_id: string; teams: { id: string; hackathon_id: string } }[]) || []
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Browse Hackathons</h1>
          <p className="text-gray-600">
            Find and join hackathons that interest you. Create or join a team to participate.
          </p>
        </div>

        <HackathonBrowser 
          hackathons={hackathons || []} 
          userId={user.id}
          userTeams={userTeams}
        />
      </div>
    </div>
  )
}