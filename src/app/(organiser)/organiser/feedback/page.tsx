import { createClient } from '@/lib/supabase/server'
import FeedbackAnalytics from '@/components/organiser/FeedbackAnalytics'
import { redirect } from 'next/navigation'

export default async function FeedbackAnalyticsPage() {
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

  // Get ended hackathon
  const { data: hackathon } = await supabase
    .from('hackathons')
    .select('id, name, status')
    .eq('status', 'ended')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!hackathon) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No Ended Hackathon</h1>
          <p className="text-gray-600">There&apos;s no ended hackathon to view feedback for.</p>
        </div>
      </div>
    )
  }

  // Fetch all feedback responses for this hackathon
  const { data: feedback } = await supabase
    .from('feedback_responses')
    .select(`
      id,
      user_id,
      mentor_rating,
      judge_rating,
      food_rating,
      organisation_rating,
      mentor_comment,
      overall_comment,
      submitted_at,
      profiles (
        college,
        year_of_study
      )
    `)
    .eq('hackathon_id', hackathon.id)
    .order('submitted_at', { ascending: false })

  // Transform feedback data
  const transformedFeedback = feedback?.map(f => ({
    ...f,
    profiles: Array.isArray(f.profiles) ? f.profiles[0] : f.profiles,
  })) || []

  // Get participant count for this hackathon
  // First get team IDs
  const { data: teamIds } = await supabase
    .from('teams')
    .select('id')
    .eq('hackathon_id', hackathon.id)

  // Then count team members
  const { count: participantCount } = teamIds && teamIds.length > 0
    ? await supabase
        .from('team_members')
        .select('*', { count: 'exact', head: true })
        .in('team_id', teamIds.map(t => t.id))
    : { count: 0 }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Feedback Analytics</h1>
          <p className="mt-2 text-gray-600">
            View participant feedback for {hackathon.name}
          </p>
        </div>
        
        <FeedbackAnalytics
          hackathon={hackathon}
          feedback={transformedFeedback}
          participantCount={participantCount || 0}
        />
      </div>
    </div>
  )
}
