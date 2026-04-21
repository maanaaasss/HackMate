'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as Switch from '@radix-ui/react-switch'
import { toast } from 'sonner'
import { CheckCircle, Circle, Plus, Lock, Unlock } from 'lucide-react'

type Round = {
  id: string
  hackathon_id: string
  round_number: number
  label: string
  is_final: boolean
  opened_at?: string
  closed_at?: string
}

type Team = {
  id: string
  name: string
}

type Judge = {
  judge_id: string
  profile: {
    id: string
    full_name: string
    avatar_url?: string
  }
}

type BlindMapping = {
  team_id: string
  anonymous_name: string
}

type Hackathon = {
  id: string
  name: string
}

export default function JudgingControlPanel({
  hackathon,
  rounds,
  teams,
  judges,
  scores,
  blindMappings,
}: {
  hackathon: Hackathon
  rounds: Round[]
  teams: Team[]
  judges: Judge[]
  scores: { judge_id: string; team_id: string }[]
  blindMappings: BlindMapping[]
}) {
  const queryClient = useQueryClient()
  const [isBlindMode, setIsBlindMode] = useState(blindMappings.length > 0)

  // Round management mutations
  const roundMutation = useMutation({
    mutationFn: async (data: { roundId?: string; action: string; roundData?: { round_number: number; label: string; is_final: boolean } }) => {
      if (data.action === 'create') {
        const response = await fetch('/api/judging-rounds', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hackathon_id: hackathon.id,
            ...data.roundData,
          }),
        })
        if (!response.ok) throw new Error('Failed to create round')
        return response.json()
      } else {
        const response = await fetch(`/api/judging-rounds/${data.roundId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: data.action }),
        })
        if (!response.ok) throw new Error('Failed to update round')
        return response.json()
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['judging-rounds', hackathon.id] })
      toast.success('Round updated successfully')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update round')
    },
  })

  // Blind mode mutation
  const blindModeMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const response = await fetch(`/api/hackathons/${hackathon.id}/blind-mode`, {
        method: enabled ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!response.ok) throw new Error('Failed to update blind mode')
      return response.json()
    },
    onSuccess: (_, enabled) => {
      setIsBlindMode(enabled)
      queryClient.invalidateQueries({ queryKey: ['blind-mappings', hackathon.id] })
      toast.success(enabled ? 'Blind mode enabled' : 'Blind mode disabled')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update blind mode')
    },
  })

  const handleOpenRound = (roundId: string) => {
    roundMutation.mutate({ roundId, action: 'open' })
  }

  const handleCloseRound = (roundId: string) => {
    roundMutation.mutate({ roundId, action: 'close' })
  }

  const handleAddFinalRound = () => {
    const nextRoundNumber = rounds.length > 0 ? Math.max(...rounds.map(r => r.round_number)) + 1 : 1
    roundMutation.mutate({
      action: 'create',
      roundData: {
        round_number: nextRoundNumber,
        label: 'Final Presentation',
        is_final: true,
      },
    })
  }

  const getAnonymousName = (teamId: string) => {
    const mapping = blindMappings.find(m => m.team_id === teamId)
    return mapping?.anonymous_name || 'Unknown'
  }

  const getTeamName = (teamId: string) => {
    const team = teams.find(t => t.id === teamId)
    return team?.name || 'Unknown Team'
  }

  const getDisplayName = (teamId: string) => {
    return isBlindMode ? getAnonymousName(teamId) : getTeamName(teamId)
  }

  const hasScored = (judgeId: string, teamId: string) => {
    return scores.some(score => score.judge_id === judgeId && score.team_id === teamId)
  }

  const currentRound = rounds.find(r => !r.closed_at && r.opened_at)

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Judging Control Panel</h1>
            <p className="text-gray-600">
              {hackathon.name} — Manage judging rounds and monitor progress
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Round Management */}
          <div className="lg:col-span-2 space-y-8">
            {/* Round Management */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900">Judging Rounds</h2>
                <button
                  onClick={handleAddFinalRound}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Final Round
                </button>
              </div>
              <div className="divide-y divide-gray-200">
                {rounds.length === 0 ? (
                  <div className="px-6 py-8 text-center text-gray-500">
                    No judging rounds created yet
                  </div>
                ) : (
                  rounds.map(round => (
                    <div key={round.id} className="px-6 py-4 flex items-center justify-between">
                      <div>
                        <div className="flex items-center space-x-3">
                          <h3 className="text-sm font-medium text-gray-900">
                            Round {round.round_number}: {round.label}
                          </h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            round.closed_at 
                              ? 'bg-gray-100 text-gray-800' 
                              : round.opened_at 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {round.closed_at ? 'Closed' : round.opened_at ? 'Open' : 'Not Started'}
                          </span>
                          {round.is_final && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              Final
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {round.opened_at ? `Opened: ${new Date(round.opened_at).toLocaleString()}` : 'Not opened yet'}
                          {round.closed_at && ` • Closed: ${new Date(round.closed_at).toLocaleString()}`}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        {!round.opened_at && !round.closed_at && (
                          <button
                            onClick={() => handleOpenRound(round.id)}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                          >
                            <Unlock className="h-4 w-4 mr-1" />
                            Open
                          </button>
                        )}
                        {round.opened_at && !round.closed_at && (
                          <button
                            onClick={() => handleCloseRound(round.id)}
                            className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                          >
                            <Lock className="h-4 w-4 mr-1" />
                            Close
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Judge Progress Grid */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Judge Progress</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {currentRound ? `Current round: ${currentRound.label}` : 'No active round'}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Judge
                      </th>
                      {teams.map(team => (
                        <th key={team.id} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div className="truncate max-w-[100px]" title={getDisplayName(team.id)}>
                            {getDisplayName(team.id).substring(0, 10)}...
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {judges.map(judge => {
                      const scoredCount = teams.filter(team => hasScored(judge.judge_id, team.id)).length
                      const isComplete = scoredCount === teams.length
                      
                      return (
                        <tr key={judge.judge_id} className={isComplete ? '' : 'bg-yellow-50'}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-8 w-8">
                                {judge.profile.avatar_url ? (
                                  <Image
                                    className="h-8 w-8 rounded-full"
                                    src={judge.profile.avatar_url}
                                    alt=""
                                    width={32}
                                    height={32}
                                  />
                                ) : (
                                  <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                                    <span className="text-sm font-medium text-gray-600">
                                      {judge.profile.full_name.charAt(0)}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {judge.profile.full_name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {scoredCount}/{teams.length} teams
                                </div>
                              </div>
                            </div>
                          </td>
                          {teams.map(team => (
                            <td key={team.id} className="px-3 py-4 whitespace-nowrap text-center">
                              {hasScored(judge.judge_id, team.id) ? (
                                <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                              ) : (
                                <Circle className="h-5 w-5 text-gray-300 mx-auto" />
                              )}
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column - Blind Mode */}
          <div className="space-y-8">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">Blind Mode</h2>
                <Switch.Root
                  checked={isBlindMode}
                  onCheckedChange={(checked) => blindModeMutation.mutate(checked)}
                  className="w-11 h-6 bg-gray-200 rounded-full relative focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 data-[state=checked]:bg-blue-600"
                >
                  <Switch.Thumb className="block w-5 h-5 bg-white rounded-full shadow transform transition-transform duration-100 translate-x-0.5 data-[state=checked]:translate-x-5" />
                </Switch.Root>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                {isBlindMode 
                  ? 'Team names are hidden from judges. Anonymous names are used instead.'
                  : 'Team names are visible to judges.'
                }
              </p>
              
              {isBlindMode && blindMappings.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Anonymous Names</h3>
                  <div className="space-y-2">
                    {blindMappings.map(mapping => (
                      <div key={mapping.team_id} className="flex justify-between text-sm">
                        <span className="text-gray-900">{getTeamName(mapping.team_id)}</span>
                        <span className="text-gray-500">{mapping.anonymous_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Stats</h2>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Teams</span>
                  <span className="text-sm font-medium text-gray-900">{teams.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Judges</span>
                  <span className="text-sm font-medium text-gray-900">{judges.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Active Round</span>
                  <span className="text-sm font-medium text-gray-900">
                    {currentRound ? currentRound.label : 'None'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Scores This Round</span>
                  <span className="text-sm font-medium text-gray-900">{scores.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}