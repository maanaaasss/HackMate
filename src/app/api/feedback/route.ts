import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { unauthorized, forbidden, error, notFound, conflict, serverError, success, rateLimit as rateLimitResponse } from '@/lib/api-response'
import { rateLimit, getRateLimitHeaders } from '@/lib/rate-limit'
import { z } from 'zod'

const FeedbackSchema = z.object({
  hackathon_id: z.string().uuid(),
  mentor_rating: z.number().int().min(1).max(5),
  judge_rating: z.number().int().min(1).max(5),
  food_rating: z.number().int().min(1).max(5),
  organisation_rating: z.number().int().min(1).max(5),
  mentor_comment: z.string().max(500).optional(),
  overall_comment: z.string().max(500).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return unauthorized()
    }

    // Rate limiting: 10 per user per hour
    const rl = await rateLimit(`user:${user.id}:feedback`, 10, 3600)
    if (!rl.success) {
      return rateLimitResponse('Too many feedback submissions', Math.ceil((rl.resetAt - Date.now()) / 1000))
    }

    // Verify user is participant
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'participant') {
      return forbidden()
    }

    // Validate request body
    const body = await request.json()
    const parsed = FeedbackSchema.safeParse(body)
    if (!parsed.success) {
      return error('Validation failed: ' + parsed.error.issues[0].message)
    }
    const data = parsed.data

    // Verify hackathon exists and status is 'ended'
    const { data: hackathon, error: hackathonError } = await supabase
      .from('hackathons')
      .select('id, status')
      .eq('id', data.hackathon_id)
      .single()

    if (hackathonError || !hackathon) {
      return notFound('Hackathon not found')
    }

    if (hackathon.status !== 'ended') {
      return error('Feedback can only be submitted after the hackathon has ended')
    }

    // Check if feedback already exists
    const { data: existingFeedback } = await supabase
      .from('feedback_responses')
      .select('id')
      .eq('user_id', user.id)
      .eq('hackathon_id', data.hackathon_id)
      .single()

    if (existingFeedback) {
      return conflict('You have already submitted feedback for this hackathon')
    }

    // Insert feedback
    const { data: feedback, error: insertError } = await supabase
      .from('feedback_responses')
      .insert({
        user_id: user.id,
        hackathon_id: data.hackathon_id,
        mentor_rating: data.mentor_rating,
        judge_rating: data.judge_rating,
        food_rating: data.food_rating,
        organisation_rating: data.organisation_rating,
        mentor_comment: data.mentor_comment || null,
        overall_comment: data.overall_comment || null,
      })
      .select()
      .single()

    if (insertError) {
      return serverError(insertError)
    }

    return success(feedback, 200, true)
  } catch (err) {
    return serverError(err)
  }
}
