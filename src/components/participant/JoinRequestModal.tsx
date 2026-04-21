'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

type Team = {
  id: string
  name: string
  ghost_slots: {
    id: string
    skill_needed: string
    description?: string
    filled: boolean
  }[]
}

export default function JoinRequestModal({
  isOpen,
  onClose,
  team,
}: {
  isOpen: boolean
  onClose: () => void
  team: Team
  userId: string
}) {
  const router = useRouter()
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || message.length < 20 || message.length > 500) return

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/join-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_id: team.id,
          ghost_slot_id: selectedSlotId,
          message: message.trim(),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to send join request')
      }

      toast.success('Your request has been sent! The team lead will be notified.')
      router.refresh()
      onClose()
      setMessage('')
      setSelectedSlotId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send join request')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <div className="absolute top-0 right-0 pt-4 pr-4">
            <button
              onClick={onClose}
              className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="sm:flex sm:items-start">
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Request to Join {team.name}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Ghost Slot Selection */}
                {team.ghost_slots.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Which role are you interested in? (optional)
                    </label>
                    <div className="space-y-2">
                      {team.ghost_slots.map(slot => (
                        <div key={slot.id} className="flex items-start">
                          <div className="flex items-center h-5">
                            <input
                              id={`slot-${slot.id}`}
                              name="ghost_slot"
                              type="radio"
                              checked={selectedSlotId === slot.id}
                              onChange={() => setSelectedSlotId(slot.id)}
                              className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                            />
                          </div>
                          <div className="ml-3 text-sm">
                            <label htmlFor={`slot-${slot.id}`} className="font-medium text-gray-700">
                              {slot.skill_needed}
                            </label>
                            {slot.description && (
                              <p className="text-gray-500">{slot.description}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Message */}
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                    Tell the team why you&apos;d be a great fit *
                  </label>
                  <textarea
                    id="message"
                    rows={4}
                    required
                    minLength={20}
                    maxLength={500}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Share your relevant experience, skills, and what you can contribute to the team..."
                  />
                  <div className="flex justify-between mt-1">
                    <p className="text-sm text-gray-500">
                      Minimum 20 characters
                    </p>
                    <p className={`text-sm ${message.length > 500 ? 'text-red-600' : 'text-gray-500'}`}>
                      {message.length}/500
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="rounded-md bg-red-50 p-4">
                    <div className="text-sm text-red-700">{error}</div>
                  </div>
                )}

                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={isSubmitting || !message.trim() || message.length < 20}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Send Request'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}