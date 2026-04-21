'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import { Search, X, MessageCircle } from 'lucide-react'
import JoinRequestModal from './JoinRequestModal'

type Team = {
  id: string
  name: string
  description?: string
  status: string
  team_lead_id: string
  hackathon_id: string
  created_at: string
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

type Hackathon = {
  id: string
  name: string
  max_team_size: number
}

export default function OpportunityGallery({
  teams,
  hackathon,
  currentUserId,
  currentTeamId,
  pendingTeamIds,
}: {
  teams: Team[]
  hackathon: Hackathon
  currentUserId: string
  currentTeamId?: string
  pendingTeamIds: string[]
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [showJoinModal, setShowJoinModal] = useState(false)

  // Get all unique skills from ghost slots
  const allSkills = useMemo(() => {
    const skills = new Set<string>()
    teams.forEach(team => {
      team.ghost_slots.forEach(slot => {
        skills.add(slot.skill_needed)
      })
    })
    return Array.from(skills).sort()
  }, [teams])

  // Filter teams based on search and selected skills
  const filteredTeams = useMemo(() => {
    return teams.filter(team => {
      // Search filter
      const matchesSearch = searchTerm === '' || 
        team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        team.ghost_slots.some(slot => 
          slot.skill_needed.toLowerCase().includes(searchTerm.toLowerCase())
        )

      // Skill filter
      const matchesSkills = selectedSkills.length === 0 ||
        selectedSkills.some(skill =>
          team.ghost_slots.some(slot => 
            slot.skill_needed.toLowerCase() === skill.toLowerCase()
          )
        )

      return matchesSearch && matchesSkills
    })
  }, [teams, searchTerm, selectedSkills])

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev =>
      prev.includes(skill)
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    )
  }

  const clearFilters = () => {
    setSearchTerm('')
    setSelectedSkills([])
  }

  const handleExpressInterest = (team: Team) => {
    setSelectedTeam(team)
    setShowJoinModal(true)
  }

  const isUserInTeam = !!currentTeamId
  const hasPendingRequest = (teamId: string) => pendingTeamIds.includes(teamId)

  return (
    <div>
      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search teams or skills..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          <button
            onClick={clearFilters}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <X className="h-4 w-4 mr-2" />
            Clear filters
          </button>
        </div>

        {/* Skill Chips */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Filter by skill needed:</h3>
          <div className="flex flex-wrap gap-2">
            {allSkills.map(skill => (
              <button
                key={skill}
                onClick={() => toggleSkill(skill)}
                className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedSkills.includes(skill)
                    ? 'bg-blue-100 text-blue-800 border-2 border-blue-500'
                    : 'bg-gray-100 text-gray-800 border-2 border-transparent hover:bg-gray-200'
                }`}
              >
                {skill}
                {selectedSkills.includes(skill) && (
                  <X className="ml-1 h-3 w-3" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results count */}
      <div className="mb-6">
        <p className="text-sm text-gray-600">
          Showing {filteredTeams.length} team{filteredTeams.length !== 1 ? 's' : ''} with open slots
        </p>
      </div>

      {/* Team Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTeams.map(team => (
          <div key={team.id} className="bg-white shadow rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{team.name}</h3>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {team.member_count} / {hackathon.max_team_size}
                </span>
              </div>
              
              {team.description && (
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {team.description.length > 80 
                    ? `${team.description.substring(0, 80)}...` 
                    : team.description
                  }
                </p>
              )}

              {/* Member Avatars */}
              <div className="flex -space-x-2 mb-4">
                {team.members.slice(0, 4).map((member) => (
                  <div
                    key={member.user_id}
                    className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-gray-200 flex items-center justify-center overflow-hidden"
                    title={member.profile.full_name}
                  >
                    {member.profile.avatar_url ? (
                      <Image
                        src={member.profile.avatar_url}
                        alt={member.profile.full_name}
                        width={32}
                        height={32}
                        className="h-8 w-8 rounded-full"
                      />
                    ) : (
                      <span className="text-sm font-medium text-gray-600">
                        {member.profile.full_name.charAt(0)}
                      </span>
                    )}
                  </div>
                ))}
                {team.members.length > 4 && (
                  <div className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-gray-100 flex items-center justify-center">
                    <span className="text-xs font-medium text-gray-600">
                      +{team.members.length - 4}
                    </span>
                  </div>
                )}
              </div>

              {/* Ghost Slots */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Looking for:</h4>
                <div className="flex flex-wrap gap-2">
                  {team.ghost_slots.map(slot => (
                    <span
                      key={slot.id}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800"
                    >
                      🔍 {slot.skill_needed}
                    </span>
                  ))}
                </div>
              </div>

              {/* Member Skills */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Team skills:</h4>
                <div className="flex flex-wrap gap-1">
                  {Array.from(new Set(team.members.flatMap(m => m.profile.skills))).slice(0, 6).map(skill => (
                    <span
                      key={skill}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Express Interest Button */}
              <div className="pt-4 border-t border-gray-200">
                {isUserInTeam ? (
                  <div className="relative group">
                    <button
                      disabled
                      className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-400 bg-gray-100 cursor-not-allowed"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Express Interest
                    </button>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                      Leave your current team to join another
                    </div>
                  </div>
                ) : hasPendingRequest(team.id) ? (
                  <button
                    disabled
                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-500 bg-gray-50 cursor-not-allowed"
                  >
                    Request Pending
                  </button>
                ) : (
                  <button
                    onClick={() => handleExpressInterest(team)}
                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Express Interest
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredTeams.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No teams match your filters.</p>
          <button
            onClick={clearFilters}
            className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* Join Request Modal */}
      {selectedTeam && (
        <JoinRequestModal
          isOpen={showJoinModal}
          onClose={() => {
            setShowJoinModal(false)
            setSelectedTeam(null)
          }}
          team={selectedTeam}
          userId={currentUserId}
        />
      )}
    </div>
  )
}