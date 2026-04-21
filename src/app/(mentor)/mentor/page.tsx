import { createClient } from '@/lib/supabase/server'
import MentorDashboardView from '@/components/mentor/MentorDashboardView'
import { redirect } from 'next/navigation'

export default async function MentorPage() {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Verify user is mentor
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'mentor') {
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
          <p className="text-gray-600">There&apos;s no hackathon currently active for mentoring.</p>
        </div>
      </div>
    )
  }

  // Fetch teams and tickets in parallel
  const [{ data: teams }, { data: tickets }] = await Promise.all([
    supabase
      .from('teams')
      .select(`
        id,
        name,
        description,
        status,
        team_members (
          user_id,
          role,
          profiles (
            id,
            full_name,
            avatar_url
          )
        ),
        submissions (
          id,
          github_url,
          live_url,
          health_status
        )
      `)
      .eq('hackathon_id', hackathon.id)
      .order('created_at', { ascending: true }),
    
    supabase
      .from('help_tickets')
      .select(`
        id,
        team_id,
        hackathon_id,
        tag,
        description,
        status,
        claimed_by,
        created_at,
        resolved_at,
        teams (
          id,
          name
        )
      `)
      .eq('hackathon_id', hackathon.id)
      .in('status', ['open', 'claimed'])
      .order('created_at', { ascending: true }),
  ])

  // Transform tickets
  const transformedTickets = tickets?.map(ticket => ({
    ...ticket,
    team: Array.isArray(ticket.teams) ? ticket.teams[0] : ticket.teams,
  })) || []

  // Transform teams to match expected type
  const transformedTeams = teams?.map(team => ({
    id: team.id,
    name: team.name,
    description: team.description,
    status: team.status,
    members: (team.team_members || []).map((tm: { user_id: string; role: 'lead' | 'member'; profiles: { id: string; full_name: string; avatar_url?: string }[] }) => ({
      user_id: tm.user_id,
      role: tm.role,
      profile: Array.isArray(tm.profiles) ? tm.profiles[0] : tm.profiles,
    })),
    submission: Array.isArray(team.submissions) ? team.submissions[0] : team.submissions,
  })) || []

  return (
    <MentorDashboardView
      hackathon={hackathon}
      teams={transformedTeams}
      tickets={transformedTickets}
      mentorId={user.id}
    />
  )
}
