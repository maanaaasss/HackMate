'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle, Circle, ArrowRight } from 'lucide-react'

type Team = {
  id: string
  name: string
  display_name: string
  is_scored: boolean
}

type Round = {
  id: string
  hackathon_id: string
  round_number: number
  label: string
  is_final: boolean
  opened_at: string
  closed_at?: string
}

type Hackathon = {
  id: string
  name: string
  status: string
}

export default function JudgeDashboardView({
  hackathon,
  activeRound,
  teams,
}: {
  hackathon: Hackathon
  activeRound?: Round | null
  teams: Team[]
}) {
  const [filter, setFilter] = useState<'all' | 'unscored' | 'scored'>('all')

  const filteredTeams = teams.filter(team => {
    if (filter === 'unscored') return !team.is_scored
    if (filter === 'scored') return team.is_scored
    return true
  })

  const scoredCount = teams.filter(team => team.is_scored).length
  const totalCount = teams.length
  const progressPercentage = totalCount > 0 ? (scoredCount / totalCount) * 100 : 0

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Judge Dashboard</h1>
          <p className="text-gray-600">
            {hackathon.name} — Evaluate teams for {activeRound?.label || 'no active round'}
          </p>
        </div>

        {/* Active Round Info */}
        {activeRound ? (
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {activeRound.label}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Round {activeRound.round_number} • Opened {new Date(activeRound.opened_at).toLocaleString()}
                </p>
              </div>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                activeRound.is_final 
                  ? 'bg-purple-100 text-purple-800' 
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {activeRound.is_final ? 'Final Round' : 'Active Round'}
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  No active judging round
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>Wait for an organiser to open a judging round before evaluating teams.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Evaluation Progress</h3>
            <span className="text-sm font-medium text-gray-600">
              {scoredCount} of {totalCount} teams scored
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="mt-2 text-sm text-gray-500">
            {progressPercentage.toFixed(0)}% complete
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="mb-6 flex space-x-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === 'all'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            All Teams ({totalCount})
          </button>
          <button
            onClick={() => setFilter('unscored')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === 'unscored'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Unscored ({totalCount - scoredCount})
          </button>
          <button
            onClick={() => setFilter('scored')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === 'scored'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Scored ({scoredCount})
          </button>
        </div>

        {/* Teams List */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Teams to Evaluate</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {filteredTeams.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                {filter === 'unscored' 
                  ? 'All teams have been scored!' 
                  : filter === 'scored'
                  ? 'No teams scored yet'
                  : 'No teams available'}
              </div>
            ) : (
              filteredTeams.map(team => (
                <div key={team.id} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {team.is_scored ? (
                      <CheckCircle className="h-6 w-6 text-green-500" />
                    ) : (
                      <Circle className="h-6 w-6 text-gray-300" />
                    )}
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">
                        {team.display_name}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {team.is_scored ? 'Scored' : 'Pending evaluation'}
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/judge/evaluate/${team.id}`}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Evaluate
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}