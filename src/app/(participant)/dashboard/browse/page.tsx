import { createClient } from '@/lib/supabase/server'
import OpportunityGallery from '@/components/participant/OpportunityGallery'
import RecommendationFeed from '@/components/participant/RecommendationFeed'
import { redirect } from 'next/navigation'

export default async function BrowsePage() {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Get active hackathon
  const { data: hackathon } = await supabase
    .from('hackathons')
    .select('id, name, status, max_team_size')
    .in('status', ['registration_open', 'ongoing'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!hackathon) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No Active Hackathon</h1>
          <p className="text-gray-600">There&apos;s no hackathon currently open for registration.</p>
        </div>
      </div>
    )
  }

  // Get user's current team for this hackathon
  const { data: currentTeam } = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', user.id)
    .single()

  // Get user's pending join requests
  const { data: pendingRequests } = await supabase
    .from('join_requests')
    .select('team_id')
    .eq('user_id', user.id)
    .eq('status', 'pending')

  const pendingTeamIds = pendingRequests?.map(r => r.team_id) || []

  // Get teams with open ghost slots for this hackathon
  const { data: teamsWithSlots } = await supabase
    .from('teams')
    .select(`
      id,
      name,
      description,
      status,
      team_lead_id,
      hackathon_id,
      created_at,
      ghost_slots!inner (
        id,
        skill_needed,
        description,
        filled
      ),
      team_members (
        user_id,
        role,
        profiles (
          id,
          full_name,
          avatar_url,
          skills
        )
      )
    `)
    .eq('hackathon_id', hackathon.id)
    .eq('ghost_slots.filled', false)
    .eq('status', 'forming')

  // Transform data for client component
  const transformedTeams = teamsWithSlots?.map(team => ({
    ...team,
    ghost_slots: team.ghost_slots.filter(slot => !slot.filled),
    member_count: team.team_members?.length || 0,
    members: team.team_members?.map(member => ({
      ...member,
      profile: Array.isArray(member.profiles) ? member.profiles[0] : member.profiles,
    })) || [],
  })) || []

  // Get user's skills for recommendations
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('skills')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Find a Team</h1>
          <p className="text-gray-600">
            Browse teams looking for members with your skills.
          </p>
        </div>

        {/* Recommendation Feed */}
        <RecommendationFeed
          teams={transformedTeams}
          userSkills={userProfile?.skills || []}
        />

        {/* Main Gallery */}
        <OpportunityGallery
          teams={transformedTeams}
          hackathon={hackathon}
          currentUserId={user.id}
          currentTeamId={currentTeam?.team_id}
          pendingTeamIds={pendingTeamIds}
        />
      </div>
    </div>
  )
}