'use client'

import Link from 'next/link'
import { Calendar, MapPin, Users, Clock, Plus, ArrowRight, Edit, Eye } from 'lucide-react'

interface Hackathon {
  id: string
  name: string
  description: string
  status: string
  venue: string | null
  start_time: string | null
  end_time: string | null
  registration_deadline: string | null
  submission_deadline: string | null
  min_team_size: number
  max_team_size: number
  max_teams: number | null
  created_at: string
}

interface HackathonListProps {
  hackathons: Hackathon[]
}

export default function HackathonList({ hackathons }: HackathonListProps) {
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
      draft: { label: 'Draft', color: 'bg-gray-100 text-gray-800' },
      published: { label: 'Published', color: 'bg-blue-100 text-blue-800' },
      registration_open: { label: 'Registration Open', color: 'bg-green-100 text-green-800' },
      ongoing: { label: 'Ongoing', color: 'bg-yellow-100 text-yellow-800' },
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

  if (hackathons.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Plus className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Hackathons Yet</h3>
          <p className="text-gray-600 mb-6">
            Get started by creating your first hackathon. You can manage all your hackathons from this dashboard.
          </p>
          <Link
            href="/organiser/setup"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Your First Hackathon
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Your Hackathons</h2>
          <p className="text-gray-600 mt-1">Manage and monitor all your hackathons</p>
        </div>
        <Link
          href="/organiser/setup"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Hackathon
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {hackathons.map((hackathon) => (
          <div
            key={hackathon.id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                  {hackathon.name}
                </h3>
                {getStatusBadge(hackathon.status)}
              </div>
              
              <p className="text-gray-600 text-sm mb-4 line-clamp-2">
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
                </div>
              </div>
              
              <div className="flex space-x-3">
                <Link
                  href={`/organiser/${hackathon.id}`}
                  className="flex-1 inline-flex items-center justify-center py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Details
                </Link>
                <Link
                  href={`/organiser/${hackathon.id}/edit`}
                  className="inline-flex items-center justify-center py-2 px-4 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  <Edit className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}