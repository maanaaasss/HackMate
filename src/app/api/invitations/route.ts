import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's pending invitations
    const { data: invitations, error } = await supabase
      .from('team_invitations')
      .select(`
        id,
        team_id,
        invited_by,
        status,
        created_at,
        teams (
          id,
          name,
          description,
          hackathon_id,
          hackathons (
            id,
            name,
            status
          )
        ),
        invited_by_profile:profiles!team_invitations_invited_by_fkey (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('invited_user_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching invitations:', error)
      return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 })
    }

    // Transform the data
    const transformedInvitations = invitations?.map(inv => {
      const team = Array.isArray(inv.teams) ? inv.teams[0] : inv.teams
      const hackathon = team && Array.isArray((team as any).hackathons) ? (team as any).hackathons[0] : (team as any)?.hackathons
      const invitedBy = Array.isArray(inv.invited_by_profile) ? inv.invited_by_profile[0] : inv.invited_by_profile
      
      return {
        id: inv.id,
        team_id: inv.team_id,
        status: inv.status,
        created_at: inv.created_at,
        team: team ? {
          id: (team as any).id,
          name: (team as any).name,
          description: (team as any).description,
        } : null,
        hackathon: hackathon ? {
          id: (hackathon as any).id,
          name: (hackathon as any).name,
          status: (hackathon as any).status,
        } : null,
        invitedBy: invitedBy ? {
          id: (invitedBy as any).id,
          full_name: (invitedBy as any).full_name,
          avatar_url: (invitedBy as any).avatar_url,
        } : null,
      }
    }) || []

    return NextResponse.json(transformedInvitations)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}