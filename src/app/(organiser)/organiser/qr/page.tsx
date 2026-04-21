export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import QRScannerPage from '@/components/organiser/QRScannerPage'
import { redirect } from 'next/navigation'

export default async function OrganiserQRPage() {
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

  // Get active hackathon
  const { data: hackathon } = await supabase
    .from('hackathons')
    .select('id, name')
    .in('status', ['ongoing', 'judging'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!hackathon) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No Active Hackathon</h1>
          <p className="text-gray-600">There&apos;s no hackathon currently active for scanning.</p>
        </div>
      </div>
    )
  }

  return (
    <QRScannerPage
      hackathonName={hackathon.name}
    />
  )
}