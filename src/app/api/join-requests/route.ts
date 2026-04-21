import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { unauthorized, forbidden, error, notFound, serverError, success, rateLimit as rateLimitResponse } from '@/lib/api-response'
import { rateLimit } from '@/lib/rate-limit'
import { JoinRequestSchema } from '@/lib/validations'
import { z } from 'zod'

const JoinRequestBodySchema = z.object({
  team_id: z.string().uuid(),
  ghost_slot_id: z.string().uuid().optional(),
  message: z.string().min(20, 'Message must be at least 20 characters').max(500, 'Message must be at most 500 characters'),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return unauthorized()
    }

    // Rate limiting: 20 per user per hour
    const rl = await rateLimit(`user:${user.id}:join-requests`, 20, 3600)
    if (!rl.success) {
      return rateLimitResponse('Too many join requests', Math.ceil((rl.resetAt - Date.now()) / 1000))
    }

    // Validate request body
    const body = await request.json()
    const parsed = JoinRequestBodySchema.safeParse(body)
    if (!parsed.success) {
      return error('Validation failed: ' + parsed.error.issues[0].message)
    }
    const data = parsed.data

    // Verify user is participant
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'participant') {
      return forbidden()
    }

    // Get team and hackathon info
    const { data: team } = await supabase
      .from('teams')
      .select('id, hackathon_id, status')
      .eq('id', data.team_id)
      .single()

    if (!team) {
      return notFound('Team not found')
    }

    if (team.status !== 'forming') {
      return error('Team is not accepting new members')
    }

    // Check if user is already in a team for this hackathon
    const { data: existingMember } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', user.id)
      .single()

    if (existingMember) {
      return error('You are already in a team for this hackathon')
    }

    // Check if user already has a pending request for this team
    const { data: existingRequest } = await supabase
      .from('join_requests')
      .select('id')
      .eq('team_id', data.team_id)
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .single()

    if (existingRequest) {
      return error('You already have a pending request for this team')
    }

    // If ghost_slot_id provided, verify it exists and belongs to team
    if (data.ghost_slot_id) {
      const { data: slot } = await supabase
        .from('ghost_slots')
        .select('id, team_id, filled')
        .eq('id', data.ghost_slot_id)
        .eq('team_id', data.team_id)
        .single()

      if (!slot) {
        return notFound('Ghost slot not found')
      }

      if (slot.filled) {
        return error('Ghost slot is already filled')
      }
    }

    // Create join request
    const { data: joinRequest, error: insertError } = await supabase
      .from('join_requests')
      .insert({
        team_id: data.team_id,
        user_id: user.id,
        ghost_slot_id: data.ghost_slot_id || null,
        message: data.message,
        status: 'pending',
      })
      .select()
      .single()

    if (insertError) {
      return serverError(insertError)
    }

    return success(joinRequest, 200, true)
  } catch (err) {
    return serverError(err)
  }
}
