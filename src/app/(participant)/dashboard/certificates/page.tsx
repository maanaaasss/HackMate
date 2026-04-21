export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import CertificatesView from '@/components/participant/CertificatesView'
import { redirect } from 'next/navigation'

export default async function CertificatesPage() {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Fetch user's certificates with hackathon and team info
  const { data: certificates } = await supabase
    .from('certificates')
    .select(`
      id,
      certificate_type,
      rank,
      pdf_url,
      issued_at,
      hackathons (
        id,
        name,
        status
      ),
      teams (
        id,
        name
      )
    `)
    .eq('user_id', user.id)
    .order('issued_at', { ascending: false })

  // Transform the data
  const transformedCertificates = certificates?.map(cert => ({
    id: cert.id,
    certificate_type: cert.certificate_type,
    rank: cert.rank,
    pdf_url: cert.pdf_url,
    issued_at: cert.issued_at,
    hackathon: Array.isArray(cert.hackathons) ? cert.hackathons[0] : cert.hackathons,
    team: Array.isArray(cert.teams) ? cert.teams[0] : cert.teams,
  })) || []

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Certificates</h1>
          <p className="mt-2 text-gray-600">Download your certificates from hackathons you&apos;ve participated in.</p>
        </div>
        
        <CertificatesView certificates={transformedCertificates} />
      </div>
    </div>
  )
}
