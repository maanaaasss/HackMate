export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import HackathonList from '@/components/organiser/HackathonList'

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

  // Get all hackathons for this organiser
  const { data: hackathons, error } = await supabase
    .from('hackathons')
    .select('*')
    .eq('organiser_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching hackathons:', error)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Hackathon Dashboard</h1>
          <p className="text-gray-600">
            Manage all your hackathons from one place. Create new hackathons, view stats, and monitor progress.
          </p>
        </div>

        <HackathonList hackathons={hackathons || []} />
      </div>
    </div>
  )
}