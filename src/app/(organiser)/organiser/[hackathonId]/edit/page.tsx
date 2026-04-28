export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import HackathonEditForm from '@/components/organiser/HackathonEditForm'

interface EditPageProps {
  params: Promise<{
    hackathonId: string
  }>
}

export default async function EditHackathonPage({ params }: EditPageProps) {
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

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <a 
            href={`/organiser/${hackathonId}`}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            ← Back to Dashboard
          </a>
          <h1 className="text-3xl font-bold text-gray-900 mt-4 mb-2">Edit Hackathon</h1>
          <p className="text-gray-600">
            Update your hackathon details. Changes will be reflected immediately.
          </p>
        </div>

        <HackathonEditForm hackathon={hackathon} />
      </div>
    </div>
  )
}