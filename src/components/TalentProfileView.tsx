'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { 
  Code, 
  ExternalLink, 
  RefreshCw, 
  Edit, 
  Star, 
  Award,
  Download,
  Users,
  BookOpen
} from 'lucide-react'

type GitHubData = {
  public_repos: number
  followers: number
  bio?: string
  top_repos: {
    name: string
    description?: string
    language?: string
    stars: number
  }[]
  last_synced_at: string
}

type Profile = {
  id: string
  full_name: string
  avatar_url?: string
  role: string
  github_username?: string
  skills: string[]
  bio?: string
  college?: string
  year_of_study?: number
  github_data?: GitHubData
  created_at: string
}

type HackathonHistory = {
  team_id: string
  team_name: string
  role: string
  hackathon: {
    id: string
    name: string
    status: string
  } | null
  certificate: {
    id: string
    type: 'winner' | 'runner_up' | 'participant'
    rank?: number
    pdf_url?: string
  } | null
}

type TalentProfileViewProps = {
  profile: Profile
  hackathonHistory: HackathonHistory[]
  isOwnProfile: boolean
  currentUserId?: string
}

const languageColors: Record<string, string> = {
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  Python: '#3572A5',
  Java: '#b07219',
  'C++': '#f34b7d',
  C: '#555555',
  'C#': '#178600',
  Ruby: '#701516',
  Go: '#00ADD8',
  Rust: '#dea584',
  Swift: '#ffac45',
  Kotlin: '#A97BFF',
  PHP: '#4F5D95',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Vue: '#41b883',
  Shell: '#89e051',
  Dart: '#00B4AB',
}

const roleColors: Record<string, string> = {
  participant: 'bg-blue-100 text-blue-800',
  organiser: 'bg-purple-100 text-purple-800',
  judge: 'bg-yellow-100 text-yellow-800',
  mentor: 'bg-green-100 text-green-800',
  sponsor: 'bg-pink-100 text-pink-800',
}

const certificateColors: Record<string, string> = {
  winner: 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white',
  runner_up: 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-900',
  participant: 'bg-blue-100 text-blue-800',
}

export default function TalentProfileView({
  profile,
  hackathonHistory,
  isOwnProfile,
  currentUserId,
}: TalentProfileViewProps) {
  const queryClient = useQueryClient()
  const [localCodeData, setLocalCodeData] = useState<GitHubData | undefined>(profile.github_data)

  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/profile/sync-github', {
        method: 'POST',
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to sync GitHub')
      }
      return response.json() as Promise<GitHubData>
    },
    onSuccess: (data) => {
      setLocalCodeData(data)
      toast.success('GitHub data synced successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const githubData = localCodeData || profile.github_data

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 h-32" />
          <div className="px-6 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-end sm:space-x-6 -mt-16">
              {/* Avatar */}
              <div className="relative">
                {profile.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={profile.full_name}
                    width={128}
                    height={128}
                    className="rounded-full border-4 border-white shadow-lg"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gray-200 border-4 border-white shadow-lg flex items-center justify-center">
                    <span className="text-4xl font-bold text-gray-400">
                      {profile.full_name.charAt(0)}
                    </span>
                  </div>
                )}
              </div>

              {/* Name and badges */}
              <div className="mt-4 sm:mt-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold text-gray-900">
                    {profile.full_name}
                  </h1>
                  {profile.college && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {profile.college}
                    </span>
                  )}
                  {profile.year_of_study && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                      Year {profile.year_of_study}
                    </span>
                  )}
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleColors[profile.role] || 'bg-gray-100 text-gray-800'}`}>
                    {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
                  </span>
                </div>

                {/* Action buttons */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {profile.github_username && (
                    <a
                      href={`https://github.com/${profile.github_username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <Code className="w-4 h-4 mr-1" />
                      GitHub Profile
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  )}
                  
                  {isOwnProfile && (
                    <>
                      {profile.github_username && (
                        <button
                          onClick={() => syncMutation.mutate()}
                          disabled={syncMutation.isPending}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                        >
                          <RefreshCw className={`w-4 h-4 mr-1 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                          {syncMutation.isPending ? 'Syncing...' : 'Sync GitHub'}
                        </button>
                      )}
                      <Link
                        href="/profile"
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit Profile
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Bio */}
            {profile.bio && (
              <p className="mt-6 text-gray-600">{profile.bio}</p>
            )}
          </div>
        </div>

        {/* Skills */}
        {profile.skills && profile.skills.length > 0 && (
          <div className="mt-6 bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Skills</h2>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((skill, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* GitHub Stats */}
        {githubData && (
          <div className="mt-6 bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">GitHub Activity</h2>
              <span className="text-sm text-gray-500">
                Last synced {formatDistanceToNow(new Date(githubData.last_synced_at), { addSuffix: true })}
              </span>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">{githubData.public_repos}</div>
                <div className="text-sm text-gray-500">public repos</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">{githubData.followers}</div>
                <div className="text-sm text-gray-500">followers</div>
              </div>
            </div>

            {/* Top Repos */}
            {githubData.top_repos && githubData.top_repos.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Top Repositories</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {githubData.top_repos.map((repo, index) => (
                    <a
                      key={index}
                      href={`https://github.com/${profile.github_username}/${repo.name}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <h4 className="text-sm font-medium text-gray-900 truncate flex-1">
                          {repo.name}
                        </h4>
                        <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
                      </div>
                      {repo.description && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {repo.description}
                        </p>
                      )}
                      <div className="flex items-center mt-2 space-x-3">
                        {repo.language && (
                          <span className="inline-flex items-center text-xs">
                            <span
                              className="w-3 h-3 rounded-full mr-1"
                              style={{ backgroundColor: languageColors[repo.language] || '#8b8b8b' }}
                            />
                            {repo.language}
                          </span>
                        )}
                        <span className="inline-flex items-center text-xs text-gray-500">
                          <Star className="w-3 h-3 mr-1" />
                          {repo.stars}
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Hackathon History */}
        <div className="mt-6 bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Hackathon History</h2>
          
          {hackathonHistory.length === 0 ? (
            <p className="text-gray-500 text-sm">No hackathon participation yet.</p>
          ) : (
            <div className="space-y-4">
              {hackathonHistory.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">
                        {item.hackathon?.name || 'Unknown Hackathon'}
                      </h3>
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <span>Team: {item.team_name}</span>
                        <span>•</span>
                        <span className="capitalize">{item.role}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {item.certificate && (
                      <>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${certificateColors[item.certificate.type]}`}>
                          <Award className="w-3 h-3 mr-1" />
                          {item.certificate.type === 'winner' 
                            ? `1st Place` 
                            : item.certificate.type === 'runner_up' 
                              ? `2nd Place` 
                              : 'Participant'}
                        </span>
                        {item.certificate.pdf_url && (
                          <a
                            href={item.certificate.pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
