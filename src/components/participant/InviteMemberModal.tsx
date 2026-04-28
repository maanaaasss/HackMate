'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, X, Mail, UserPlus, Check } from 'lucide-react'

interface InviteMemberModalProps {
  isOpen: boolean
  onClose: () => void
  teamId: string
  teamName: string
}

export default function InviteMemberModal({ isOpen, onClose, teamId, teamName }: InviteMemberModalProps) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [invitedEmails, setInvitedEmails] = useState<string[]>([])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email.trim()) {
      toast.error('Please enter an email address')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/teams/${teamId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitation')
      }

      toast.success(`Invitation sent to ${data.invitedUser?.full_name || email}`)
      setInvitedEmails(prev => [...prev, email.trim()])
      setEmail('')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send invitation')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setEmail('')
    setInvitedEmails([])
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Invite Team Member</h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Invite someone to join <strong>{teamName}</strong>. They must be registered for the hackathon.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="flex space-x-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="user@example.com"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting || !email.trim()}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </form>

          {invitedEmails.length > 0 && (
            <div className="mt-4 p-3 bg-green-50 rounded-md">
              <p className="text-sm font-medium text-green-800 mb-2">Sent Invitations:</p>
              <ul className="space-y-1">
                {invitedEmails.map((invitedEmail, index) => (
                  <li key={index} className="flex items-center text-sm text-green-700">
                    <Check className="h-4 w-4 mr-2 text-green-500" />
                    {invitedEmail}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}