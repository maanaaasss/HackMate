import { createClient } from '@/lib/supabase/server'
import TalentProfileView from '@/components/TalentProfileView'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'

type Props = {
  params: Promise<{ userId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { userId } = await params
  const supabase = await createClient()
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', userId)
    .single()

  return {
    title: profile?.full_name ? `${profile.full_name} — Hackmate Profile` : 'Hackmate Profile',
  }
}

export default async function ProfilePage({ params }: Props) {
  const { userId } = await params
  const supabase = await createClient()
  
  // Get current user (for checking if viewing own profile)
  const { data: { user } } = await supabase.auth.getUser()
  const currentUserId = user?.id

  // Fetch profile by userId
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (profileError || !profile) {
    notFound()
  }

  // Fetch team and hackathon history
  const { data: teamMemberships } = await supabase
    .from('team_members')
    .select(`
      role,
      teams (
        id,
        name,
        hackathon_id,
        hackathons (
          id,
          name,
          status,
          end_time
        )
      )
    `)
    .eq('user_id', userId)

  // Fetch certificates for this user
  const { data: certificates } = await supabase
    .from('certificates')
    .select(`
      id,
      certificate_type,
      rank,
      pdf_url,
      hackathon_id,
      team_id
    `)
    .eq('user_id', userId)

  // Transform team memberships
  const hackathonHistory = teamMemberships?.map(membership => {
    const team = Array.isArray(membership.teams) ? membership.teams[0] : membership.teams
    const hackathon = team ? (Array.isArray(team.hackathons) ? team.hackathons[0] : team.hackathons) : null
    
    // Find certificate for this hackathon
    const certificate = certificates?.find(c => 
      c.hackathon_id === hackathon?.id && c.team_id === team?.id
    )

    return {
      team_id: team?.id,
      team_name: team?.name,
      role: membership.role,
      hackathon: hackathon ? {
        id: hackathon.id,
        name: hackathon.name,
        status: hackathon.status,
      } : null,
      certificate: certificate ? {
        id: certificate.id,
        type: certificate.certificate_type,
        rank: certificate.rank,
        pdf_url: certificate.pdf_url,
      } : null,
    }
  }).filter(h => h.hackathon) || []

  return (
    <TalentProfileView
      profile={profile}
      hackathonHistory={hackathonHistory}
      isOwnProfile={currentUserId === userId}
      currentUserId={currentUserId}
    />
  )
}
