'use client'

import { useState } from 'react'
import { ChevronRight, Play, Users } from 'lucide-react'

type Team = {
  id: string
  name: string
  display_name: string
  average_score: number
}

type Hackathon = {
  id: string
  name: string
  presentation_order?: string[]
}

export default function PresentationQueueView({
  hackathon,
  teams,
}: {
  hackathon: Hackathon
  teams: Team[]
}) {
  const [currentIndex, setCurrentIndex] = useState(0)

  const currentTeam = teams[currentIndex]
  const nextTeam = teams[currentIndex + 1]

  const handleNextTeam = () => {
    if (currentIndex < teams.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const handlePreviousTeam = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (teams.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No Teams in Queue</h1>
          <p className="text-gray-600">There are no teams scheduled for presentation.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Presentation Queue</h1>
          <p className="text-gray-600">
            {hackathon.name} — Team {currentIndex + 1} of {teams.length}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / teams.length) * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-sm text-gray-600">
            <span>Started</span>
            <span>{currentIndex + 1} / {teams.length}</span>
            <span>Finished</span>
          </div>
        </div>

        {/* Currently Presenting */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-8 mb-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4">
              <Play className="h-8 w-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {currentTeam.display_name}
            </h2>
            <p className="text-gray-600 mb-4">Currently Presenting</p>
            
            <div className="flex justify-center space-x-8">
              <div className="text-center">
                <p className="text-sm text-gray-500">Average Score</p>
                <p className={`text-3xl font-bold ${getScoreColor(currentTeam.average_score)}`}>
                  {currentTeam.average_score.toFixed(1)}
                </p>
                <p className="text-xs text-gray-500">out of 100</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500">Team Position</p>
                <p className="text-3xl font-bold text-gray-900">
                  {currentIndex + 1}
                </p>
                <p className="text-xs text-gray-500">of {teams.length}</p>
              </div>
            </div>

            {/* Navigation */}
            <div className="mt-8 flex justify-center space-x-4">
              <button
                onClick={handlePreviousTeam}
                disabled={currentIndex === 0}
                className="inline-flex items-center px-6 py-3 border border-gray-300 shadow-sm text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous Team
              </button>
              <button
                onClick={handleNextTeam}
                disabled={currentIndex === teams.length - 1}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Done — Next Team
                <ChevronRight className="ml-2 h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Up Next */}
        {nextTeam && (
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0 h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                  <Users className="h-6 w-6 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Up Next</h3>
                  <p className="text-gray-600">{nextTeam.display_name}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Average Score</p>
                <p className={`text-xl font-semibold ${getScoreColor(nextTeam.average_score)}`}>
                  {nextTeam.average_score.toFixed(1)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Queue List */}
        <div className="mt-8 bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Presentation Order</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {teams.map((team, index) => (
              <div
                key={team.id}
                className={`px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 ${
                  index === currentIndex ? 'bg-blue-50' : ''
                }`}
                onClick={() => setCurrentIndex(index)}
              >
                <div className="flex items-center space-x-4">
                  <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                    index === currentIndex ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                  }`}>
                    <span className="text-sm font-medium">{index + 1}</span>
                  </div>
                  <div>
                    <h4 className={`text-sm font-medium ${
                      index === currentIndex ? 'text-blue-900' : 'text-gray-900'
                    }`}>
                      {team.display_name}
                    </h4>
                    <p className="text-xs text-gray-500">
                      {index === currentIndex ? 'Currently presenting' : 
                       index < currentIndex ? 'Presented' : 'Upcoming'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-medium ${getScoreColor(team.average_score)}`}>
                    {team.average_score.toFixed(1)}
                  </p>
                  <p className="text-xs text-gray-500">avg score</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}