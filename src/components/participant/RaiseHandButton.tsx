'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Hand, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'

type HelpTicket = {
  id: string
  tag: string
  status: 'open' | 'claimed' | 'resolved'
  claimed_by?: string
}

const tagPresets = [
  '#ReactError',
  '#NodeError',
  '#FirebaseIssue',
  '#DatabaseHelp',
  '#DeploymentHelp',
  '#UIHelp',
  '#AlgorithmHelp',
  '#Other',
]

export default function RaiseHandButton({
  teamId,
  hackathonId,
  userId,
}: {
  teamId: string
  hackathonId: string
  userId: string
}) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [selectedTag, setSelectedTag] = useState<string>('')
  const [customTag, setCustomTag] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [existingTicket, setExistingTicket] = useState<HelpTicket | null>(null)

  // Check for existing open/claimed tickets
  useEffect(() => {
    const fetchExistingTicket = async () => {
      const { data } = await supabase
        .from('help_tickets')
        .select('id, tag, status, claimed_by')
        .eq('team_id', teamId)
        .eq('hackathon_id', hackathonId)
        .in('status', ['open', 'claimed'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (data) {
        setExistingTicket(data)
      }
    }

    fetchExistingTicket()

    // Subscribe to ticket changes
    const channel = supabase
      .channel(`team-${teamId}-help-tickets`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'help_tickets',
          filter: `team_id=eq.${teamId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const ticket = payload.new as HelpTicket
            if (ticket.status === 'open' || ticket.status === 'claimed') {
              setExistingTicket(ticket)
              if (ticket.status === 'claimed' && ticket.claimed_by !== userId) {
                toast.info('Mentor is on the way!')
              }
            } else if (ticket.status === 'resolved') {
              setExistingTicket(null)
              toast.success('Issue resolved!')
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [teamId, hackathonId, userId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const tag = selectedTag === '#Other' ? customTag : selectedTag
    if (!tag || !description.trim()) return

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/help-tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_id: teamId,
          hackathon_id: hackathonId,
          tag,
          description: description.trim(),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create ticket')
      }

      const ticket = await response.json()
      toast.success(`A mentor will be with you soon! Ticket #${ticket.id.slice(-6)}`)
      setIsOpen(false)
      setSelectedTag('')
      setCustomTag('')
      setDescription('')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create ticket')
    } finally {
      setIsSubmitting(false)
    }
  }

  // If there's an existing ticket, show status instead of button
  if (existingTicket) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-gray-900">Help Request</h3>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              existingTicket.status === 'open' 
                ? 'bg-yellow-100 text-yellow-800' 
                : 'bg-blue-100 text-blue-800'
            }`}>
              {existingTicket.status === 'open' ? 'Waiting' : 'Mentor on way'}
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-1">
            {existingTicket.tag}
          </p>
          {existingTicket.status === 'claimed' && (
            <p className="text-xs text-gray-500">
              A mentor has claimed your ticket
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Trigger asChild>
        <button className="fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-colors">
          <Hand className="h-6 w-6" />
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl w-full max-w-md p-6">
          <div className="flex justify-between items-center mb-4">
            <Dialog.Title className="text-lg font-semibold text-gray-900">
              Request Mentor Help
            </Dialog.Title>
            <Dialog.Close className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tag Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What do you need help with?
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {tagPresets.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSelectedTag(tag)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      selectedTag === tag
                        ? 'bg-blue-100 text-blue-800 border-2 border-blue-500'
                        : 'bg-gray-100 text-gray-800 border-2 border-transparent hover:bg-gray-200'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              {selectedTag === '#Other' && (
                <input
                  type="text"
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  placeholder="Enter custom tag"
                  className="mt-2 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              )}
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Describe your issue *
              </label>
              <textarea
                id="description"
                rows={4}
                required
                minLength={20}
                maxLength={300}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="What's happening? Include error messages if any..."
              />
              <div className="flex justify-between mt-1">
                <p className="text-xs text-gray-500">
                  Minimum 20 characters
                </p>
                <p className={`text-xs ${description.length > 300 ? 'text-red-600' : 'text-gray-500'}`}>
                  {description.length}/300
                </p>
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-3">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <Dialog.Close className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </Dialog.Close>
              <button
                type="submit"
                disabled={isSubmitting || !selectedTag || !description.trim() || description.length < 20}
                className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Request Help'
                )}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}