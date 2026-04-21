import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import axios from 'axios'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { announcement_id, webhook_url } = body

    if (!announcement_id || !webhook_url) {
      return NextResponse.json({ error: 'announcement_id and webhook_url are required' }, { status: 400 })
    }

    // Get announcement
    const { data: announcement, error: announcementError } = await supabase
      .from('announcements')
      .select(`
        id,
        title,
        message,
        channel,
        sent_at,
        hackathons (
          id,
          name
        )
      `)
      .eq('id', announcement_id)
      .single()

    if (announcementError || !announcement) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 })
    }

    // Verify organiser of hackathon
    const hackathon = Array.isArray(announcement.hackathons) 
      ? announcement.hackathons[0] 
      : announcement.hackathons

    if (!hackathon) {
      return NextResponse.json({ error: 'Hackathon not found' }, { status: 404 })
    }

    const { data: hackathonData } = await supabase
      .from('hackathons')
      .select('organiser_id')
      .eq('id', hackathon.id)
      .single()

    if (!hackathonData || hackathonData.organiser_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Build Discord embed
    const embed = {
      title: `📢 ${announcement.title}`,
      description: announcement.message,
      color: 0x3b82f6, // Blue color
      fields: [
        {
          name: 'Hackathon',
          value: hackathon.name,
          inline: true,
        },
        {
          name: 'Channel',
          value: announcement.channel === 'all' ? 'Website & Discord' : 'Discord',
          inline: true,
        },
      ],
      timestamp: new Date(announcement.sent_at).toISOString(),
      footer: {
        text: 'Hackmate Announcement',
      },
    }

    // Send to Discord webhook
    try {
      await axios.post(webhook_url, {
        embeds: [embed],
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      })

      return NextResponse.json({ message: 'Discord notification sent successfully' })
    } catch (discordError: unknown) {
      const error = discordError as { response?: { data?: unknown }, message?: string }
      console.error('Discord webhook error:', error.response?.data || error.message)
      return NextResponse.json(
        { error: 'Failed to send Discord notification', details: error.response?.data },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}