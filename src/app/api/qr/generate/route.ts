import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { uploadToR2 } from '@/lib/r2'
import { env } from '@/lib/env'
import crypto from 'crypto'
import qrcode from 'qrcode'

export async function POST() {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
      return NextResponse.json({ error: 'No active hackathon' }, { status: 400 })
    }

    // Build QR payload
    const now = Math.floor(Date.now() / 1000)
    const payload = {
      sub: user.id,
      hackathon_id: hackathon.id,
      type: 'checkin',
      iat: now,
      exp: now + 86400, // 24 hours
    }

    // Sign payload
    const payloadString = JSON.stringify(payload)
    const signature = crypto
      .createHmac('sha256', env.JWT_SECRET)
      .update(payloadString)
      .digest('base64url')

    const payloadBase64 = Buffer.from(payloadString).toString('base64url')
    const qrString = `${payloadBase64}.${signature}`

    // Generate QR code buffer
    const qrBuffer = await qrcode.toBuffer(qrString, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    })

    // Upload to R2
    const key = `qr/${hackathon.id}/${user.id}.png`
    const publicUrl = await uploadToR2(key, qrBuffer, 'image/png')

    return NextResponse.json({ url: publicUrl })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}