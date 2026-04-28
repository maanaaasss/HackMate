export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import CommandCenterDashboard from '@/components/organiser/CommandCenterDashboard'
import { redirect, notFound } from 'next/navigation'

interface HackathonPageProps {
  params: Promise<{
    hackathonId: string
  }>
}

export default async function HackathonDetailPage({ params }: HackathonPageProps) {
  const { hackathonId } = await params
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

  // Get hackathon details
  const { data: hackathon, error } = await supabase
    .from('hackathons')
    .select('*')
    .eq('id', hackathonId)
    .eq('organiser_id', user.id)
    .single()

  if (error || !hackathon) {
    notFound()
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
    <div className="min-h-screen bg-gray-50">
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
    </div>
  )
}