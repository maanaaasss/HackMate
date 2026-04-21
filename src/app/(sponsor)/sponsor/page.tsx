import { createClient } from '@/lib/supabase/server'
import SponsorDashboardView from '@/components/sponsor/SponsorDashboardView'
import { redirect } from 'next/navigation'

export default async function SponsorPage() {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Verify sponsor role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'sponsor') {
    redirect('/unauthorized')
  }

  // Get active hackathon
  const { data: hackathon } = await supabase
    .from('hackathons')
    .select('id, name, status')
    .in('status', ['registration_open', 'ongoing', 'judging'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!hackathon) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No Active Hackathon</h1>
          <p className="text-gray-600">There&apos;s no hackathon currently active for sponsors.</p>
        </div>
      </div>
    )
  }

  // Get sponsor record for this user and hackathon
  const { data: sponsor } = await supabase
    .from('sponsors')
    .select('*')
    .eq('user_id', user.id)
    .eq('hackathon_id', hackathon.id)
    .single()

  if (!sponsor) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No Sponsor Record</h1>
          <p className="text-gray-600">You don&apos;t have a sponsor record for this hackathon.</p>
        </div>
      </div>
    )
  }

  // Get visible participant profiles (opted in for sponsor visibility)
  // First get team IDs for this hackathon
  const { data: teamIds } = await supabase
    .from('teams')
    .select('id')
    .eq('hackathon_id', hackathon.id)

  // Then get user IDs from team members
  const { data: memberUserIds } = teamIds && teamIds.length > 0
    ? await supabase
        .from('team_members')
        .select('user_id')
        .in('team_id', teamIds.map(t => t.id))
    : { data: [] }

  // Finally get profiles that are sponsor_visible and in the hackathon
  const { data: visibleProfiles } = memberUserIds && memberUserIds.length > 0
    ? await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          avatar_url,
          college,
          year_of_study,
          skills,
          github_username,
          github_data
        `)
        .eq('sponsor_visible', true)
        .in('id', memberUserIds.map(m => m.user_id))
    : { data: [] }

  // Get ping count for this sponsor
  const { count: pingCount } = await supabase
    .from('sponsor_pings')
    .select('*', { count: 'exact', head: true })
    .eq('sponsor_id', sponsor.id)
    .eq('hackathon_id', hackathon.id)

  return (
    <SponsorDashboardView
      sponsor={sponsor}
      hackathon={hackathon}
      visibleProfiles={visibleProfiles || []}
      pingCount={pingCount || 0}
    />
  )
}
