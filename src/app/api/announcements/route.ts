import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { unauthorized, forbidden, serverError, success, rateLimit as rateLimitResponse } from '@/lib/api-response'
import { rateLimit } from '@/lib/rate-limit'
import { AnnouncementSchema } from '@/lib/validations'
import { z } from 'zod'

const AnnouncementRequestSchema = z.object({
  hackathon_id: z.string().uuid(),
  title: z.string().min(2).max(100),
  message: z.string().min(2).max(2000),
  channel: z.enum(['website', 'discord', 'all']),
  discord_webhook_url: z.string().url().optional(),
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
    const rl = await rateLimit(`user:${user.id}:announcements`, 10, 3600)
    if (!rl.success) {
      return rateLimitResponse('Too many announcements', Math.ceil((rl.resetAt - Date.now()) / 1000))
    }

    // Validate request body
    const body = await request.json()
    const parsed = AnnouncementRequestSchema.safeParse(body)
    if (!parsed.success) {
      return new NextResponse(
        JSON.stringify({ error: 'Validation failed: ' + parsed.error.issues[0].message }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
    const data = parsed.data

    // Verify organiser of hackathon
    const { data: hackathon } = await supabase
      .from('hackathons')
      .select('organiser_id')
      .eq('id', data.hackathon_id)
      .single()

    if (!hackathon || hackathon.organiser_id !== user.id) {
      return forbidden()
    }

    // Create announcement
    const { data: announcement, error: insertError } = await supabase
      .from('announcements')
      .insert({
        hackathon_id: data.hackathon_id,
        title: data.title,
        message: data.message,
        channel: data.channel,
        discord_webhook_url: data.channel === 'website' ? null : data.discord_webhook_url,
        sent_by: user.id,
      })
      .select()
      .single()

    if (insertError) {
      return serverError(insertError)
    }

    // If Discord channel, send to Discord
    if ((data.channel === 'discord' || data.channel === 'all') && data.discord_webhook_url) {
      // Fire and forget - don't await
      fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/announcements/discord`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          announcement_id: announcement.id,
          webhook_url: data.discord_webhook_url,
        }),
      }).catch(console.error)
    }

    return success(announcement, 200, true)
  } catch (err) {
    return serverError(err)
  }
}
