'use client'

import { useState, useMemo } from 'react'
import { X, Star } from 'lucide-react'

type Team = {
  id: string
  name: string
  description?: string
  ghost_slots: {
    id: string
    skill_needed: string
    description?: string
    filled: boolean
  }[]
  member_count: number
  members: {
    user_id: string
    role: 'lead' | 'member'
    profile: {
      id: string
      full_name: string
      avatar_url?: string
      skills: string[]
    }
  }[]
}

export default function RecommendationFeed({
  teams,
  userSkills,
}: {
  teams: Team[]
  userSkills: string[]
}) {
  const [dismissedTeamIds, setDismissedTeamIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return []
    const stored = localStorage.getItem('dismissedTeams')
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch (e) {
        console.error('Failed to parse dismissed teams:', e)
      }
    }
    return []
  })

  // Save dismissed teams to localStorage
  const dismissTeam = (teamId: string) => {
    const newDismissed = [...dismissedTeamIds, teamId]
    setDismissedTeamIds(newDismissed)
    localStorage.setItem('dismissedTeams', JSON.stringify(newDismissed))
  }

  // Score teams based on skill matches
  const scoredTeams = useMemo(() => {
    const userSkillsLower = userSkills.map(s => s.toLowerCase())
    
    return teams
      .filter(team => !dismissedTeamIds.includes(team.id))
      .map(team => {
        let score = 0
        const matchReasons: string[] = []

        // Check each ghost slot for skill matches
        team.ghost_slots.forEach(slot => {
          const slotSkillLower = slot.skill_needed.toLowerCase()
          
          // Direct match
          if (userSkillsLower.includes(slotSkillLower)) {
            score += 2
            matchReasons.push(`You have ${slot.skill_needed}`)
          }
          
          // Complementary matches (simplified logic)
          // Frontend user -> Backend slot
          if (
            (userSkillsLower.includes('react') || userSkillsLower.includes('next.js')) &&
            (slotSkillLower.includes('backend') || slotSkillLower.includes('node.js'))
          ) {
            score += 1
            matchReasons.push('Frontend + Backend combo')
          }
          
          // Backend user -> Frontend slot
          if (
            (userSkillsLower.includes('node.js') || userSkillsLower.includes('python')) &&
            (slotSkillLower.includes('frontend') || slotSkillLower.includes('react'))
          ) {
            score += 1
            matchReasons.push('Backend + Frontend combo')
          }
          
          // Design user -> UI/UX slot
          if (
            (userSkillsLower.includes('figma') || userSkillsLower.includes('ui/ux design')) &&
            slotSkillLower.includes('ui/ux')
          ) {
            score += 2
            matchReasons.push('Design expertise match')
          }
        })

        return {
          ...team,
          score,
          matchReasons: Array.from(new Set(matchReasons)).slice(0, 2), // Dedupe and limit
        }
      })
      .filter(team => team.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3) // Top 3 matches
  }, [teams, userSkills, dismissedTeamIds])

  if (scoredTeams.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Perfect Match</h2>
        <div className="text-center py-8">
          <p className="text-gray-500">
            No perfect matches yet — browse all teams below
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white shadow rounded-lg p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Perfect Match</h2>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
          <Star className="h-4 w-4 mr-1" />
          Top {scoredTeams.length} for you
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {scoredTeams.map(team => (
          <div key={team.id} className="border border-gray-200 rounded-lg p-4 relative">
            <button
              onClick={() => dismissTeam(team.id)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              title="Not interested"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="font-semibold text-gray-900 mb-2">{team.name}</h3>
            
            {team.description && (
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {team.description}
              </p>
            )}

            <div className="mb-3">
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                Why this match:
              </h4>
              <ul className="space-y-1">
                {team.matchReasons.map((reason, index) => (
                  <li key={index} className="text-sm text-green-700 flex items-start">
                    <span className="mr-2">✓</span>
                    {reason}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-wrap gap-1 mb-3">
              {team.ghost_slots.map(slot => (
                <span
                  key={slot.id}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800"
                >
                  {slot.skill_needed}
                </span>
              ))}
            </div>

            <div className="text-xs text-gray-500">
              {team.member_count} member{team.member_count !== 1 ? 's' : ''} • {team.ghost_slots.length} open slot{team.ghost_slots.length !== 1 ? 's' : ''}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}