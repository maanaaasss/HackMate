'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useQuery } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { 
  Users, 
  Code, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp,
  ExternalLink,
  Clock,
  GitCommit
} from 'lucide-react'
import MentorQueueView from './MentorQueueView'

type Team = {
  id: string
  name: string
  description?: string
  status: string
  members: {
    user_id: string
    role: 'lead' | 'member'
    profile: {
      id: string
      full_name: string
      avatar_url?: string
    } | null
  }[]
  submission?: {
    id: string
    github_url?: string
    live_url?: string
    health_status: string
  } | null
}

type Hackathon = {
  id: string
  name: string
  status: string
}

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

type GitHubActivity = {
  repo_url: string
  last_commit_at: string | null
  last_commit_message: string | null
  commit_count_24h: number
  last_5_commits: {
    sha: string
    message: string
    author: string
    committed_at: string
  }[]
  inactive_hours: number
  alert: boolean
}

type MentorDashboardViewProps = {
  hackathon: Hackathon
  teams: Team[]
  tickets: Ticket[]
  mentorId: string
}

export default function MentorDashboardView({
  hackathon,
  teams,
  tickets,
  mentorId,
}: MentorDashboardViewProps) {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Mentor Dashboard</h1>
          <p className="text-gray-600">
            Monitor team progress and help participants with their issues.
          </p>
        </div>

        {/* Teams Grid */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Teams</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map(team => (
              <TeamCard key={team.id} team={team} />
            ))}
          </div>
          {teams.length === 0 && (
            <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
              No teams found in this hackathon.
            </div>
          )}
        </div>

        {/* Help Queue */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Help Queue</h2>
          <MentorQueueView
            hackathon={hackathon}
            tickets={tickets}
            mentorId={mentorId}
          />
        </div>
      </div>
    </div>
  )
}

function TeamCard({ team }: { team: Team }) {
  const [showCommits, setShowCommits] = useState(false)

  // Fetch GitHub activity for this team
  const { data: githubActivity, isLoading: activityLoading } = useQuery<GitHubActivity>({
    queryKey: ['github-activity', team.id],
    queryFn: async () => {
      const response = await fetch(`/api/github/activity/${team.id}`)
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch GitHub activity')
      }
      return response.json()
    },
    enabled: !!team.submission?.github_url,
    staleTime: 15 * 60 * 1000, // 15 minutes
  })

  const getActivityBarWidth = (commitCount: number) => {
    if (commitCount === 0) return '0%'
    if (commitCount <= 3) return '30%'
    if (commitCount <= 8) return '60%'
    return '100%'
  }

  const getActivityBarColor = (commitCount: number) => {
    if (commitCount === 0) return 'bg-gray-300'
    if (commitCount <= 3) return 'bg-yellow-400'
    if (commitCount <= 8) return 'bg-blue-400'
    return 'bg-green-500'
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Alert Banner */}
      {githubActivity?.alert && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2">
          <div className="flex items-center text-red-700 text-sm">
            <AlertTriangle className="w-4 h-4 mr-2" />
            No commits in 6+ hours — consider checking in
          </div>
        </div>
      )}

      <div className="p-4">
        {/* Team Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">{team.name}</h3>
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
            team.status === 'forming' ? 'bg-yellow-100 text-yellow-800' :
            team.status === 'full' ? 'bg-blue-100 text-blue-800' :
            team.status === 'submitted' ? 'bg-green-100 text-green-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {team.status}
          </span>
        </div>

        {/* Team Members */}
        <div className="mb-4">
          <div className="flex items-center text-sm text-gray-500 mb-2">
            <Users className="w-4 h-4 mr-1" />
            {team.members.length} members
          </div>
          <div className="flex -space-x-2">
            {team.members.slice(0, 5).map((member, index) => (
              <div
                key={member.user_id}
                className="relative"
                style={{ zIndex: 5 - index }}
              >
                {member.profile?.avatar_url ? (
                  <Image
                    src={member.profile.avatar_url}
                    alt={member.profile?.full_name || 'Member'}
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-full border-2 border-white"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center">
                    <span className="text-xs font-medium text-gray-600">
                      {member.profile?.full_name?.charAt(0) || '?'}
                    </span>
                  </div>
                )}
              </div>
            ))}
            {team.members.length > 5 && (
              <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center">
                <span className="text-xs font-medium text-gray-600">
                  +{team.members.length - 5}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* GitHub Activity */}
        {team.submission?.github_url ? (
          <div className="border-t pt-4">
            {activityLoading ? (
              <div className="flex items-center text-sm text-gray-500">
                <Code className="w-4 h-4 mr-2" />
                Loading activity...
              </div>
            ) : githubActivity ? (
              <div>
                {/* Repo Link */}
                <a
                  href={githubActivity.repo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-sm text-blue-600 hover:text-blue-700 mb-2"
                >
                  <Code className="w-4 h-4 mr-1" />
                  View Repository
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>

                {/* Last Commit */}
                {githubActivity.last_commit_message ? (
                  <div className="mb-3">
                    <div className="flex items-center text-sm text-gray-600 mb-1">
                      <GitCommit className="w-4 h-4 mr-1" />
                      <span className="truncate flex-1">
                        {githubActivity.last_commit_message}
                      </span>
                    </div>
                    <div className="flex items-center text-xs text-gray-400">
                      <Clock className="w-3 h-3 mr-1" />
                      {githubActivity.last_commit_at 
                        ? formatDistanceToNow(new Date(githubActivity.last_commit_at), { addSuffix: true })
                        : 'No commits'
                      }
                      <span className="mx-2">•</span>
                      {githubActivity.commit_count_24h} commits in 24h
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 mb-3">No commits yet</div>
                )}

                {/* Activity Bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Activity Level</span>
                    <span>{githubActivity.commit_count_24h} commits</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${getActivityBarColor(githubActivity.commit_count_24h)}`}
                      style={{ width: getActivityBarWidth(githubActivity.commit_count_24h) }}
                    />
                  </div>
                </div>

                {/* View Commits Button */}
                <button
                  onClick={() => setShowCommits(!showCommits)}
                  className="flex items-center text-sm text-gray-600 hover:text-gray-900"
                >
                  {showCommits ? (
                    <>
                      <ChevronUp className="w-4 h-4 mr-1" />
                      Hide Latest Commits
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4 mr-1" />
                      View Latest Commits
                    </>
                  )}
                </button>

                {/* Commits List */}
                {showCommits && githubActivity.last_5_commits.length > 0 && (
                  <div className="mt-3 space-y-2 border-t pt-3">
                    {githubActivity.last_5_commits.map((commit, index) => (
                      <div key={index} className="text-xs">
                        <div className="flex items-center text-gray-700">
                          <code className="bg-gray-100 px-1 rounded mr-2">{commit.sha}</code>
                          <span className="truncate flex-1">{commit.message}</span>
                        </div>
                        <div className="text-gray-400 mt-1">
                          {commit.author} • {formatDistanceToNow(new Date(commit.committed_at), { addSuffix: true })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-gray-500">
                <Code className="w-4 h-4 inline mr-1" />
                Unable to fetch activity
              </div>
            )}
          </div>
        ) : (
          <div className="border-t pt-4 text-sm text-gray-500">
            No submission yet
          </div>
        )}
      </div>
    </div>
  )
}
