'use client'

import { useState, useEffect } from 'react'
import { 
  Calendar, 
  Users, 
  BookOpen, 
  Award, 
  Presentation, 
  Trophy,
  Clock,
} from 'lucide-react'

type TimelineEvent = {
  id: string
  title: string
  description?: string
  scheduled_at: string
  type: string
}

export default function HackathonTimeline({ events }: { events: TimelineEvent[] }) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date())
    }, 60000) // Update every minute

    return () => clearInterval(timer)
  }, [])

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'registration':
        return <Users className="h-5 w-5" />
      case 'kickoff':
        return <Calendar className="h-5 w-5" />
      case 'mentor_session':
        return <BookOpen className="h-5 w-5" />
      case 'judging_round':
        return <Award className="h-5 w-5" />
      case 'final_presentation':
        return <Presentation className="h-5 w-5" />
      case 'results':
        return <Trophy className="h-5 w-5" />
      default:
        return <Clock className="h-5 w-5" />
    }
  }

  const getEventStatus = (scheduledAt: string) => {
    const eventTime = new Date(scheduledAt)
    const timeDiff = eventTime.getTime() - now.getTime()
    const hoursDiff = timeDiff / (1000 * 60 * 60)

    if (timeDiff < 0) {
      return 'past'
    } else if (hoursDiff < 2) {
      return 'current'
    } else {
      return 'future'
    }
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date)
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Event Schedule</h2>
      
      <div className="flow-root">
        <ul className="-mb-8">
          {events.map((event, eventIdx) => {
            const status = getEventStatus(event.scheduled_at)
            const isLast = eventIdx === events.length - 1
            
            return (
              <li key={event.id}>
                <div className="relative pb-8">
                  {!isLast && (
                    <span
                      className={`absolute top-4 left-4 -ml-px h-full w-0.5 ${
                        status === 'past' ? 'bg-gray-200' : 'bg-gray-300'
                      }`}
                      aria-hidden="true"
                    />
                  )}
                  <div className="relative flex space-x-3">
                    <div>
                      <span
                        className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                          status === 'past'
                            ? 'bg-gray-100 text-gray-500'
                            : status === 'current'
                            ? 'bg-blue-100 text-blue-600 animate-pulse'
                            : 'bg-gray-50 text-gray-400'
                        }`}
                      >
                        {getEventIcon(event.type)}
                      </span>
                    </div>
                    <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                      <div>
                        <p className={`text-sm font-medium ${
                          status === 'past' ? 'text-gray-500' : 'text-gray-900'
                        }`}>
                          {event.title}
                        </p>
                        {event.description && (
                          <p className={`text-sm mt-1 ${
                            status === 'past' ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            {event.description}
                          </p>
                        )}
                      </div>
                      <div className="whitespace-nowrap text-right text-sm">
                        <div className={`font-medium ${
                          status === 'past' ? 'text-gray-400' : 
                          status === 'current' ? 'text-blue-600' : 'text-gray-500'
                        }`}>
                          {formatDateTime(event.scheduled_at)}
                        </div>
                        {status === 'current' && (
                          <div className="text-blue-600 text-xs mt-1">
                            Happening now
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}