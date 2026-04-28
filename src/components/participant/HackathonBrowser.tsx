'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, MapPin, Users, Clock, ArrowRight, CheckCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

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

interface UserTeam {
  team_id: string
  teams: {
    id: string
    hackathon_id: string
  }
}

interface HackathonBrowserProps {
  hackathons: Hackathon[]
  userId: string
  userTeams: UserTeam[]
}

interface RegistrationStatus {
  [hackathonId: string]: boolean
}

export default function HackathonBrowser({ hackathons, userId, userTeams }: HackathonBrowserProps) {
  const router = useRouter()
  const [registrations, setRegistrations] = useState<RegistrationStatus>({})
  const [loadingRegistrations, setLoadingRegistrations] = useState<Record<string, boolean>>({})

  // Fetch registration status for all hackathons
  useEffect(() => {
    const fetchRegistrations = async () => {
      try {
        const response = await fetch('/api/hackathons/registrations')
        if (response.ok) {
          const data = await response.json()
          const regStatus: RegistrationStatus = {}
          data.forEach((reg: { hackathon_id: string }) => {
            regStatus[reg.hackathon_id] = true
          })
          setRegistrations(regStatus)
        }
      } catch (error) {
        console.error('Failed to fetch registrations:', error)
      }
    }
    fetchRegistrations()
  }, [])

  const isUserRegistered = (hackathonId: string) => {
    return registrations[hackathonId] || userTeams.some(team => team.teams.hackathon_id === hackathonId)
  }

  const handleRegister = async (hackathonId: string) => {
    setLoadingRegistrations(prev => ({ ...prev, [hackathonId]: true }))
    
    try {
      const response = await fetch(`/api/hackathons/${hackathonId}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to register')
      }

      setRegistrations(prev => ({ ...prev, [hackathonId]: true }))
      toast.success('Successfully registered for hackathon!')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to register')
    } finally {
      setLoadingRegistrations(prev => ({ ...prev, [hackathonId]: false }))
    }
  }

  const handleUnregister = async (hackathonId: string) => {
    if (!confirm('Are you sure you want to unregister from this hackathon?')) {
      return
    }

    setLoadingRegistrations(prev => ({ ...prev, [hackathonId]: true }))
    
    try {
      const response = await fetch(`/api/hackathons/${hackathonId}/register`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to unregister')
      }

      setRegistrations(prev => ({ ...prev, [hackathonId]: false }))
      toast.success('Successfully unregistered from hackathon')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to unregister')
    } finally {
      setLoadingRegistrations(prev => ({ ...prev, [hackathonId]: false }))
    }
  }

  const getHackathonStatus = (hackathon: Hackathon) => {
    const now = new Date()
    
    if (hackathon.status === 'registration_open') {
      if (hackathon.registration_deadline && new Date(hackathon.registration_deadline) < now) {
        return { status: 'Registration Closed', color: 'text-yellow-600 bg-yellow-100' }
      }
      return { status: 'Registration Open', color: 'text-green-600 bg-green-100' }
    }
    
    if (hackathon.status === 'ongoing') {
      return { status: 'Ongoing', color: 'text-blue-600 bg-blue-100' }
    }
    
    return { status: hackathon.status, color: 'text-gray-600 bg-gray-100' }
  }

  const canRegister = (hackathon: Hackathon) => {
    if (hackathon.status !== 'registration_open') return false
    if (hackathon.registration_deadline && new Date(hackathon.registration_deadline) < new Date()) {
      return false
    }
    return true
  }

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

  const handleViewTeams = (hackathonId: string) => {
    sessionStorage.setItem('selectedHackathonId', hackathonId)
    router.push('/dashboard/browse')
  }

  const handleCreateTeam = (hackathonId: string) => {
    sessionStorage.setItem('selectedHackathonId', hackathonId)
    router.push('/dashboard/team/create')
  }

  if (hackathons.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Hackathons</h3>
        <p className="text-gray-600">
          There are no hackathons currently open for registration. Check back later!
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {hackathons.map((hackathon) => {
        const isRegistered = isUserRegistered(hackathon.id)
        const statusInfo = getHackathonStatus(hackathon)
        const isLoading = loadingRegistrations[hackathon.id]
        const registrationOpen = canRegister(hackathon)
        
        return (
          <div
            key={hackathon.id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                  {hackathon.name}
                </h3>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                  {statusInfo.status}
                </span>
              </div>
              
              <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                {hackathon.description || 'No description available.'}
              </p>
              
              <div className="space-y-2 mb-6">
                {hackathon.venue && (
                  <div className="flex items-center text-sm text-gray-500">
                    <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                    {hackathon.venue}
                  </div>
                )}
                
                {hackathon.start_time && (
                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                    Starts: {formatDate(hackathon.start_time)}
                  </div>
                )}
                
                {hackathon.registration_deadline && (
                  <div className="flex items-center text-sm text-gray-500">
                    <Clock className="w-4 h-4 mr-2 text-gray-400" />
                    Registration: {formatDate(hackathon.registration_deadline)}
                  </div>
                )}
                
                <div className="flex items-center text-sm text-gray-500">
                  <Users className="w-4 h-4 mr-2 text-gray-400" />
                  Team size: {hackathon.min_team_size} to {hackathon.max_team_size} members
                  {hackathon.max_teams && ` • Max ${hackathon.max_teams} teams`}
                </div>
              </div>
              
              <div className="flex flex-col space-y-2">
                {isRegistered ? (
                  <>
                    <div className="flex items-center justify-center py-2 px-4 bg-green-50 text-green-700 rounded-md mb-2">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Registered
                    </div>
                    <button
                      onClick={() => handleViewTeams(hackathon.id)}
                      className="flex items-center justify-center py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      View Teams
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </button>
                    <button
                      onClick={() => handleCreateTeam(hackathon.id)}
                      className="flex items-center justify-center py-2 px-4 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
                    >
                      Create Team
                    </button>
                    <button
                      onClick={() => handleUnregister(hackathon.id)}
                      disabled={isLoading}
                      className="flex items-center justify-center py-2 px-4 border border-red-300 text-red-600 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Unregister'
                      )}
                    </button>
                  </>
                ) : registrationOpen ? (
                  <>
                    <button
                      onClick={() => handleRegister(hackathon.id)}
                      disabled={isLoading}
                      className="flex items-center justify-center py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-2" />
                      )}
                      Register for Hackathon
                    </button>
                    <button
                      onClick={() => handleViewTeams(hackathon.id)}
                      className="flex items-center justify-center py-2 px-4 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      View Teams
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleViewTeams(hackathon.id)}
                    className="flex items-center justify-center py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    View Teams
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}