'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react'

type Hackathon = {
  id: string
  name: string
  status: string
  submission_deadline?: string
  end_time?: string
}

type Team = {
  id: string
  name: string
  hackathon_id: string
}

type Submission = {
  id: string
  team_id: string
  hackathon_id: string
  github_url: string
  live_url?: string
  description?: string
  submitted_at: string
  health_status: 'unchecked' | 'healthy' | 'broken' | 'checking'
  github_healthy?: boolean
  live_url_healthy?: boolean
  last_checked_at?: string
}

export default function SubmissionForm({
  hackathon,
  team,
  existingSubmission,
}: {
  hackathon: Hackathon
  team: Team
  existingSubmission?: Submission | null
}) {
  const queryClient = useQueryClient()
  
  const [githubUrl, setGithubUrl] = useState(existingSubmission?.github_url || '')
  const [liveUrl, setLiveUrl] = useState(existingSubmission?.live_url || '')
  const [description, setDescription] = useState(existingSubmission?.description || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Check if deadline has passed
  const deadline = hackathon.submission_deadline || hackathon.end_time
  const isDeadlinePassed = deadline ? new Date(deadline) < new Date() : false

  // Fetch submission with health status
  const { data: submission } = useQuery({
    queryKey: ['submission', team.id],
    queryFn: async () => {
      if (!existingSubmission?.id) return null
      const response = await fetch(`/api/submissions/${existingSubmission.id}`)
      if (!response.ok) throw new Error('Failed to fetch submission')
      return response.json() as Promise<Submission>
    },
    initialData: existingSubmission,
    refetchInterval: (query) => {
      // Poll every 3 seconds if health_status is checking
      const data = query.state.data
      return data?.health_status === 'checking' ? 3000 : false
    },
  })

  // Create/update submission mutation
  const submitMutation = useMutation({
    mutationFn: async (data: { github_url: string; live_url?: string; description: string }) => {
      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          team_id: team.id,
          hackathon_id: hackathon.id,
        }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to submit project')
      }
      return response.json()
    },
    onSuccess: (data) => {
      toast.success('Project submitted successfully!')
      queryClient.invalidateQueries({ queryKey: ['submission', team.id] })
      
      // Trigger health check
      fetch(`/api/submissions/${data.id}/health-check`, {
        method: 'POST',
      })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to submit project')
    },
  })

  // Health check mutation
  const healthCheckMutation = useMutation({
    mutationFn: async (submissionId: string) => {
      const response = await fetch(`/api/submissions/${submissionId}/health-check`, {
        method: 'POST',
      })
      if (!response.ok) throw new Error('Failed to start health check')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submission', team.id] })
    },
  })

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    // GitHub URL validation
    const githubRegex = /^https:\/\/github\.com\/[\w-]+\/[\w-]+$/
    if (!githubUrl.trim()) {
      newErrors.github_url = 'GitHub URL is required'
    } else if (!githubRegex.test(githubUrl)) {
      newErrors.github_url = 'Enter a valid GitHub repository URL (e.g., https://github.com/username/repo)'
    }

    // Live URL validation (optional)
    if (liveUrl.trim()) {
      try {
        new URL(liveUrl)
      } catch {
        newErrors.live_url = 'Enter a valid URL'
      }
    }

    // Description validation
    if (!description.trim()) {
      newErrors.description = 'Description is required'
    } else if (description.length < 100) {
      newErrors.description = `Description must be at least 100 characters (${description.length}/100)`
    } else if (description.length > 1000) {
      newErrors.description = `Description must be at most 1000 characters (${description.length}/1000)`
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm() || isDeadlinePassed) return

    setIsSubmitting(true)
    try {
      await submitMutation.mutateAsync({
        github_url: githubUrl,
        live_url: liveUrl || undefined,
        description,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleHealthCheck = () => {
    if (submission?.id) {
      healthCheckMutation.mutate(submission.id)
    }
  }

  const getStatusIcon = (status?: boolean) => {
    if (status === undefined) return <Clock className="h-5 w-5 text-gray-400" />
    return status ? (
      <CheckCircle className="h-5 w-5 text-green-500" />
    ) : (
      <XCircle className="h-5 w-5 text-red-500" />
    )
  }

  const getStatusText = (status?: boolean, url?: string) => {
    if (!url) return '— Not provided'
    if (status === undefined) return 'Checking...'
    return status ? 'Accessible' : 'Broken — check your URL'
  }

  const getOverallStatus = () => {
    if (!submission) return null
    
    if (submission.health_status === 'checking') {
      return {
        icon: <Loader2 className="h-5 w-5 animate-spin text-blue-500" />,
        text: 'Checking your links...',
        color: 'text-blue-700',
        bg: 'bg-blue-50',
      }
    }
    
    if (submission.github_healthy === false || (submission.live_url && submission.live_url_healthy === false)) {
      return {
        icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
        text: 'Please fix the broken links before the deadline.',
        color: 'text-red-700',
        bg: 'bg-red-50',
      }
    }
    
    if (submission.github_healthy === true && (!submission.live_url || submission.live_url_healthy === true)) {
      return {
        icon: <CheckCircle className="h-5 w-5 text-green-500" />,
        text: 'Your submission is healthy!',
        color: 'text-green-700',
        bg: 'bg-green-50',
      }
    }
    
    return null
  }

  const overallStatus = getOverallStatus()
  const isEditing = !submission || submission.health_status === 'unchecked'

  // Countdown to deadline
  const [timeLeft, setTimeLeft] = useState('')
  useEffect(() => {
    if (!deadline || isDeadlinePassed) return

    const timer = setInterval(() => {
      const now = new Date()
      const target = new Date(deadline)
      const diff = target.getTime() - now.getTime()

      if (diff <= 0) {
        setTimeLeft('Submissions closed')
        clearInterval(timer)
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
      const minutes = Math.floor((diff / 1000 / 60) % 60)
      const seconds = Math.floor((diff / 1000) % 60)

      setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`)
    }, 1000)

    return () => clearInterval(timer)
  }, [deadline, isDeadlinePassed])

  return (
    <div className="space-y-8">
      {/* Deadline Banner */}
      {isDeadlinePassed ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Submissions closed on {deadline ? new Date(deadline).toLocaleDateString() : 'the deadline'}
              </h3>
            </div>
          </div>
        </div>
      ) : deadline ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-medium text-blue-800">
                Time remaining to submit
              </h3>
              <p className="text-sm text-blue-700 mt-1">
                Deadline: {new Date(deadline).toLocaleString()}
              </p>
            </div>
            <div className="text-2xl font-bold text-blue-900">
              {timeLeft}
            </div>
          </div>
        </div>
      ) : null}

      {/* Submission Form */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            {submission ? 'Your Submission' : 'Submit Your Project'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-6">
          {/* GitHub URL */}
          <div>
            <label htmlFor="github_url" className="block text-sm font-medium text-gray-700">
              GitHub Repository URL *
            </label>
            <input
              id="github_url"
              type="text"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              disabled={isDeadlinePassed || !isEditing}
              className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                errors.github_url ? 'border-red-300' : 'border-gray-300'
              } ${isDeadlinePassed || !isEditing ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              placeholder="https://github.com/username/repository"
            />
            {errors.github_url && (
              <p className="mt-1 text-sm text-red-600">{errors.github_url}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Enter your full GitHub repo URL
            </p>
          </div>

          {/* Live URL */}
          <div>
            <label htmlFor="live_url" className="block text-sm font-medium text-gray-700">
              Live Demo URL (optional)
            </label>
            <input
              id="live_url"
              type="text"
              value={liveUrl}
              onChange={(e) => setLiveUrl(e.target.value)}
              disabled={isDeadlinePassed || !isEditing}
              className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                errors.live_url ? 'border-red-300' : 'border-gray-300'
              } ${isDeadlinePassed || !isEditing ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              placeholder="https://your-app.vercel.app"
            />
            {errors.live_url && (
              <p className="mt-1 text-sm text-red-600">{errors.live_url}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Project Description *
            </label>
            <textarea
              id="description"
              rows={6}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isDeadlinePassed || !isEditing}
              className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                errors.description ? 'border-red-300' : 'border-gray-300'
              } ${isDeadlinePassed || !isEditing ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              placeholder="Describe your project, its features, and the tech stack used..."
            />
            <div className="flex justify-between mt-1">
              {errors.description ? (
                <p className="text-sm text-red-600">{errors.description}</p>
              ) : (
                <p className="text-xs text-gray-500">
                  Minimum 100 characters
                </p>
              )}
              <p className={`text-xs ${description.length > 1000 ? 'text-red-600' : 'text-gray-500'}`}>
                {description.length}/1000
              </p>
            </div>
          </div>

          {/* Submit Button */}
          {!isDeadlinePassed && (
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting || submitMutation.isPending}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {(isSubmitting || submitMutation.isPending) && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
                {submission ? 'Update Submission' : 'Submit Project'}
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Health Status (if submission exists) */}
      {submission && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">Link Health Status</h2>
            {!isDeadlinePassed && submission.health_status !== 'checking' && (
              <button
                onClick={handleHealthCheck}
                disabled={healthCheckMutation.isPending}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {healthCheckMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Clock className="h-4 w-4 mr-1" />
                )}
                Re-check Links
              </button>
            )}
          </div>

          <div className="px-6 py-4 space-y-4">
            {/* GitHub URL Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getStatusIcon(submission.github_healthy)}
                <div>
                  <p className="text-sm font-medium text-gray-900">GitHub Repository</p>
                  <p className="text-sm text-gray-500 truncate max-w-md">{submission.github_url}</p>
                </div>
              </div>
              <span className={`text-sm ${
                submission.github_healthy === true ? 'text-green-600' :
                submission.github_healthy === false ? 'text-red-600' : 'text-gray-500'
              }`}>
                {getStatusText(submission.github_healthy, submission.github_url)}
              </span>
            </div>

            {/* Live URL Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getStatusIcon(submission.live_url_healthy)}
                <div>
                  <p className="text-sm font-medium text-gray-900">Live Demo</p>
                  <p className="text-sm text-gray-500 truncate max-w-md">
                    {submission.live_url || '— Not provided'}
                  </p>
                </div>
              </div>
              <span className={`text-sm ${
                submission.live_url_healthy === true ? 'text-green-600' :
                submission.live_url_healthy === false ? 'text-red-600' : 'text-gray-500'
              }`}>
                {getStatusText(submission.live_url_healthy, submission.live_url)}
              </span>
            </div>

            {/* Overall Status */}
            {overallStatus && (
              <div className={`mt-6 p-4 rounded-md ${overallStatus.bg}`}>
                <div className="flex">
                  <div className="flex-shrink-0">
                    {overallStatus.icon}
                  </div>
                  <div className="ml-3">
                    <p className={`text-sm font-medium ${overallStatus.color}`}>
                      {overallStatus.text}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Last checked */}
            {submission.last_checked_at && (
              <p className="text-xs text-gray-500 text-right">
                Last checked: {new Date(submission.last_checked_at).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}