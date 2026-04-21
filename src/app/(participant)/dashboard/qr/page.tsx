import { createClient } from '@/lib/supabase/server'
import QRCodeDisplay from '@/components/participant/QRCodeDisplay'
import { redirect } from 'next/navigation'

export default async function QRPage() {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
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
          <p className="text-gray-600">There&apos;s no hackathon currently active for check-in.</p>
        </div>
      </div>
    )
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, college')
    .eq('id', user.id)
    .single()

  // Get attendance status
  const { data: attendance } = await supabase
    .from('attendance_records')
    .select('id')
    .eq('user_id', user.id)
    .eq('hackathon_id', hackathon.id)
    .single()

  // Get redemption status for each type
  const redemptionTypes = ['lunch_day1', 'lunch_day2', 'swag', 'dinner']
  const { data: redemptions } = await supabase
    .from('redemption_records')
    .select('type')
    .eq('user_id', user.id)
    .eq('hackathon_id', hackathon.id)
    .in('type', redemptionTypes)

  const redemptionStatus = {
    lunch_day1: redemptions?.some(r => r.type === 'lunch_day1') || false,
    lunch_day2: redemptions?.some(r => r.type === 'lunch_day2') || false,
    swag: redemptions?.some(r => r.type === 'swag') || false,
    dinner: redemptions?.some(r => r.type === 'dinner') || false,
  }

  return (
    <QRCodeDisplay
      userId={user.id}
      hackathonId={hackathon.id}
      hackathonName={hackathon.name}
      profile={profile || { full_name: 'User', college: '' }}
      isCheckedIn={!!attendance}
      redemptionStatus={redemptionStatus}
    />
  )
}