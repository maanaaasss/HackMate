import { createClient } from '@/lib/supabase/server'
import TeamDashboard from '@/components/participant/TeamDashboard'
import CreateOrJoinView from '@/components/participant/CreateOrJoinView'
import { redirect } from 'next/navigation'

export default async function TeamPage() {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Get active hackathon (registration_open or ongoing)
  const { data: hackathon } = await supabase
    .from('hackathons')
    .select('id, name, status')
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

  // Check if user is in a team for this hackathon
  const { data: teamMember } = await supabase
    .from('team_members')
    .select(`
      team_id,
      role,
      teams (
        id,
        name,
        description,
        status,
        team_lead_id,
        hackathon_id,
        created_at
      )
    `)
    .eq('user_id', user.id)
    .single()

  if (teamMember?.teams && teamMember.teams.length > 0) {
    const team = teamMember.teams[0]
    
    // Fetch all team members with profiles
    const { data: membersData } = await supabase
      .from('team_members')
      .select(`
        user_id,
        role,
        joined_at,
        profiles (
          id,
          full_name,
          avatar_url,
          college,
          skills
        )
      `)
      .eq('team_id', team.id)

    const members = membersData?.map(member => ({
      ...member,
      profiles: Array.isArray(member.profiles) ? member.profiles[0] : member.profiles,
    })) || []

    // Fetch ghost slots
    const { data: ghostSlots } = await supabase
      .from('ghost_slots')
      .select('*')
      .eq('team_id', team.id)
      .order('created_at', { ascending: false })

    // Fetch pending join requests
    const { data: joinRequestsData } = await supabase
      .from('join_requests')
      .select(`
        id,
        message,
        created_at,
        ghost_slot_id,
        profiles (
          id,
          full_name,
          avatar_url,
          college,
          skills
        )
      `)
      .eq('team_id', team.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    const joinRequests = joinRequestsData?.map(request => ({
      ...request,
      profiles: Array.isArray(request.profiles) ? request.profiles[0] : request.profiles,
    })) || []

    return (
      <TeamDashboard
        hackathon={hackathon}
        team={team}
        members={members || []}
        ghostSlots={ghostSlots || []}
        joinRequests={joinRequests || []}
        currentUserId={user.id}
        isTeamLead={team.team_lead_id === user.id}
      />
    )
  }

  // User not in a team
  return <CreateOrJoinView hackathon={hackathon} userId={user.id} />
}