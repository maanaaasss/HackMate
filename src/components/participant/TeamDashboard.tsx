'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2, UserMinus, MessageCircle, Plus, X, Check, UserPlus } from 'lucide-react'
import AddGhostSlotModal from './AddGhostSlotModal'
import InviteMemberModal from './InviteMemberModal'

type TeamMember = {
  user_id: string
  role: 'lead' | 'member'
  joined_at: string
  profiles: {
    id: string
    full_name: string
    avatar_url?: string
    college?: string
    skills: string[]
  }
}

type GhostSlot = {
  id: string
  skill_needed: string
  description?: string
  filled: boolean
  created_at: string
}

type JoinRequest = {
  id: string
  message?: string
  created_at: string
  ghost_slot_id?: string
  profiles: {
    id: string
    full_name: string
    avatar_url?: string
    college?: string
    skills: string[]
  }
}

type Team = {
  id: string
  name: string
  description?: string
  status: string
  team_lead_id: string
  hackathon_id: string
  created_at: string
}

type Hackathon = {
  id: string
  name: string
  status: string
}

export default function TeamDashboard({
  hackathon,
  team,
  members,
  ghostSlots,
  joinRequests: initialJoinRequests,
  isTeamLead,
}: {
  hackathon: Hackathon
  team: Team
  members: TeamMember[]
  ghostSlots: GhostSlot[]
  joinRequests: JoinRequest[]
  currentUserId: string
  isTeamLead: boolean
}) {
  const router = useRouter()
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>(initialJoinRequests)
  const [showAddSlotModal, setShowAddSlotModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [removingMember, setRemovingMember] = useState<string | null>(null)
  const [processingRequest, setProcessingRequest] = useState<string | null>(null)

  // Subscribe to realtime join requests
  useEffect(() => {
    const channel = supabase
      .channel(`team-${team.id}-join-requests`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'join_requests',
          filter: `team_id=eq.${team.id}`,
        },
        async (payload) => {
          // Fetch the full join request with profile
          const { data } = await supabase
            .from('join_requests')
            .select(`
              id,
              message,
              created_at,
              ghost_slot_id,
              profiles (
                id,
                full_name,
                avatar_url,
                college,
                skills
              )
            `)
            .eq('id', payload.new.id)
            .single()

          if (data) {
            const transformed = {
              ...data,
              profiles: Array.isArray(data.profiles) ? data.profiles[0] : data.profiles,
            }
            setJoinRequests((prev) => [transformed as JoinRequest, ...prev])
            toast.info('New join request received!')
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [team.id])

  const removeMember = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this member from the team?')) return

    setRemovingMember(userId)
    try {
      const response = await fetch(`/api/teams/${team.id}/members/${userId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to remove member')
      }

      toast.success('Member removed successfully')
      router.refresh()
    } catch (_error) {
      toast.error('Failed to remove member')
    } finally {
      setRemovingMember(null)
    }
  }

  const deleteGhostSlot = async (slotId: string) => {
    const slot = ghostSlots.find(s => s.id === slotId)
    if (slot?.filled) {
      toast.error('Cannot delete a filled slot')
      return
    }

    if (!confirm('Are you sure you want to delete this ghost slot?')) return

    try {
      const response = await fetch(`/api/ghost-slots/${slotId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete slot')
      }

      toast.success('Ghost slot deleted')
      router.refresh()
    } catch (_error) {
      toast.error('Failed to delete ghost slot')
    }
  }

  const handleJoinRequest = async (requestId: string, action: 'accept' | 'decline') => {
    setProcessingRequest(requestId)
    try {
      const response = await fetch(`/api/join-requests/${requestId}/${action}`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error(`Failed to ${action} request`)
      }

      if (action === 'accept') {
        // Remove from local state and refresh page
        setJoinRequests(prev => prev.filter(r => r.id !== requestId))
        toast.success('Request accepted! Team member added.')
        router.refresh()
      } else {
        setJoinRequests(prev => prev.filter(r => r.id !== requestId))
        toast.success('Request declined')
      }
    } catch (_error) {
      toast.error(`Failed to ${action} request`)
    } finally {
      setProcessingRequest(null)
    }
  }

  const getWhatsAppLink = (name: string) => {
    const message = `Hey ${name}! You have been accepted to ${team.name} at ${hackathon.name}.`
    return `https://wa.me/?text=${encodeURIComponent(message)}`
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{team.name}</h1>
          <p className="text-gray-600">
            {team.description || 'No description provided'}
          </p>
          <div className="mt-4 flex items-center space-x-4">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              {hackathon.name}
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              {members.length} member{members.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Members Section */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900">Team Members ({members.length})</h2>
                {isTeamLead && (
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <UserPlus className="h-4 w-4 mr-1" />
                    Invite Member
                  </button>
                )}
              </div>
              <div className="divide-y divide-gray-200">
                {members.map((member) => (
                  <div key={member.user_id} className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                        {member.profiles.avatar_url ? (
                          <Image
                            src={member.profiles.avatar_url}
                            alt={member.profiles.full_name}
                            width={40}
                            height={40}
                            className="h-10 w-10 rounded-full"
                          />
                        ) : (
                          <span className="text-gray-500 font-medium">
                            {member.profiles.full_name.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-medium text-gray-900">
                            {member.profiles.full_name}
                          </p>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            member.role === 'lead' 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {member.role === 'lead' ? 'Lead' : 'Member'}
                          </span>
                        </div>
                        {member.profiles.college && (
                          <p className="text-sm text-gray-500">{member.profiles.college}</p>
                        )}
                        {member.profiles.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {member.profiles.skills.slice(0, 3).map((skill) => (
                              <span
                                key={skill}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                              >
                                {skill}
                              </span>
                            ))}
                            {member.profiles.skills.length > 3 && (
                              <span className="text-xs text-gray-500">
                                +{member.profiles.skills.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {isTeamLead && member.role !== 'lead' && (
                      <button
                        onClick={() => removeMember(member.user_id)}
                        disabled={removingMember === member.user_id}
                        className="text-red-600 hover:text-red-800 disabled:opacity-50"
                      >
                        {removingMember === member.user_id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <UserMinus className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Join Requests Section (Team Lead Only) */}
            {isTeamLead && (
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900">
                    Join Requests ({joinRequests.length})
                  </h2>
                </div>
                <div className="divide-y divide-gray-200">
                  {joinRequests.length === 0 ? (
                    <div className="px-6 py-8 text-center text-gray-500">
                      No pending join requests
                    </div>
                  ) : (
                    joinRequests.map((request) => (
                      <div key={request.id} className="px-6 py-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-4">
                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                              {request.profiles.avatar_url ? (
                                <Image
                                  src={request.profiles.avatar_url}
                                  alt={request.profiles.full_name}
                                  width={40}
                                  height={40}
                                  className="h-10 w-10 rounded-full"
                                />
                              ) : (
                                <span className="text-gray-500 font-medium">
                                  {request.profiles.full_name.charAt(0)}
                                </span>
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {request.profiles.full_name}
                              </p>
                              {request.profiles.college && (
                                <p className="text-sm text-gray-500">{request.profiles.college}</p>
                              )}
                              {request.profiles.skills.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {request.profiles.skills.slice(0, 4).map((skill) => (
                                    <span
                                      key={skill}
                                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                                    >
                                      {skill}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {request.message && (
                                <p className="text-sm text-gray-600 mt-2">
                                  &quot;{request.message}&quot;
                                </p>
                              )}
                              <p className="text-xs text-gray-400 mt-1">
                                {new Date(request.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleJoinRequest(request.id, 'accept')}
                              disabled={processingRequest === request.id}
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                            >
                              {processingRequest === request.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Check className="h-4 w-4 mr-1" />
                                  Accept
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => handleJoinRequest(request.id, 'decline')}
                              disabled={processingRequest === request.id}
                              className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                            >
                              <X className="h-4 w-4 mr-1" />
                              Decline
                            </button>
                          </div>
                        </div>
                        
                        {/* WhatsApp button shown after accept */}
                        {processingRequest === request.id && (
                          <div className="mt-4">
                            <a
                              href={getWhatsAppLink(request.profiles.full_name)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
                            >
                              <MessageCircle className="h-4 w-4 mr-2" />
                              Message {request.profiles.full_name} on WhatsApp
                            </a>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Ghost Slots Section (Team Lead Only) */}
            {isTeamLead && (
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                  <h2 className="text-lg font-medium text-gray-900">Ghost Slots</h2>
                  <button
                    onClick={() => setShowAddSlotModal(true)}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Slot
                  </button>
                </div>
                <div className="divide-y divide-gray-200">
                  {ghostSlots.length === 0 ? (
                    <div className="px-6 py-4 text-center text-gray-500">
                      No ghost slots created
                    </div>
                  ) : (
                    ghostSlots.map((slot) => (
                      <div key={slot.id} className="px-6 py-4 flex items-center justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-gray-900">{slot.skill_needed}</p>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              slot.filled 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {slot.filled ? 'Filled' : 'Open'}
                            </span>
                          </div>
                          {slot.description && (
                            <p className="text-sm text-gray-500 mt-1">{slot.description}</p>
                          )}
                        </div>
                        {!slot.filled && (
                          <button
                            onClick={() => deleteGhostSlot(slot.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Team Info Card */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Team Info</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Created</dt>
                  <dd className="text-sm text-gray-900">
                    {new Date(team.created_at).toLocaleDateString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Status</dt>
                  <dd className="text-sm text-gray-900 capitalize">{team.status}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Hackathon</dt>
                  <dd className="text-sm text-gray-900">{hackathon.name}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>

        <AddGhostSlotModal
          isOpen={showAddSlotModal}
          onClose={() => setShowAddSlotModal(false)}
          teamId={team.id}
        />

        <InviteMemberModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          teamId={team.id}
          teamName={team.name}
        />
      </div>
    </div>
  )
}