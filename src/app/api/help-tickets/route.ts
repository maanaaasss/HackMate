import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { unauthorized, forbidden, error, serverError, success, rateLimit as rateLimitResponse } from '@/lib/api-response'
import { rateLimit } from '@/lib/rate-limit'
import { z } from 'zod'

const HelpTicketSchema = z.object({
  team_id: z.string().uuid(),
  hackathon_id: z.string().uuid(),
  tag: z.string().min(1).max(50),
  description: z.string().min(20, 'Description must be at least 20 characters').max(300, 'Description must be at most 300 characters'),
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
    const rl = await rateLimit(`user:${user.id}:help-tickets`, 10, 3600)
    if (!rl.success) {
      return rateLimitResponse('Too many help ticket submissions', Math.ceil((rl.resetAt - Date.now()) / 1000))
    }

    // Validate request body
    const body = await request.json()
    const parsed = HelpTicketSchema.safeParse(body)
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

    // Check if team already has an open/claimed ticket
    const { data: existingTicket } = await supabase
      .from('help_tickets')
      .select('id')
      .eq('team_id', data.team_id)
      .eq('hackathon_id', data.hackathon_id)
      .in('status', ['open', 'claimed'])
      .single()

    if (existingTicket) {
      return error('Your team already has an open help ticket')
    }

    // Create ticket
    const { data: ticket, error: insertError } = await supabase
      .from('help_tickets')
      .insert({
        team_id: data.team_id,
        hackathon_id: data.hackathon_id,
        tag: data.tag,
        description: data.description,
        status: 'open',
      })
      .select()
      .single()

    if (insertError) {
      return serverError(insertError)
    }

    return success(ticket, 200, true)
  } catch (err) {
    return serverError(err)
  }
}
