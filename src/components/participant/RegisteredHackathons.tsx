'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Calendar, MapPin, Users, Clock, ArrowRight, Plus, CheckCircle, Loader2, ExternalLink } from 'lucide-react'

interface Hackathon {
  id: string
  name: string
  description: string
  venue: string
  status: string
  start_time: string | null
  end_time: string | null
  registration_deadline: string | null
  submission_deadline: string | null
  min_team_size: number
  max_team_size: number
  max_teams: number | null
  created_at: string
}

interface Team {
  id: string
  name: string
  hackathon_id: string
  status: string
  team_lead_id: string
  member_count: number
  user_role: 'lead' | 'member'
}

interface RegisteredHackathonsProps {
  hackathons: Hackathon[]
  userId: string
  userTeams: Team[]
}

export default function RegisteredHackathons({ hackathons, userId, userTeams }: RegisteredHackathonsProps) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string }> = {
      registration_open: { label: 'Registration Open', color: 'bg-green-100 text-green-800' },
      ongoing: { label: 'Ongoing', color: 'bg-blue-100 text-blue-800' },
      judging: { label: 'Judging', color: 'bg-purple-100 text-purple-800' },
      ended: { label: 'Ended', color: 'bg-gray-100 text-gray-800' },
    }
    
    const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-800' }
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    )
  }

  const getTeamForHackathon = (hackathonId: string) => {
    return userTeams.find(team => team.hackathon_id === hackathonId)
  }

  if (hackathons.length === 0) {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Your Hackathons</h2>
          <p className="text-gray-600 text-sm">Manage your registered hackathons and teams</p>
        </div>
        <Link
          href="/dashboard/hackathons"
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          Browse More
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {hackathons.map((hackathon) => {
          const team = getTeamForHackathon(hackathon.id)
          const canCreateTeam = hackathon.status === 'registration_open' || hackathon.status === 'ongoing'
          
          return (
            <div
              key={hackathon.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">
                    {hackathon.name}
                  </h3>
                  {getStatusBadge(hackathon.status)}
                </div>
                
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {hackathon.description || 'No description available.'}
                </p>
                
                <div className="grid grid-cols-2 gap-2 mb-4 text-sm text-gray-500">
                  {hackathon.venue && (
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-1 text-gray-400" />
                      <span className="truncate">{hackathon.venue}</span>
                    </div>
                  )}
                  {hackathon.start_time && (
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                      <span>{formatDate(hackathon.start_time)}</span>
                    </div>
                  )}
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-1 text-gray-400" />
                    <span>Team: {hackathon.min_team_size}-{hackathon.max_team_size}</span>
                  </div>
                  {hackathon.registration_deadline && (
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1 text-gray-400" />
                      <span>Reg: {formatDate(hackathon.registration_deadline)}</span>
                    </div>
                  )}
                </div>
                
                {/* Team Status */}
                <div className="border-t border-gray-100 pt-4">
                  {team ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                        <div>
                          <p className="font-medium text-gray-900">{team.name}</p>
                          <p className="text-sm text-gray-500">
                            {team.user_role === 'lead' ? 'Team Lead' : 'Member'} • {team.member_count} members
                          </p>
                        </div>
                      </div>
                      <Link
                        href="/team"
                        className="inline-flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 text-sm font-medium rounded-md hover:bg-blue-100"
                      >
                        View Team
                        <ExternalLink className="w-4 h-4 ml-1" />
                      </Link>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-2">
                      {canCreateTeam ? (
                        <>
                          <Link
                            href={`/dashboard/team/create?hackathon=${hackathon.id}`}
                            className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Create Team
                          </Link>
                          <Link
                            href={`/dashboard/browse?hackathon=${hackathon.id}`}
                            className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-blue-600 text-blue-600 text-sm font-medium rounded-md hover:bg-blue-50"
                          >
                            Join a Team
                          </Link>
                        </>
                      ) : (
                        <p className="text-sm text-gray-500 italic">
                          Registration is closed for this hackathon
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}