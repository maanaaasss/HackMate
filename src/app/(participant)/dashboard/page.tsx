export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RegisteredHackathons from '@/components/participant/RegisteredHackathons'
import Link from 'next/link'
import { Calendar, Users, Megaphone, Clock } from 'lucide-react'

interface Team {
  id: string
  name: string
  hackathon_id: string
  status: string
  team_lead_id: string
  member_count: number
  user_role: 'lead' | 'member'
}

export default async function DashboardPage() {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Get user profile
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('full_name, email, avatar_url, skills')
    .eq('id', user.id)
    .single()

  // Get user's registered hackathons
  const { data: userRegistrations } = await supabase
    .from('hackathon_registrations')
    .select('hackathon_id')
    .eq('user_id', user.id)
    .eq('status', 'registered')

  const registeredHackathonIds = userRegistrations?.map(r => r.hackathon_id) || []

  // Fetch registered hackathons
  let hackathons: any[] = []
  if (registeredHackathonIds.length > 0) {
    const { data } = await supabase
      .from('hackathons')
      .select('*')
      .in('id', registeredHackathonIds)
      .order('created_at', { ascending: false })
    hackathons = data || []
  }

  // Fetch user's teams for registered hackathons
  const { data: userTeamMemberships } = await supabase
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

  // Transform team data
  const userTeams: Team[] = []
  if (userTeamMemberships) {
    for (const tm of userTeamMemberships) {
      const team = tm.teams as any
      if (team && team.id) {
        userTeams.push({
          id: team.id,
          name: team.name,
          hackathon_id: team.hackathon_id,
          status: team.status,
          team_lead_id: team.team_lead_id,
          member_count: 0,
          user_role: tm.role as 'lead' | 'member',
        })
      }
    }
  }

  // Fetch announcements for registered hackathons
  const { data: announcements } = await supabase
    .from('announcements')
    .select('id, title, message, sent_at')
    .in('hackathon_id', registeredHackathonIds)
    .order('sent_at', { ascending: false })
    .limit(5)

  // Fetch timeline events for registered hackathons
  const { data: timeline } = await supabase
    .from('hackathon_timeline')
    .select('id, title, description, scheduled_at, type')
    .in('hackathon_id', registeredHackathonIds)
    .order('scheduled_at', { ascending: true })
    .limit(10)

  // If user hasn't registered for any hackathons, show registration prompt
  if (!hackathons || hackathons.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Register for a Hackathon</h1>
          <p className="text-gray-600 mb-8">
            You haven&apos;t registered for any hackathons yet. Browse available hackathons and register to get started!
          </p>
          <Link
            href="/dashboard/hackathons"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Browse Hackathons
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {userProfile?.full_name || 'Participant'}!
          </h1>
          <p className="text-gray-600 mt-1">
            You are registered for {hackathons.length} hackathon{hackathons.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-500">Registered</p>
                <p className="text-xl font-semibold text-gray-900">{hackathons.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-500">My Teams</p>
                <p className="text-xl font-semibold text-gray-900">{userTeams.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Megaphone className="w-5 h-5 text-purple-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-gray-500">Announcements</p>
                <p className="text-xl font-semibold text-gray-900">{announcements?.length || 0}</p>
              </div>
            </div>
          </div>
          <Link
            href="/dashboard/hackathons"
            className="bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm p-4 text-white transition-colors"
          >
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-100">Browse More</p>
                <p className="text-lg font-semibold">Find Hackathons</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Registered Hackathons */}
        <RegisteredHackathons
          hackathons={hackathons}
          userId={user.id}
          userTeams={userTeams}
        />

        {/* Announcements */}
        {announcements && announcements.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Announcements</h2>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 divide-y divide-gray-100">
              {announcements.map((announcement) => (
                <div key={announcement.id} className="p-4">
                  <h3 className="font-medium text-gray-900">{announcement.title}</h3>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{announcement.message}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(announcement.sent_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timeline */}
        {timeline && timeline.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Upcoming Events</h2>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="space-y-4">
                {timeline.slice(0, 5).map((event) => (
                  <div key={event.id} className="flex items-start">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Clock className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="font-medium text-gray-900">{event.title}</p>
                      <p className="text-sm text-gray-500">{event.description}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(event.scheduled_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}