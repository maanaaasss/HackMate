'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, RefreshCw } from 'lucide-react'

type TeamScore = {
  rank: number
  team_id: string
  display_name: string
  total_score: number
  breakdown: Record<string, number>
  judge_count: number
}

type LeaderboardData = {
  teams: TeamScore[]
  is_blind: boolean
  round_label: string
  generated_at: string
}

export default function LeaderboardView({
  hackathonId,
  initialData,
  isPublic = false,
}: {
  hackathonId: string
  initialData: LeaderboardData
  isPublic?: boolean
}) {
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [secondsAgo, setSecondsAgo] = useState(0)
  const [isRevealed, setIsRevealed] = useState(false)
  const [revealedData, setRevealedData] = useState<LeaderboardData | null>(null)

  // Fetch leaderboard data every 30 seconds
  const { data, refetch } = useQuery({
    queryKey: ['leaderboard', hackathonId],
    queryFn: async () => {
      const response = await fetch(`/api/hackathons/${hackathonId}/leaderboard`)
      if (!response.ok) throw new Error('Failed to fetch leaderboard')
      return response.json() as Promise<LeaderboardData>
    },
    initialData,
    refetchInterval: 30000,
  })

  // Update lastUpdated when data changes
  useEffect(() => {
    if (data) {
      setLastUpdated(new Date())
    }
  }, [data])

  // Update seconds ago counter
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date()
      const diff = Math.floor((now.getTime() - lastUpdated.getTime()) / 1000)
      setSecondsAgo(diff)
    }, 1000)

    return () => clearInterval(timer)
  }, [lastUpdated])

  // Handle reveal for organiser
  const handleReveal = async () => {
    if (isRevealed) {
      setIsRevealed(false)
      setRevealedData(null)
      return
    }

    try {
      const response = await fetch(`/api/hackathons/${hackathonId}/leaderboard?reveal=true`)
      if (response.ok) {
        const data = await response.json()
        setRevealedData(data)
        setIsRevealed(true)
      }
    } catch (error) {
      console.error('Failed to reveal names:', error)
    }
  }

  const displayData = isRevealed && revealedData ? revealedData : data

  if (!displayData) {
    return (
      <div className="bg-white shadow rounded-lg p-8 text-center">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">Loading leaderboard...</p>
      </div>
    )
  }

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-yellow-100 border-yellow-300'
      case 2: return 'bg-gray-100 border-gray-300'
      case 3: return 'bg-orange-100 border-orange-300'
      default: return 'bg-white border-gray-200'
    }
  }

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1: return '🥇'
      case 2: return '🥈'
      case 3: return '🥉'
      default: return rank
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {displayData.round_label}
            </h2>
            <p className="text-sm text-gray-500">
              Last updated {secondsAgo} seconds ago
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {!isPublic && (
              <button
                onClick={handleReveal}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                {isRevealed ? (
                  <>
                    <EyeOff className="h-4 w-4 mr-2" />
                    Hide Names
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Reveal Names
                  </>
                )}
              </button>
            )}
            <button
              onClick={() => refetch()}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Team
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Breakdown
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Judges
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <AnimatePresence>
                {displayData.teams.map((team) => (
                  <motion.tr
                    key={team.team_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className={getRankColor(team.rank)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-2xl font-bold">
                          {getRankBadge(team.rank)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {team.display_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-32 bg-gray-200 rounded-full h-2.5 mr-3">
                          <div
                            className="bg-blue-600 h-2.5 rounded-full"
                            style={{ width: `${Math.min(team.total_score, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-gray-900">
                          {team.total_score.toFixed(1)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(team.breakdown).map(([label, score]) => (
                          <span
                            key={label}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                            title={label}
                          >
                            {score.toFixed(1)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {team.judge_count}
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-gray-500">
        <p>
          Generated at {new Date(displayData.generated_at).toLocaleTimeString()}
        </p>
        {displayData.is_blind && (
          <p className="mt-1 text-yellow-600 font-medium">
            🔒 Blind mode active — team names hidden
          </p>
        )}
      </div>
    </div>
  )
}