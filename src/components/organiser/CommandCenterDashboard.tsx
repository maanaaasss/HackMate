'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as AlertDialog from '@radix-ui/react-alert-dialog'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { toast } from 'sonner'
import {
  Users,
  CheckCircle,
  FileText,
  AlertTriangle,
  Lock,
  Clock,
  Gavel,
  Send,
  RefreshCw,
} from 'lucide-react'

type Hackathon = {
  id: string
  name: string
  status: string
  submission_deadline?: string
  end_time?: string
  registration_deadline?: string
}

type Stats = {
  total_teams: number
  checked_in_count: number
  submissions_count: number
  open_tickets_count: number
}

type Announcement = {
  id: string
  title: string
  message: string
  channel: string
  sent_at: string
}

type Submission = {
  id: string
  team_id: string
  github_url: string
  live_url?: string
  description?: string
  submitted_at: string
  health_status: string
  github_healthy?: boolean
  live_url_healthy?: boolean
  teams: {
    id: string
    name: string
  }
}

type SkillCount = {
  skill: string
  count: number
}

type TeamSizeCount = {
  size: number
  count: number
}

export default function CommandCenterDashboard({
  hackathon,
  initialStats,
  initialAnnouncements,
}: {
  hackathon: Hackathon
  initialStats: Stats
  initialAnnouncements: Announcement[]
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'overview' | 'submissions' | 'announcements'>('overview')
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    message: '',
    channel: 'website' as 'website' | 'discord' | 'all',
    discord_webhook_url: '',
  })
  const [isAnnouncementSubmitting, setIsAnnouncementSubmitting] = useState(false)
  const [sortConfig, setSortConfig] = useState<{
    key: string
    direction: 'asc' | 'desc'
  } | null>(null)

  // Fetch live stats every 30 seconds
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['hackathon-stats', hackathon.id],
    queryFn: async () => {
      const response = await fetch(`/api/hackathons/${hackathon.id}/stats`)
      if (!response.ok) throw new Error('Failed to fetch stats')
      return response.json() as Promise<Stats>
    },
    initialData: initialStats,
    refetchInterval: 30000,
  })

  // Fetch submissions
  const { data: submissions, isLoading: submissionsLoading } = useQuery({
    queryKey: ['hackathon-submissions', hackathon.id],
    queryFn: async () => {
      const response = await fetch(`/api/hackathons/${hackathon.id}/submissions`)
      if (!response.ok) throw new Error('Failed to fetch submissions')
      return response.json() as Promise<Submission[]>
    },
    refetchInterval: 30000,
  })

  // Fetch skill distribution
  const { data: skillDistribution, isLoading: skillsLoading } = useQuery({
    queryKey: ['skill-distribution', hackathon.id],
    queryFn: async () => {
      const response = await fetch(`/api/hackathons/${hackathon.id}/skills`)
      if (!response.ok) throw new Error('Failed to fetch skills')
      return response.json() as Promise<SkillCount[]>
    },
  })

  // Fetch team size distribution
  const { data: teamSizeDistribution, isLoading: teamSizesLoading } = useQuery({
    queryKey: ['team-size-distribution', hackathon.id],
    queryFn: async () => {
      const response = await fetch(`/api/hackathons/${hackathon.id}/team-sizes`)
      if (!response.ok) throw new Error('Failed to fetch team sizes')
      return response.json() as Promise<TeamSizeCount[]>
    },
  })

  // Fetch announcements
  const { data: announcements } = useQuery({
    queryKey: ['hackathon-announcements', hackathon.id],
    queryFn: async () => {
      const response = await fetch(`/api/hackathons/${hackathon.id}/announcements`)
      if (!response.ok) throw new Error('Failed to fetch announcements')
      return response.json() as Promise<Announcement[]>
    },
    initialData: initialAnnouncements,
  })

  // Kill switch mutation
  const killSwitchMutation = useMutation({
    mutationFn: async (action: { action: string; minutes?: number }) => {
      const response = await fetch(`/api/hackathons/${hackathon.id}/kill-switch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action),
      })
      if (!response.ok) throw new Error('Failed to execute action')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hackathon-stats', hackathon.id] })
      toast.success('Action completed successfully')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Action failed')
    },
  })

  // Create announcement mutation
  const announcementMutation = useMutation({
    mutationFn: async (data: typeof announcementForm) => {
      const response = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          hackathon_id: hackathon.id,
        }),
      })
      if (!response.ok) throw new Error('Failed to create announcement')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hackathon-announcements', hackathon.id] })
      setAnnouncementForm({
        title: '',
        message: '',
        channel: 'website',
        discord_webhook_url: '',
      })
      toast.success('Announcement sent successfully')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to send announcement')
    },
  })

  // Create judging round mutation
  const judgingRoundMutation = useMutation({
    mutationFn: async (data: { label: string; round_number: number }) => {
      const response = await fetch('/api/judging-rounds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hackathon_id: hackathon.id,
          ...data,
        }),
      })
      if (!response.ok) throw new Error('Failed to create judging round')
      return response.json()
    },
    onSuccess: () => {
      toast.success('Judging round created')
      router.push('/organiser/judging')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create judging round')
    },
  })

  const handleAnnouncementSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!announcementForm.title || !announcementForm.message) return

    setIsAnnouncementSubmitting(true)
    try {
      await announcementMutation.mutateAsync(announcementForm)
    } finally {
      setIsAnnouncementSubmitting(false)
    }
  }

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc'
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const sortedSubmissions = submissions ? [...submissions].sort((a, b) => {
    if (!sortConfig) return 0
    
    const aValue = a[sortConfig.key as keyof Submission] || ''
    const bValue = b[sortConfig.key as keyof Submission] || ''
    
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
    return 0
  }) : []

  const getHealthBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Healthy</span>
      case 'broken':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Broken</span>
      case 'checking':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Checking</span>
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Not submitted</span>
    }
  }

  const getSkillOpacity = (count: number, maxCount: number) => {
    const ratio = count / maxCount
    if (ratio > 0.8) return 'opacity-100'
    if (ratio > 0.6) return 'opacity-80'
    if (ratio > 0.4) return 'opacity-60'
    if (ratio > 0.2) return 'opacity-40'
    return 'opacity-20'
  }

  const maxSkillCount = skillDistribution ? Math.max(...skillDistribution.map(s => s.count)) : 1

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Command Center</h1>
            <p className="text-gray-600">
              {hackathon.name} — {hackathon.status.replace('_', ' ')}
            </p>
          </div>
          <button
            onClick={() => queryClient.invalidateQueries()}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh All
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-8 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'submissions', label: 'Submissions' },
              { id: 'announcements', label: 'Announcements' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'overview' | 'submissions' | 'announcements')}
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-12 w-12 bg-blue-100 rounded-md flex items-center justify-center">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Teams</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {statsLoading ? '...' : stats?.total_teams || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-12 w-12 bg-green-100 rounded-md flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Checked In</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {statsLoading ? '...' : stats?.checked_in_count || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-12 w-12 bg-purple-100 rounded-md flex items-center justify-center">
                    <FileText className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Submissions</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {statsLoading ? '...' : stats?.submissions_count || 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-12 w-12 bg-yellow-100 rounded-md flex items-center justify-center">
                    <AlertTriangle className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Open Tickets</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {statsLoading ? '...' : stats?.open_tickets_count || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Team Size Distribution */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-6">Team Size Distribution</h2>
              <div className="h-64">
                {teamSizesLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500">Loading...</p>
                  </div>
                ) : teamSizeDistribution && teamSizeDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={teamSizeDistribution.map(item => ({
                        name: `${item.size} member${item.size !== 1 ? 's' : ''}`,
                        count: item.count,
                      }))}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={80} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500">No team data available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Skill Heatmap */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-6">Top Skills</h2>
              {skillsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <p className="text-gray-500">Loading skills...</p>
                </div>
              ) : skillDistribution && skillDistribution.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {skillDistribution.slice(0, 20).map((skill) => (
                    <span
                      key={skill.skill}
                      className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800 ${getSkillOpacity(skill.count, maxSkillCount)}`}
                      title={`${skill.count} participant${skill.count !== 1 ? 's' : ''}`}
                    >
                      {skill.skill}
                      <span className="ml-2 bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full text-xs">
                        {skill.count}
                      </span>
                    </span>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-32">
                  <p className="text-gray-500">No skill data available</p>
                </div>
              )}
            </div>

            {/* Quick Controls */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-6">Quick Controls</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <AlertDialog.Root>
                  <AlertDialog.Trigger asChild>
                    <button className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700">
                      <Lock className="h-4 w-4 mr-2" />
                      Lock All Submissions
                    </button>
                  </AlertDialog.Trigger>
                  <AlertDialog.Portal>
                    <AlertDialog.Overlay className="fixed inset-0 bg-black/50" />
                    <AlertDialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                      <AlertDialog.Title className="text-lg font-semibold text-gray-900">
                        Lock All Submissions
                      </AlertDialog.Title>
                      <AlertDialog.Description className="mt-2 text-sm text-gray-600">
                        This will prevent any new submissions or updates. Teams will still be able to view their submissions.
                      </AlertDialog.Description>
                      <div className="mt-6 flex justify-end space-x-3">
                        <AlertDialog.Cancel className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                          Cancel
                        </AlertDialog.Cancel>
                        <AlertDialog.Action
                          onClick={() => killSwitchMutation.mutate({ action: 'lock_submissions' })}
                          className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700"
                        >
                          Lock Submissions
                        </AlertDialog.Action>
                      </div>
                    </AlertDialog.Content>
                  </AlertDialog.Portal>
                </AlertDialog.Root>

                <AlertDialog.Root>
                  <AlertDialog.Trigger asChild>
                    <button className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700">
                      <Clock className="h-4 w-4 mr-2" />
                      Extend Deadline 30 min
                    </button>
                  </AlertDialog.Trigger>
                  <AlertDialog.Portal>
                    <AlertDialog.Overlay className="fixed inset-0 bg-black/50" />
                    <AlertDialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                      <AlertDialog.Title className="text-lg font-semibold text-gray-900">
                        Extend Deadline
                      </AlertDialog.Title>
                      <AlertDialog.Description className="mt-2 text-sm text-gray-600">
                        This will extend the submission deadline by 30 minutes for all teams.
                      </AlertDialog.Description>
                      <div className="mt-6 flex justify-end space-x-3">
                        <AlertDialog.Cancel className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                          Cancel
                        </AlertDialog.Cancel>
                        <AlertDialog.Action
                          onClick={() => killSwitchMutation.mutate({ action: 'extend_deadline', minutes: 30 })}
                          className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700"
                        >
                          Extend Deadline
                        </AlertDialog.Action>
                      </div>
                    </AlertDialog.Content>
                  </AlertDialog.Portal>
                </AlertDialog.Root>

                <AlertDialog.Root>
                  <AlertDialog.Trigger asChild>
                    <button className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                      <Gavel className="h-4 w-4 mr-2" />
                      Open Judging Round
                    </button>
                  </AlertDialog.Trigger>
                  <AlertDialog.Portal>
                    <AlertDialog.Overlay className="fixed inset-0 bg-black/50" />
                    <AlertDialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                      <AlertDialog.Title className="text-lg font-semibold text-gray-900">
                        Open Judging Round
                      </AlertDialog.Title>
                      <AlertDialog.Description className="mt-2 text-sm text-gray-600">
                        This will create a new judging round and redirect you to the judging page.
                      </AlertDialog.Description>
                      <div className="mt-6 flex justify-end space-x-3">
                        <AlertDialog.Cancel className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                          Cancel
                        </AlertDialog.Cancel>
                        <AlertDialog.Action
                          onClick={() => judgingRoundMutation.mutate({ label: 'Round 1', round_number: 1 })}
                          className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                        >
                          Create Round
                        </AlertDialog.Action>
                      </div>
                    </AlertDialog.Content>
                  </AlertDialog.Portal>
                </AlertDialog.Root>
              </div>
            </div>
          </div>
        )}

        {/* Submissions Tab */}
        {activeTab === 'submissions' && (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Submissions</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      onClick={() => handleSort('teams.name')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      Team Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      GitHub
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Live URL
                    </th>
                    <th
                      onClick={() => handleSort('submitted_at')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      Submitted At
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {submissionsLoading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                        Loading submissions...
                      </td>
                    </tr>
                  ) : sortedSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                        No submissions yet
                      </td>
                    </tr>
                  ) : (
                    sortedSubmissions.map((submission) => (
                      <tr key={submission.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {submission.teams?.name || 'Unknown Team'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getHealthBadge(submission.health_status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <a
                            href={submission.github_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 truncate block max-w-xs"
                          >
                            {submission.github_url}
                          </a>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {submission.live_url ? (
                            <a
                              href={submission.live_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 truncate block max-w-xs"
                            >
                              {submission.live_url}
                            </a>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(submission.submitted_at).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Announcements Tab */}
        {activeTab === 'announcements' && (
          <div className="space-y-8">
            {/* Announcement Form */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-6">Send Announcement</h2>
              <form onSubmit={handleAnnouncementSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                      Title *
                    </label>
                    <input
                      id="title"
                      type="text"
                      required
                      value={announcementForm.title}
                      onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="channel" className="block text-sm font-medium text-gray-700">
                      Channel *
                    </label>
                    <select
                      id="channel"
                      value={announcementForm.channel}
                      onChange={(e) => setAnnouncementForm({ ...announcementForm, channel: e.target.value as 'website' | 'discord' | 'all' })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="website">Website Only</option>
                      <option value="discord">Discord Only</option>
                      <option value="all">All Channels</option>
                    </select>
                  </div>
                </div>

                {(announcementForm.channel === 'discord' || announcementForm.channel === 'all') && (
                  <div>
                    <label htmlFor="discord_webhook_url" className="block text-sm font-medium text-gray-700">
                      Discord Webhook URL
                    </label>
                    <input
                      id="discord_webhook_url"
                      type="url"
                      value={announcementForm.discord_webhook_url}
                      onChange={(e) => setAnnouncementForm({ ...announcementForm, discord_webhook_url: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="https://discord.com/api/webhooks/..."
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                    Message *
                  </label>
                  <textarea
                    id="message"
                    rows={4}
                    required
                    value={announcementForm.message}
                    onChange={(e) => setAnnouncementForm({ ...announcementForm, message: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isAnnouncementSubmitting || !announcementForm.title || !announcementForm.message}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isAnnouncementSubmitting ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Send Announcement
                  </button>
                </div>
              </form>
            </div>

            {/* Recent Announcements */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Recent Announcements</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Title
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Channel
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sent At
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {announcements && announcements.length > 0 ? (
                      announcements.map((announcement) => (
                        <tr key={announcement.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {announcement.title}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              announcement.channel === 'discord' ? 'bg-indigo-100 text-indigo-800' :
                              announcement.channel === 'all' ? 'bg-purple-100 text-purple-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {announcement.channel}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(announcement.sent_at).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-6 py-4 text-center text-gray-500">
                          No announcements sent yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}