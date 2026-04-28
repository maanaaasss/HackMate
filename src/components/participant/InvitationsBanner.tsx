'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, UserPlus, X, Check, Mail } from 'lucide-react'

interface Invitation {
  id: string
  team_id: string
  status: string
  created_at: string
  team: {
    id: string
    name: string
    description: string
  } | null
  hackathon: {
    id: string
    name: string
    status: string
  } | null
  invitedBy: {
    id: string
    full_name: string
    avatar_url: string | null
  } | null
}

export default function InvitationsBanner() {
  const router = useRouter()
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    const fetchInvitations = async () => {
      try {
        const response = await fetch('/api/invitations')
        if (response.ok) {
          const data = await response.json()
          setInvitations(data)
        }
      } catch (error) {
        console.error('Failed to fetch invitations:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchInvitations()
  }, [])

  const handleAccept = async (invitationId: string) => {
    setProcessingId(invitationId)
    try {
      const response = await fetch(`/api/invitations/${invitationId}/accept`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to accept invitation')
      }

      const data = await response.json()
      toast.success(`Welcome to ${data.team?.name || 'the team'}!`)
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId))
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to accept invitation')
    } finally {
      setProcessingId(null)
    }
  }

  const handleDecline = async (invitationId: string) => {
    setProcessingId(invitationId)
    try {
      const response = await fetch(`/api/invitations/${invitationId}/decline`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to decline invitation')
      }

      toast.success('Invitation declined')
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to decline invitation')
    } finally {
      setProcessingId(null)
    }
  }

  if (loading || invitations.length === 0) {
    return null
  }

  return (
    <div className="mb-6 space-y-4">
      {invitations.map((invitation) => (
        <div
          key={invitation.id}
          className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 shadow-sm"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Mail className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Team Invitation
                </p>
                <p className="text-sm text-gray-600">
                  <strong>{invitation.invitedBy?.full_name || 'Someone'}</strong> invited you to join{' '}
                  <strong>{invitation.team?.name || 'a team'}</strong>
                  {invitation.hackathon && (
                    <span> for <strong>{invitation.hackathon.name}</strong></span>
                  )}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(invitation.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => handleAccept(invitation.id)}
                disabled={processingId === invitation.id}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
              >
                {processingId === invitation.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Accept
                  </>
                )}
              </button>
              <button
                onClick={() => handleDecline(invitation.id)}
                disabled={processingId === invitation.id}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                <X className="h-4 w-4 mr-1" />
                Decline
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}