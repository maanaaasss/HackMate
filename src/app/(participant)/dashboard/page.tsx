export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import DashboardLayout from '@/components/participant/DashboardLayout'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Fetch ended hackathon first (for feedback banner)
  const { data: endedHackathon } = await supabase
    .from('hackathons')
    .select('id, name, status')
    .eq('status', 'ended')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  // Fetch all data in parallel
  const [
    { data: hackathon },
    { data: teamData },
    { data: announcements },
    { data: teamsWithSlots },
    { data: timeline },
    { data: existingFeedback },
  ] = await Promise.all([
    // Active hackathon
    supabase
      .from('hackathons')
      .select('*')
      .in('status', ['registration_open', 'ongoing', 'judging'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
    
    // User's team and members
    supabase
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
        ),
        profiles (
          id,
          full_name,
          avatar_url,
          skills
        )
      `)
      .eq('user_id', user.id)
      .single(),
    
    // Latest 3 announcements
    supabase
      .from('announcements')
      .select('id, title, message, sent_at')
      .eq('hackathon_id', (await supabase
        .from('hackathons')
        .select('id')
        .in('status', ['registration_open', 'ongoing', 'judging'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      ).data?.id || '')
      .order('sent_at', { ascending: false })
      .limit(3),
    
    // Teams with open ghost slots for recommendations
    supabase
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
      .eq('hackathon_id', (await supabase
        .from('hackathons')
        .select('id')
        .in('status', ['registration_open', 'ongoing', 'judging'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      ).data?.id || '')
      .eq('ghost_slots.filled', false)
      .eq('status', 'forming'),
    
    // Timeline events
    supabase
      .from('hackathon_timeline')
      .select('id, title, description, scheduled_at, type')
      .eq('hackathon_id', (await supabase
        .from('hackathons')
        .select('id')
        .in('status', ['registration_open', 'ongoing', 'judging'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      ).data?.id || '')
      .order('scheduled_at', { ascending: true }),
    
    // Check if feedback already submitted for ended hackathon
    endedHackathon?.id ? supabase
      .from('feedback_responses')
      .select('id')
      .eq('user_id', user.id)
      .eq('hackathon_id', endedHackathon.id)
      .single() : { data: null },
  ])

  // Transform team data
  const currentTeam = teamData?.teams && teamData.teams.length > 0 ? {
    ...teamData.teams[0],
    member_count: 0, // Will be fetched separately if needed
    members: [],
    user_role: teamData.role,
  } : null

  // Transform teams with slots for recommendations
  const transformedTeams = teamsWithSlots?.map(team => ({
    ...team,
    ghost_slots: team.ghost_slots.filter(slot => !slot.filled),
    member_count: team.team_members?.length || 0,
    members: team.team_members?.map(member => ({
      ...member,
      profile: Array.isArray(member.profiles) ? member.profiles[0] : member.profiles,
    })) || [],
  })) || []

  // Get user profile and skills
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('full_name, email, avatar_url, skills')
    .eq('id', user.id)
    .single()

  const userData = {
    id: user.id,
    email: userProfile?.email || user.email || '',
    full_name: userProfile?.full_name || user.email?.split('@')[0] || 'User',
    avatar_url: userProfile?.avatar_url,
  }

  return (
    <DashboardLayout
      user={userData}
      hackathon={hackathon}
      currentTeam={currentTeam}
      announcements={announcements || []}
      teamsForRecommendations={transformedTeams}
      userSkills={userProfile?.skills || []}
      timeline={timeline || []}
      endedHackathon={endedHackathon || null}
      feedbackSubmitted={!!existingFeedback}
    />
  )
}