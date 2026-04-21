import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { unauthorized, forbidden, error, notFound, serverError, success, rateLimit as rateLimitResponse } from '@/lib/api-response'
import { rateLimit } from '@/lib/rate-limit'
import { SubmissionSchema } from '@/lib/validations'
import { z } from 'zod'

const SubmissionRequestSchema = z.object({
  team_id: z.string().uuid(),
  hackathon_id: z.string().uuid(),
  github_url: z.string().regex(/^https:\/\/github\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+$/, 'Must be a valid GitHub repository URL'),
  live_url: z.string().url().or(z.literal('')).optional(),
  description: z.string().min(100).max(1000),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return unauthorized()
    }

    // Rate limiting: 5 per user per hour
    const rl = await rateLimit(`user:${user.id}:submissions`, 5, 3600)
    if (!rl.success) {
      return rateLimitResponse('Too many submissions', Math.ceil((rl.resetAt - Date.now()) / 1000))
    }

    // Validate request body
    const body = await request.json()
    const parsed = SubmissionRequestSchema.safeParse(body)
    if (!parsed.success) {
      return error('Validation failed: ' + parsed.error.issues[0].message)
    }
    const data = parsed.data

    // Verify user is member of team
    const { data: teamMember } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('team_id', data.team_id)
      .eq('user_id', user.id)
      .single()

    if (!teamMember) {
      return forbidden()
    }

    // Verify hackathon is ongoing
    const { data: hackathon } = await supabase
      .from('hackathons')
      .select('id, status, submission_deadline, end_time')
      .eq('id', data.hackathon_id)
      .single()

    if (!hackathon) {
      return notFound('Hackathon not found')
    }

    if (hackathon.status !== 'ongoing' && hackathon.status !== 'judging') {
      return error('Submissions are not open for this hackathon')
    }

    // Check deadline
    const deadline = hackathon.submission_deadline || hackathon.end_time
    if (deadline && new Date(deadline) < new Date()) {
      return error('Submission deadline has passed')
    }

    // Upsert submission (one per team)
    const { data: submission, error: upsertError } = await supabase
      .from('submissions')
      .upsert({
        team_id: data.team_id,
        hackathon_id: data.hackathon_id,
        github_url: data.github_url,
        live_url: data.live_url || null,
        description: data.description,
        submitted_at: new Date().toISOString(),
        health_status: 'unchecked',
      }, {
        onConflict: 'team_id,hackathon_id',
      })
      .select()
      .single()

    if (upsertError) {
      return serverError(upsertError)
    }

    return success(submission, 200, true)
  } catch (err) {
    return serverError(err)
  }
}
