'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Loader2, CheckCircle, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

type Ticket = {
  id: string
  team_id: string
  hackathon_id: string
  tag: string
  description: string
  status: 'open' | 'claimed' | 'resolved'
  claimed_by?: string
  created_at: string
  resolved_at?: string
  team?: {
    id: string
    name: string
  }
}

type Hackathon = {
  id: string
  name: string
  status: string
}

export default function MentorQueueView({
  hackathon,
  tickets: initialTickets,
  mentorId,
}: {
  hackathon: Hackathon
  tickets: Ticket[]
  mentorId: string
}) {
  const router = useRouter()
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets)
  const [claimingTicketId, setClaimingTicketId] = useState<string | null>(null)
  const [resolvingTicketId, setResolvingTicketId] = useState<string | null>(null)

  // Separate tickets into open and my active
  const openTickets = tickets.filter(t => t.status === 'open')
  const myActiveTicket = tickets.find(t => t.status === 'claimed' && t.claimed_by === mentorId)

  // Subscribe to ticket changes
  useEffect(() => {
    const channel = supabase
      .channel(`hackathon-${hackathon.id}-help-tickets`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'help_tickets',
          filter: `hackathon_id=eq.${hackathon.id}`,
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            // Fetch full ticket with team info
            const { data } = await supabase
              .from('help_tickets')
              .select(`
                id,
                team_id,
                hackathon_id,
                tag,
                description,
                status,
                claimed_by,
                created_at,
                resolved_at,
                teams (
                  id,
                  name
                )
              `)
              .eq('id', payload.new.id)
              .single()

            if (data) {
              const newTicket = {
                ...data,
                team: Array.isArray(data.teams) ? data.teams[0] : data.teams,
              }
              setTickets(prev => [newTicket, ...prev])
              toast.info(`New help request: ${newTicket.tag}`)
            }
          } else if (payload.eventType === 'UPDATE') {
            setTickets(prev => prev.map(ticket => {
              if (ticket.id === payload.new.id) {
                return { ...ticket, ...payload.new }
              }
              return ticket
            }))

            // If ticket was claimed by someone else
            if (payload.new.status === 'claimed' && payload.new.claimed_by !== mentorId) {
              toast.info('Ticket claimed by another mentor')
            }

            // If ticket was resolved
            if (payload.new.status === 'resolved') {
              toast.success('Ticket resolved')
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [hackathon.id, mentorId])

  const handleClaim = async (ticketId: string) => {
    setClaimingTicketId(ticketId)
    try {
      const response = await fetch(`/api/help-tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'claimed',
          claimed_by: mentorId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to claim ticket')
      }

      // Re-fetch ticket to check if still claimed by us
      const { data: updatedTicket } = await supabase
        .from('help_tickets')
        .select('claimed_by')
        .eq('id', ticketId)
        .single()

      if (updatedTicket?.claimed_by !== mentorId) {
        toast.error('Ticket was claimed by another mentor')
      } else {
        toast.success('Ticket claimed! You can now help this team.')
      }

      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to claim ticket')
    } finally {
      setClaimingTicketId(null)
    }
  }

  const handleResolve = async (ticketId: string) => {
    setResolvingTicketId(ticketId)
    try {
      const response = await fetch(`/api/help-tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'resolved',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to resolve ticket')
      }

      toast.success('Ticket resolved!')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to resolve ticket')
    } finally {
      setResolvingTicketId(null)
    }
  }

  const getTagColor = (tag: string) => {
    if (tag.includes('React')) return 'bg-blue-100 text-blue-800'
    if (tag.includes('Node')) return 'bg-green-100 text-green-800'
    if (tag.includes('Firebase')) return 'bg-yellow-100 text-yellow-800'
    if (tag.includes('Database')) return 'bg-purple-100 text-purple-800'
    if (tag.includes('Deployment')) return 'bg-pink-100 text-pink-800'
    if (tag.includes('UI')) return 'bg-indigo-100 text-indigo-800'
    if (tag.includes('Algorithm')) return 'bg-red-100 text-red-800'
    return 'bg-gray-100 text-gray-800'
  }

  const formatTimeAgo = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true })
    } catch (_error) {
      return 'some time ago'
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Open Tickets */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Open Tickets ({openTickets.length})
          </h2>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
            <Clock className="h-4 w-4 mr-1" />
            Oldest first
          </span>
        </div>

        <div className="space-y-4">
          {openTickets.length === 0 ? (
            <div className="bg-white shadow rounded-lg p-6 text-center">
              <p className="text-gray-500">No open tickets at the moment</p>
            </div>
          ) : (
            openTickets.map(ticket => (
              <div key={ticket.id} className="bg-white shadow rounded-lg p-6">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {ticket.team?.name || 'Unknown Team'}
                    </h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${getTagColor(ticket.tag)}`}>
                      {ticket.tag}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatTimeAgo(ticket.created_at)}
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 mb-4">
                  {ticket.description}
                </p>

                <div className="flex justify-end">
                  <button
                    onClick={() => handleClaim(ticket.id)}
                    disabled={claimingTicketId === ticket.id || !!myActiveTicket}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {claimingTicketId === ticket.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Claim
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* My Active Ticket */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            My Active Ticket
          </h2>
          {myActiveTicket && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              <CheckCircle className="h-4 w-4 mr-1" />
              Claimed
            </span>
          )}
        </div>

        {myActiveTicket ? (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-medium text-gray-900">
                  {myActiveTicket.team?.name || 'Unknown Team'}
                </h3>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${getTagColor(myActiveTicket.tag)}`}>
                  {myActiveTicket.tag}
                </span>
              </div>
              <span className="text-xs text-gray-500">
                Claimed {formatTimeAgo(myActiveTicket.created_at)}
              </span>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              {myActiveTicket.description}
            </p>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => handleResolve(myActiveTicket.id)}
                disabled={resolvingTicketId === myActiveTicket.id}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                {resolvingTicketId === myActiveTicket.id ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Mark as Resolved
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg p-6 text-center">
            <p className="text-gray-500">
              {myActiveTicket ? 'Loading...' : 'No active ticket. Claim one from the open queue.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}