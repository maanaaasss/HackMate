export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import FeedbackForm from '@/components/participant/FeedbackForm'
import { redirect } from 'next/navigation'

export default async function FeedbackPage() {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
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
          <p className="text-gray-600">There&apos;s no ended hackathon to provide feedback for.</p>
        </div>
      </div>
    )
  }

  // Fetch existing feedback response
  const { data: existingFeedback } = await supabase
    .from('feedback_responses')
    .select('*')
    .eq('user_id', user.id)
    .eq('hackathon_id', hackathon.id)
    .single()

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Feedback</h1>
          <p className="mt-2 text-gray-600">
            Share your experience from {hackathon.name}
          </p>
        </div>
        
        <FeedbackForm
          hackathon={hackathon}
          existingFeedback={existingFeedback}
        />
      </div>
    </div>
  )
}
