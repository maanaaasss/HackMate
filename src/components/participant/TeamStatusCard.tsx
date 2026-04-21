'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Users, ArrowRight } from 'lucide-react'
import { TeamMember } from '@/types'

type Team = {
  id: string
  name: string
  description?: string
  status: string
  team_lead_id: string
  hackathon_id: string
  created_at: string
  member_count: number
  members: TeamMember[]
  user_role: 'lead' | 'member'
}

type Hackathon = {
  id: string
  name: string
  status: string
}

export default function TeamStatusCard({
  currentTeam,
  hackathon,
}: {
  currentTeam?: Team | null
  hackathon?: Hackathon
}) {
  if (!currentTeam) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Team Status</h2>
        <div className="text-center py-6">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 mb-4">
            <Users className="h-6 w-6 text-gray-400" />
          </div>
          <h3 className="text-sm font-medium text-gray-900 mb-2">
            You haven&apos;t joined a team yet
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Find a team to participate in {hackathon?.name || 'the hackathon'}
          </p>
          <Link
            href="/dashboard/browse"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Find a Team
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'forming':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            Forming
          </span>
        )
      case 'full':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Full
          </span>
        )
      case 'submitted':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Submitted
          </span>
        )
      case 'disqualified':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Disqualified
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        )
    }
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-gray-900">Team Status</h2>
        {getStatusBadge(currentTeam.status)}
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">{currentTeam.name}</h3>
          {currentTeam.description && (
            <p className="text-sm text-gray-600 mt-1">{currentTeam.description}</p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="flex -space-x-2">
              {currentTeam.members.slice(0, 3).map((member, _index) => (
                <div
                  key={member.user_id}
                  className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-gray-200 flex items-center justify-center overflow-hidden"
                  title={member.profile?.full_name}
                >
                  {member.profile?.avatar_url ? (
                    <Image
                      src={member.profile.avatar_url}
                      alt={member.profile.full_name || 'User'}
                      width={32}
                      height={32}
                      className="h-8 w-8 rounded-full"
                    />
                  ) : (
                    <span className="text-sm font-medium text-gray-600">
                      {member.profile?.full_name?.charAt(0) || '?'}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <span className="text-sm text-gray-600">
              {currentTeam.member_count} member{currentTeam.member_count !== 1 ? 's' : ''}
            </span>
          </div>

          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            currentTeam.user_role === 'lead' 
              ? 'bg-purple-100 text-purple-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            {currentTeam.user_role === 'lead' ? 'Team Lead' : 'Member'}
          </span>
        </div>

        <div className="pt-4 border-t border-gray-200">
          <Link
            href="/team"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            View Team
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}