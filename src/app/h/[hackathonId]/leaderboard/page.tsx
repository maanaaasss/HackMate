export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import LeaderboardView from '@/components/shared/LeaderboardView'
import { Metadata } from 'next'
import { redis } from '@/lib/redis'

export async function generateMetadata({
  params,
}: {
  params: { hackathonId: string }
}): Promise<Metadata> {
  const supabase = await createClient()
  const { data: hackathon } = await supabase
    .from('hackathons')
    .select('name')
    .eq('id', params.hackathonId)
    .single()

  return {
    title: `${hackathon?.name || 'Hackathon'} Leaderboard`,
    description: `Live leaderboard for ${hackathon?.name || 'hackathon'}`,
  }
}

export default async function LeaderboardPage({
  params,
}: {
  params: { hackathonId: string }
}) {
  const supabase = await createClient()
  
  // Try to get cached leaderboard
  const cacheKey = `leaderboard:${params.hackathonId}:overall`
  let initialData = null
  
  try {
    const cached = await redis.get(cacheKey)
    if (cached) {
      initialData = JSON.parse(cached)
    }
  } catch (error) {
    console.error('Redis cache error:', error)
  }

  // If no cache, fetch fresh data
  if (!initialData) {
    // Fetch hackathon info
    const { data: hackathon } = await supabase
      .from('hackathons')
      .select('id, name')
      .eq('id', params.hackathonId)
      .single()

    if (!hackathon) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Hackathon Not Found</h1>
          </div>
        </div>
      )
    }

    // Initial empty data structure
    initialData = {
      teams: [],
      is_blind: false,
      round_label: 'No scores yet',
      generated_at: new Date().toISOString(),
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Leaderboard</h1>
          <p className="text-gray-600">
            Live rankings updated every 30 seconds
          </p>
        </div>

        <LeaderboardView
          hackathonId={params.hackathonId}
          initialData={initialData}
          isPublic={true}
        />
      </div>
    </div>
  )
}