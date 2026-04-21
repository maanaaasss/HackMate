export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import RubricBuilder from '@/components/organiser/RubricBuilder'
import { redirect } from 'next/navigation'

export default async function RubricPage({
  searchParams,
}: {
  searchParams: { hackathon_id?: string }
}) {
  const hackathonId = searchParams.hackathon_id
  if (!hackathonId) {
    redirect('/organiser')
  }

  const supabase = await createClient()
  
  // Verify user is organiser of this hackathon
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: hackathon } = await supabase
    .from('hackathons')
    .select('id, organiser_id')
    .eq('id', hackathonId)
    .single()

  if (!hackathon || hackathon.organiser_id !== user.id) {
    redirect('/unauthorized')
  }

  // Fetch existing rubric with items
  const { data: rubric } = await supabase
    .from('rubrics')
    .select(`
      id,
      hackathon_id,
      rubric_items (
        id,
        label,
        description,
        max_score,
        weight,
        sort_order
      )
    `)
    .eq('hackathon_id', hackathonId)
    .single()

  return <RubricBuilder hackathonId={hackathonId} initialRubric={rubric || undefined} />
}