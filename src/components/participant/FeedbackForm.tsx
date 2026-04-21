'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CheckCircle, Send } from 'lucide-react'
import StarRating from '@/components/shared/StarRating'

type FeedbackResponse = {
  id: string
  mentor_rating: number
  judge_rating: number
  food_rating: number
  organisation_rating: number
  mentor_comment?: string
  overall_comment?: string
  submitted_at: string
}

type Hackathon = {
  id: string
  name: string
  status: string
}

type FeedbackFormProps = {
  hackathon: Hackathon
  existingFeedback?: FeedbackResponse | null
}

export default function FeedbackForm({ hackathon, existingFeedback }: FeedbackFormProps) {
  const router = useRouter()
  const [mentorRating, setMentorRating] = useState(existingFeedback?.mentor_rating || 0)
  const [judgeRating, setJudgeRating] = useState(existingFeedback?.judge_rating || 0)
  const [foodRating, setFoodRating] = useState(existingFeedback?.food_rating || 0)
  const [organisationRating, setOrganisationRating] = useState(existingFeedback?.organisation_rating || 0)
  const [mentorComment, setMentorComment] = useState(existingFeedback?.mentor_comment || '')
  const [overallComment, setOverallComment] = useState(existingFeedback?.overall_comment || '')

  const isSubmitted = !!existingFeedback

  // Redirect to dashboard after successful submission
  useEffect(() => {
    if (isSubmitted) {
      const timer = setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [isSubmitted, router])

  const submitMutation = useMutation({
    mutationFn: async (data: {
      hackathon_id: string
      mentor_rating: number
      judge_rating: number
      food_rating: number
      organisation_rating: number
      mentor_comment: string
      overall_comment: string
    }) => {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to submit feedback')
      }
      return response.json()
    },
    onSuccess: () => {
      toast.success('Thank you! Your feedback helps improve every future hackathon.')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (mentorRating === 0 || judgeRating === 0 || foodRating === 0 || organisationRating === 0) {
      toast.error('Please rate all categories')
      return
    }

    submitMutation.mutate({
      hackathon_id: hackathon.id,
      mentor_rating: mentorRating,
      judge_rating: judgeRating,
      food_rating: foodRating,
      organisation_rating: organisationRating,
      mentor_comment: mentorComment,
      overall_comment: overallComment,
    })
  }

  // Show read-only summary if already submitted
  if (isSubmitted) {
    return (
      <div className="bg-white shadow rounded-lg p-8">
        <div className="text-center mb-8">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h2>
          <p className="text-gray-600">
            Your feedback helps improve every future hackathon.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Redirecting to dashboard in 2 seconds...
          </p>
        </div>

        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Your Ratings</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Mentors</span>
              <StarRating value={existingFeedback.mentor_rating} onChange={() => {}} disabled />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Judges</span>
              <StarRating value={existingFeedback.judge_rating} onChange={() => {}} disabled />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Food & Logistics</span>
              <StarRating value={existingFeedback.food_rating} onChange={() => {}} disabled />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Overall Organisation</span>
              <StarRating value={existingFeedback.organisation_rating} onChange={() => {}} disabled />
            </div>
          </div>

          {(existingFeedback.mentor_comment || existingFeedback.overall_comment) && (
            <div className="mt-6 space-y-4">
              {existingFeedback.mentor_comment && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Comments about mentors</h4>
                  <p className="text-gray-600 text-sm">{existingFeedback.mentor_comment}</p>
                </div>
              )}
              {existingFeedback.overall_comment && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Additional comments</h4>
                  <p className="text-gray-600 text-sm">{existingFeedback.overall_comment}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Show feedback form
  return (
    <div className="bg-white shadow rounded-lg p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Share Your Feedback</h2>
        <p className="text-gray-600">
          Help us improve future hackathons by sharing your experience with {hackathon.name}.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Rating Groups */}
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-gray-900">Rate Your Experience</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StarRating
              value={mentorRating}
              onChange={setMentorRating}
              label="Mentors"
            />
            <StarRating
              value={judgeRating}
              onChange={setJudgeRating}
              label="Judges"
            />
            <StarRating
              value={foodRating}
              onChange={setFoodRating}
              label="Food & Logistics"
            />
            <StarRating
              value={organisationRating}
              onChange={setOrganisationRating}
              label="Overall Organisation"
            />
          </div>
        </div>

        {/* Comments */}
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-gray-900">Additional Comments (Optional)</h3>
          
          <div>
            <label htmlFor="mentorComment" className="block text-sm font-medium text-gray-700 mb-1">
              Comments about mentors
            </label>
            <textarea
              id="mentorComment"
              value={mentorComment}
              onChange={(e) => setMentorComment(e.target.value.slice(0, 500))}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Share your thoughts about the mentors..."
            />
            <p className="mt-1 text-xs text-gray-500 text-right">
              {mentorComment.length}/500 characters
            </p>
          </div>

          <div>
            <label htmlFor="overallComment" className="block text-sm font-medium text-gray-700 mb-1">
              Anything else for the organisers?
            </label>
            <textarea
              id="overallComment"
              value={overallComment}
              onChange={(e) => setOverallComment(e.target.value.slice(0, 500))}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Any other feedback or suggestions..."
            />
            <p className="mt-1 text-xs text-gray-500 text-right">
              {overallComment.length}/500 characters
            </p>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitMutation.isPending}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5 mr-2" />
            {submitMutation.isPending ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </div>
      </form>
    </div>
  )
}
