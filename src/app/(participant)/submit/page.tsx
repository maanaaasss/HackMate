import { createClient } from '@/lib/supabase/server'
import SubmissionForm from '@/components/participant/SubmissionForm'
import { redirect } from 'next/navigation'

export default async function SubmitPage() {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Get active hackathon
  const { data: hackathon } = await supabase
    .from('hackathons')
    .select('id, name, status, submission_deadline, end_time')
    .in('status', ['ongoing', 'judging'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!hackathon) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No Active Hackathon</h1>
          <p className="text-gray-600">There&apos;s no hackathon currently open for submissions.</p>
        </div>
      </div>
    )
  }

  // Get user's team for this hackathon
  const { data: teamMember } = await supabase
    .from('team_members')
    .select(`
      team_id,
      teams (
        id,
        name,
        hackathon_id
      )
    `)
    .eq('user_id', user.id)
    .single()

  if (!teamMember?.teams || teamMember.teams.length === 0 || teamMember.teams[0].hackathon_id !== hackathon.id) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No Team Found</h1>
          <p className="text-gray-600">Join a team before submitting your project.</p>
        </div>
      </div>
    )
  }

  const team = Array.isArray(teamMember.teams) ? teamMember.teams[0] : teamMember.teams

  // Get existing submission for this team
  const { data: submission } = await supabase
    .from('submissions')
    .select('*')
    .eq('team_id', team.id)
    .eq('hackathon_id', hackathon.id)
    .single()

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Submit Your Project</h1>
          <p className="text-gray-600">
            {hackathon.name} — Submit your project before the deadline.
          </p>
        </div>

        <SubmissionForm
          hackathon={hackathon}
          team={team}
          existingSubmission={submission}
        />
      </div>
    </div>
  )
}