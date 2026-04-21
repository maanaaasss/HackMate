import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { unauthorized, forbidden, error, notFound, conflict, serverError, success, rateLimit as rateLimitResponse } from '@/lib/api-response'
import { rateLimit } from '@/lib/rate-limit'
import { env } from '@/lib/env'
import crypto from 'crypto'
import { z } from 'zod'

const QRScanSchema = z.object({
  qr_data: z.string().min(1),
  redemption_type: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return unauthorized()
    }

    // Verify organiser role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'organiser') {
      return forbidden()
    }

    // Rate limiting: 120 per user per minute (bursty scanner)
    const rl = await rateLimit(`user:${user.id}:qr-scan`, 120, 60)
    if (!rl.success) {
      return rateLimitResponse('Too many scans', Math.ceil((rl.resetAt - Date.now()) / 1000))
    }

    // Validate request body
    const body = await request.json()
    const parsed = QRScanSchema.safeParse(body)
    if (!parsed.success) {
      return error('Validation failed: ' + parsed.error.issues[0].message)
    }
    const { qr_data, redemption_type } = parsed.data

    // Parse QR data
    const parts = qr_data.split('.')
    if (parts.length !== 2) {
      return error('Invalid QR code format')
    }

    const [payloadBase64, signature] = parts
    
    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', env.JWT_SECRET)
      .update(payloadBase64)
      .digest('base64url')

    if (signature !== expectedSignature) {
      return error('Invalid QR code signature', 401)
    }

    // Decode payload
    let payload: { exp?: number, hackathon_id: string, sub: string }
    try {
      const payloadString = Buffer.from(payloadBase64, 'base64url').toString()
      payload = JSON.parse(payloadString)
    } catch {
      return error('Invalid QR code payload')
    }

    // Check expiration
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp && payload.exp < now) {
      return error('QR code expired', 401)
    }

    // Get active hackathon
    const { data: hackathon } = await supabase
      .from('hackathons')
      .select('id')
      .in('status', ['ongoing', 'judging'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!hackathon) {
      return error('No active hackathon')
    }

    // Verify hackathon matches
    if (payload.hackathon_id !== hackathon.id) {
      return error('QR code is for a different hackathon')
    }

    // Get user profile for response
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('id, full_name, email, college')
      .eq('id', payload.sub)
      .single()

    if (!userProfile) {
      return notFound('User not found')
    }

    if (!redemption_type) {
      // Check-in flow
      const { data: existingCheckin } = await supabase
        .from('attendance_records')
        .select('id')
        .eq('user_id', payload.sub)
        .eq('hackathon_id', hackathon.id)
        .single()

      if (existingCheckin) {
        return conflict('Already checked in')
      }

      // Create attendance record
      const { error: insertError } = await supabase
        .from('attendance_records')
        .insert({
          user_id: payload.sub,
          hackathon_id: hackathon.id,
          checked_in_by: user.id,
        })

      if (insertError) {
        return serverError(insertError)
      }

      return success({
        profile: userProfile,
        message: 'Check-in successful'
      }, 200, true)
    } else {
      // Redemption flow
      const { data: existingRedemption } = await supabase
        .from('redemption_records')
        .select('id')
        .eq('user_id', payload.sub)
        .eq('hackathon_id', hackathon.id)
        .eq('type', redemption_type)
        .single()

      if (existingRedemption) {
        return conflict(`Already redeemed ${redemption_type}`)
      }

      // Create redemption record
      const { error: insertError } = await supabase
        .from('redemption_records')
        .insert({
          user_id: payload.sub,
          hackathon_id: hackathon.id,
          type: redemption_type,
          redeemed_by: user.id,
        })

      if (insertError) {
        return serverError(insertError)
      }

      return success({
        profile: userProfile,
        message: `${redemption_type} redeemed successfully`
      }, 200, true)
    }
  } catch (err) {
    return serverError(err)
  }
}
