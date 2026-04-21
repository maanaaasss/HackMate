'use client'

import { Download, MessageCircle, Users } from 'lucide-react'
import StarRating from '@/components/shared/StarRating'

type FeedbackResponse = {
  id: string
  user_id: string
  mentor_rating: number
  judge_rating: number
  food_rating: number
  organisation_rating: number
  mentor_comment?: string
  overall_comment?: string
  submitted_at: string
  profiles?: {
    college?: string
    year_of_study?: number
  }
}

type Hackathon = {
  id: string
  name: string
  status: string
}

type FeedbackAnalyticsProps = {
  hackathon: Hackathon
  feedback: FeedbackResponse[]
  participantCount: number
}

function RatingBar({ label, average }: { label: string; average: number }) {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm font-bold text-gray-900">{average.toFixed(1)}/5</span>
      </div>
      <div className="flex items-center space-x-3">
        <div className="flex-1 bg-gray-200 rounded-full h-3">
          <div
            className="bg-yellow-400 h-3 rounded-full transition-all duration-300"
            style={{ width: `${(average / 5) * 100}%` }}
          />
        </div>
        <StarRating value={Math.round(average)} onChange={() => {}} disabled />
      </div>
    </div>
  )
}

export default function FeedbackAnalytics({
  hackathon,
  feedback,
  participantCount,
}: FeedbackAnalyticsProps) {
  const responseCount = feedback.length
  const responseRate = participantCount > 0 
    ? Math.round((responseCount / participantCount) * 100) 
    : 0

  // Calculate averages
  const avgMentorRating = feedback.reduce((sum, f) => sum + f.mentor_rating, 0) / responseCount || 0
  const avgJudgeRating = feedback.reduce((sum, f) => sum + f.judge_rating, 0) / responseCount || 0
  const avgFoodRating = feedback.reduce((sum, f) => sum + f.food_rating, 0) / responseCount || 0
  const avgOrganisationRating = feedback.reduce((sum, f) => sum + f.organisation_rating, 0) / responseCount || 0

  // Collect all comments
  const mentorComments = feedback
    .filter(f => f.mentor_comment)
    .map(f => ({
      comment: f.mentor_comment!,
      college: f.profiles?.college || 'Unknown',
      year: f.profiles?.year_of_study,
    }))

  const overallComments = feedback
    .filter(f => f.overall_comment)
    .map(f => ({
      comment: f.overall_comment!,
      college: f.profiles?.college || 'Unknown',
      year: f.profiles?.year_of_study,
    }))

  const handleExportCSV = () => {
    const headers = ['Mentor Rating', 'Judge Rating', 'Food Rating', 'Organisation Rating', 'Mentor Comment', 'Overall Comment', 'College', 'Year']
    const rows = feedback.map(f => [
      f.mentor_rating.toString(),
      f.judge_rating.toString(),
      f.food_rating.toString(),
      f.organisation_rating.toString(),
      f.mentor_comment || '',
      f.overall_comment || '',
      f.profiles?.college || '',
      f.profiles?.year_of_study?.toString() || '',
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `feedback-${hackathon.name.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-8">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Response Rate</p>
              <p className="text-2xl font-bold text-gray-900">{responseRate}%</p>
              <p className="text-xs text-gray-400">{responseCount} of {participantCount} participants</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center">
            <MessageCircle className="w-8 h-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Responses</p>
              <p className="text-2xl font-bold text-gray-900">{responseCount}</p>
              <p className="text-xs text-gray-400">feedback submissions</p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6 flex items-center justify-center">
          <button
            onClick={handleExportCSV}
            disabled={feedback.length === 0}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Average Ratings */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Average Ratings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <RatingBar label="Mentors" average={avgMentorRating} />
          <RatingBar label="Judges" average={avgJudgeRating} />
          <RatingBar label="Food & Logistics" average={avgFoodRating} />
          <RatingBar label="Overall Organisation" average={avgOrganisationRating} />
        </div>
      </div>

      {/* Comments Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mentor Comments */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Comments about Mentors ({mentorComments.length})
          </h3>
          {mentorComments.length === 0 ? (
            <p className="text-gray-500 text-sm">No mentor comments yet.</p>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {mentorComments.map((item, index) => (
                <div key={index} className="border-b border-gray-100 pb-4 last:border-0">
                  <p className="text-gray-700 text-sm">{item.comment}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {item.college}{item.year ? ` • Year ${item.year}` : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Overall Comments */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Additional Comments ({overallComments.length})
          </h3>
          {overallComments.length === 0 ? (
            <p className="text-gray-500 text-sm">No additional comments yet.</p>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {overallComments.map((item, index) => (
                <div key={index} className="border-b border-gray-100 pb-4 last:border-0">
                  <p className="text-gray-700 text-sm">{item.comment}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {item.college}{item.year ? ` • Year ${item.year}` : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
