'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import * as Slider from '@radix-ui/react-slider'
import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ExternalLink, CheckCircle, AlertTriangle, Clock, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

type RubricItem = {
  id: string
  label: string
  description?: string
  max_score: number
  weight: number
  sort_order: number
}

type Score = {
  id?: string
  rubric_item_id: string
  value: number
  notes?: string
}

type Team = {
  id: string
  name: string
  hackathon_id: string
}

type Submission = {
  id: string
  github_url: string
  live_url?: string
  description?: string
  health_status: string
  github_healthy?: boolean
  live_url_healthy?: boolean
  submitted_at: string
}

type Round = {
  id: string
  label: string
  round_number: number
  is_final: boolean
}

type Hackathon = {
  id: string
  name: string
}

type GitHubActivity = {
  last_commit_message?: string
  last_commit_time?: string
  is_active: boolean
}

export default function EvaluationInterface({
  hackathon,
  activeRound,
  team,
  submission,
  rubricItems,
  existingScores,
  blindMapping,
  previousTeam,
  nextTeam,
}: {
  hackathon: Hackathon
  activeRound: Round
  team: Team
  submission?: Submission | null
  rubricItems: RubricItem[]
  existingScores: Score[]
  blindMapping?: { anonymous_name: string } | null
  previousTeam?: { id: string; name: string } | null
  nextTeam?: { id: string; name: string } | null
  judgeId: string
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  
  // Initialize scores from existing data
  const initialScores: Record<string, number> = {}
  rubricItems.forEach(item => {
    const existingScore = existingScores.find(s => s.rubric_item_id === item.id)
    initialScores[item.id] = existingScore?.value || 0
  })
  
  const [scores, setScores] = useState<Record<string, number>>(initialScores)
  const [notes, setNotes] = useState(existingScores.length > 0 && existingScores[0].notes ? existingScores[0].notes : '')
  const [isSealed, setIsSealed] = useState(false)
  const [showSealDialog, setShowSealDialog] = useState(false)

  // Check if scores are sealed (all items have scores and no changes)
  useEffect(() => {
    const allScored = rubricItems.every(item => {
      const existingScore = existingScores.find(s => s.rubric_item_id === item.id)
      return existingScore && existingScore.value > 0
    })
    setIsSealed(allScored && existingScores.length === rubricItems.length)
  }, [rubricItems, existingScores])

  // Fetch GitHub activity
  const { data: githubActivity, isLoading: githubLoading } = useQuery({
    queryKey: ['github-activity', team.id],
    queryFn: async () => {
      const response = await fetch(`/api/github/activity/${team.id}`)
      if (!response.ok) throw new Error('Failed to fetch GitHub activity')
      return response.json() as Promise<GitHubActivity>
    },
    enabled: !!submission?.github_url,
  })

  // Seal scores mutation
  const sealMutation = useMutation({
    mutationFn: async (data: { scores: Score[]; notes: string }) => {
      const response = await fetch('/api/scores/seal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          round_id: activeRound.id,
          team_id: team.id,
          scores: data.scores,
          notes: data.notes,
        }),
      })
      if (!response.ok) throw new Error('Failed to seal scores')
      return response.json()
    },
    onSuccess: () => {
      toast.success('Scores sealed successfully!')
      setIsSealed(true)
      setShowSealDialog(false)
      queryClient.invalidateQueries({ queryKey: ['judge-dashboard'] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to seal scores')
    },
  })

  const handleScoreChange = (itemId: string, value: number) => {
    if (isSealed) return
    setScores(prev => ({ ...prev, [itemId]: value }))
  }

  const calculateTotalScore = () => {
    let total = 0
    rubricItems.forEach(item => {
      const score = scores[item.id] || 0
      const contribution = (score / item.max_score) * item.weight
      total += contribution
    })
    return total
  }

  const calculateItemContribution = (item: RubricItem) => {
    const score = scores[item.id] || 0
    return ((score / item.max_score) * item.weight).toFixed(1)
  }

  const allItemsScored = rubricItems.every(item => {
    const score = scores[item.id] || 0
    return score > 0
  })

  const handleSeal = () => {
    const scoresArray: Score[] = rubricItems.map(item => ({
      rubric_item_id: item.id,
      value: scores[item.id] || 0,
    }))
    
    sealMutation.mutate({
      scores: scoresArray,
      notes,
    })
  }

  const displayName = blindMapping?.anonymous_name || team.name

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header with Navigation */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{displayName}</h1>
            <p className="text-gray-600">
              {hackathon.name} — {activeRound.label}
            </p>
          </div>
          <div className="flex space-x-2">
            {previousTeam && (
              <button
                onClick={() => router.push(`/judge/evaluate/${previousTeam.id}`)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </button>
            )}
            {nextTeam && (
              <button
                onClick={() => router.push(`/judge/evaluate/${nextTeam.id}`)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </button>
            )}
          </div>
        </div>

        {/* Sealed Banner */}
        {isSealed && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
            <div className="flex">
              <div className="flex-shrink-0">
                <CheckCircle className="h-5 w-5 text-green-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">
                  Your evaluation has been recorded.
                </h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>Your scores for this team have been sealed and cannot be changed.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel (60%) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Project Info */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Project Details</h2>
              
              {submission ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-1">GitHub Repository</h3>
                    <a
                      href={submission.github_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-blue-600 hover:text-blue-800"
                    >
                      {submission.github_url}
                      <ExternalLink className="ml-1 h-4 w-4" />
                    </a>
                  </div>

                  {submission.live_url && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-1">Live Demo</h3>
                      <a
                        href={submission.live_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-blue-600 hover:text-blue-800"
                      >
                        {submission.live_url}
                        <ExternalLink className="ml-1 h-4 w-4" />
                      </a>
                    </div>
                  )}

                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-1">Description</h3>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">
                      {submission.description || 'No description provided'}
                    </p>
                  </div>

                  {/* GitHub Activity */}
                  <div className="pt-4 border-t border-gray-200">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">GitHub Activity</h3>
                    {githubLoading ? (
                      <p className="text-sm text-gray-500">Loading...</p>
                    ) : githubActivity ? (
                      <div className="space-y-2">
                        {githubActivity.last_commit_message && (
                          <div className="flex items-start space-x-2">
                            <Clock className="h-4 w-4 text-gray-400 mt-0.5" />
                            <div>
                              <p className="text-sm text-gray-900">
                                Last commit: {githubActivity.last_commit_message}
                              </p>
                              {githubActivity.last_commit_time && (
                                <p className="text-xs text-gray-500">
                                  {formatDistanceToNow(new Date(githubActivity.last_commit_time), { addSuffix: true })}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                        {!githubActivity.is_active && (
                          <div className="flex items-start space-x-2 text-yellow-600">
                            <AlertTriangle className="h-4 w-4 mt-0.5" />
                            <p className="text-sm">
                              No commits in the last 6 hours
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No GitHub activity data</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No submission found for this team</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel (40%) */}
          <div className="space-y-6">
            {/* Scoring Panel */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Evaluation</h2>
                <span className="text-sm font-medium text-gray-600">
                  {activeRound.label}
                </span>
              </div>

              <div className="space-y-6">
                {rubricItems.map(item => (
                  <div key={item.id} className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">{item.label}</h3>
                        {item.description && (
                          <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {item.weight}% of total
                      </span>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="flex-1">
                        <Slider.Root
                          className="relative flex items-center select-none touch-none w-full h-5"
                          max={item.max_score}
                          step={1}
                          value={[scores[item.id] || 0]}
                          onValueChange={(value) => handleScoreChange(item.id, value[0])}
                          disabled={isSealed}
                        >
                          <Slider.Track className="bg-gray-200 relative grow rounded-full h-1">
                            <Slider.Range className="absolute bg-blue-600 rounded-full h-full" />
                          </Slider.Track>
                          <Slider.Thumb
                            className="block w-5 h-5 bg-white border-2 border-blue-600 rounded-full shadow hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                          />
                        </Slider.Root>
                      </div>
                      <div className="w-20 text-right">
                        <span className="text-sm font-medium text-gray-900">
                          {scores[item.id] || 0} / {item.max_score}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 text-right">
                      Contribution: {calculateItemContribution(item)} pts
                    </div>
                  </div>
                ))}

                {/* Total Score */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">Total Score</h3>
                    <span className="text-2xl font-bold text-blue-600">
                      {calculateTotalScore().toFixed(1)}
                    </span>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                    Overall Notes
                  </label>
                  <textarea
                    id="notes"
                    rows={4}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={isSealed}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="What stood out about this project?"
                  />
                </div>

                {/* Seal Button */}
                <div className="pt-4">
                  <AlertDialog.Root open={showSealDialog} onOpenChange={setShowSealDialog}>
                    <AlertDialog.Trigger asChild>
                      <button
                        disabled={isSealed || !allItemsScored || sealMutation.isPending}
                        className={`w-full inline-flex justify-center items-center px-4 py-2 border text-sm font-medium rounded-md disabled:opacity-50 ${
                          isSealed
                            ? 'border-transparent text-white bg-green-600 cursor-default'
                            : allItemsScored
                            ? 'border-transparent text-white bg-blue-600 hover:bg-blue-700'
                            : 'border-gray-300 text-gray-500 bg-white'
                        }`}
                      >
                        {isSealed ? (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Scores Sealed ✓
                          </>
                        ) : (
                          'Review & Seal'
                        )}
                      </button>
                    </AlertDialog.Trigger>
                    <AlertDialog.Portal>
                      <AlertDialog.Overlay className="fixed inset-0 bg-black/50" />
                      <AlertDialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                        <AlertDialog.Title className="text-lg font-semibold text-gray-900">
                          Seal Scores
                        </AlertDialog.Title>
                        <AlertDialog.Description className="mt-2 text-sm text-gray-600">
                          Once sealed, your scores for this team cannot be changed. This action cannot be undone.
                        </AlertDialog.Description>
                        <div className="mt-6 flex justify-end space-x-3">
                          <AlertDialog.Cancel className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                            Cancel
                          </AlertDialog.Cancel>
                          <AlertDialog.Action
                            onClick={handleSeal}
                            className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                          >
                            Seal Scores
                          </AlertDialog.Action>
                        </div>
                      </AlertDialog.Content>
                    </AlertDialog.Portal>
                  </AlertDialog.Root>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}