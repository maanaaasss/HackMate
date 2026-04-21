import { createClient } from '@/lib/supabase/server'
import CommandCenterDashboard from '@/components/organiser/CommandCenterDashboard'
import { redirect } from 'next/navigation'

export default async function OrganiserPage() {
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

  // Get any hackathon (including draft) for this organiser
  const { data: hackathon } = await supabase
    .from('hackathons')
    .select('id, name, status, submission_deadline, end_time, registration_deadline')
    .eq('organiser_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!hackathon) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Welcome to Hackmate!</h1>
          <p className="text-gray-600 mb-6">Create your first hackathon to get started.</p>
          <a
            href="/organiser/setup"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Create Hackathon
          </a>
        </div>
      </div>
    )
  }

  // Fetch initial stats and announcements in parallel
  const [{ data: stats }, { data: announcements }] = await Promise.all([
    supabase.rpc('get_hackathon_stats', {
      hackathon_id_param: hackathon.id,
    }),
    supabase
      .from('announcements')
      .select('id, title, message, channel, sent_at')
      .eq('hackathon_id', hackathon.id)
      .order('sent_at', { ascending: false })
      .limit(5),
  ])

  return (
    <CommandCenterDashboard
      hackathon={hackathon}
      initialStats={stats || {
        total_teams: 0,
        checked_in_count: 0,
        submissions_count: 0,
        open_tickets_count: 0,
      }}
      initialAnnouncements={announcements || []}
    />
  )
}