'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { formatDistanceToNow } from 'date-fns'

type Announcement = {
  id: string
  title: string
  message: string
  sent_at: string
}

export default function AnnouncementsFeed({
  initialAnnouncements,
  hackathonId,
}: {
  initialAnnouncements: Announcement[]
  hackathonId?: string
}) {
  const [announcements, setAnnouncements] = useState<Announcement[]>(initialAnnouncements)

  useEffect(() => {
    if (!hackathonId) return

    // Subscribe to new announcements
    const channel = supabase
      .channel(`hackathon-${hackathonId}-announcements`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'announcements',
          filter: `hackathon_id=eq.${hackathonId}`,
        },
        (payload) => {
          const newAnnouncement = payload.new as Announcement
          setAnnouncements(prev => [newAnnouncement, ...prev.slice(0, 2)]) // Keep only latest 3
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [hackathonId])

  const formatTimeAgo = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true })
    } catch (_error) {
      return 'some time ago'
    }
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Announcements</h2>
      
      {announcements.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-sm text-gray-500">No announcements yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <div
              key={announcement.id}
              className="border border-gray-200 rounded-lg p-4 animate-fade-in"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-sm font-medium text-gray-900">
                  {announcement.title}
                </h3>
                <span className="text-xs text-gray-500">
                  {formatTimeAgo(announcement.sent_at)}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                {announcement.message}
              </p>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}