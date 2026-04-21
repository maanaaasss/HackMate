import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { env } from '@/lib/env'
import { Queue } from 'bullmq'

// Lazy queue creation (avoids connection at build time)
let _certificateQueue: Queue | null = null

function getCertificateQueue(): Queue {
  if (!_certificateQueue) {
    _certificateQueue = new Queue('certificates', {
      connection: {
        host: env.UPSTASH_REDIS_URL.replace('https://', '').replace('http://', '').split(':')[0],
        port: parseInt(env.UPSTASH_REDIS_URL.split(':')[2] || '6379'),
        password: env.UPSTASH_REDIS_TOKEN,
        tls: env.UPSTASH_REDIS_URL.startsWith('rediss://') ? {} : undefined,
      },
    })
  }
  return _certificateQueue
}

// Batch size for Vercel Hobby (60s timeout)
// On Pro (300s timeout), process all at once
const BATCH_SIZE = 10

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { hackathon_id, batch_offset = 0 } = body

    if (!hackathon_id) {
      return NextResponse.json({ error: 'hackathon_id is required' }, { status: 400 })
    }

    // Verify user is organiser of this hackathon
    const { data: hackathon, error: hackathonError } = await supabase
      .from('hackathons')
      .select('id, name, organiser_id, end_time')
      .eq('id', hackathon_id)
      .single()

    if (hackathonError || !hackathon) {
      return NextResponse.json({ error: 'Hackathon not found' }, { status: 404 })
    }

    if (hackathon.organiser_id !== user.id) {
      return NextResponse.json({ error: 'Only organiser can generate certificates' }, { status: 403 })
    }

    // Fetch final leaderboard to determine winner/runner_up
    const { data: scores } = await supabase
      .from('scores')
      .select(`
        team_id,
        value,
        rubric_items (
          id,
          weight,
          max_score,
          rubrics (
            hackathon_id
          )
        )
      `)
      .eq('rubric_items.rubrics.hackathon_id', hackathon_id)

    // Fetch teams
    const { data: teams } = await supabase
      .from('teams')
      .select('id, name')
      .eq('hackathon_id', hackathon_id)

    // Calculate team scores
    const teamScores: Record<string, number> = {}
    
    teams?.forEach(team => {
      teamScores[team.id] = 0
    })

    // Group scores by team and calculate weighted total
    const teamItemScores: Record<string, Record<string, { total: number; count: number }>> = {}
    
    scores?.forEach(score => {
      if (!teamItemScores[score.team_id]) {
        teamItemScores[score.team_id] = {}
      }
      
      const rubricItem = Array.isArray(score.rubric_items) 
        ? score.rubric_items[0] 
        : score.rubric_items
      
      if (!rubricItem) return
      
      if (!teamItemScores[score.team_id][rubricItem.id]) {
        teamItemScores[score.team_id][rubricItem.id] = { total: 0, count: 0 }
      }
      
      teamItemScores[score.team_id][rubricItem.id].total += score.value
      teamItemScores[score.team_id][rubricItem.id].count += 1
    })

    // Calculate final scores
    teams?.forEach(team => {
      const itemScores = teamItemScores[team.id]
      if (!itemScores) return
      
      let totalScore = 0
      scores?.forEach(score => {
        if (score.team_id !== team.id) return
        
        const rubricItem = Array.isArray(score.rubric_items) 
          ? score.rubric_items[0] 
          : score.rubric_items
        
        if (!rubricItem) return
        
        const itemScore = itemScores[rubricItem.id]
        if (itemScore && itemScore.count > 0) {
          const avg = itemScore.total / itemScore.count
          const weightedScore = (avg / rubricItem.max_score) * rubricItem.weight
          totalScore += weightedScore
        }
      })
      
      teamScores[team.id] = parseFloat(totalScore.toFixed(2))
    })

    // Sort teams by score
    const sortedTeams = Object.entries(teamScores)
      .sort(([, a], [, b]) => b - a)
      .map(([teamId, score], index) => ({
        team_id: teamId,
        score,
        rank: index + 1,
      }))

    // Get team ranks for certificates
    const teamRanks: Record<string, number> = {}
    sortedTeams.forEach(team => {
      teamRanks[team.team_id] = team.rank
    })

    // Fetch all participants (team_members in this hackathon)
    const { data: teamMembers } = await supabase
      .from('team_members')
      .select(`
        user_id,
        team_id,
        teams!inner (
          hackathon_id
        )
      `)
      .eq('teams.hackathon_id', hackathon_id)

    if (!teamMembers || teamMembers.length === 0) {
      return NextResponse.json({ error: 'No participants found' }, { status: 400 })
    }

    // Apply batch logic for Vercel Hobby (60s timeout)
    // On Pro (300s timeout), process all at once
    const batchMembers = teamMembers.slice(batch_offset, batch_offset + BATCH_SIZE)
    const hasMore = batch_offset + BATCH_SIZE < teamMembers.length

    // Create certificate records and queue jobs
    let queuedCount = 0
    
    for (const member of batchMembers) {
      const rank = teamRanks[member.team_id]
      let certificateType: 'winner' | 'runner_up' | 'participant' = 'participant'
      
      if (rank === 1) {
        certificateType = 'winner'
      } else if (rank === 2) {
        certificateType = 'runner_up'
      }

      // Check if certificate already exists
      const { data: existingCert } = await supabase
        .from('certificates')
        .select('id')
        .eq('user_id', member.user_id)
        .eq('hackathon_id', hackathon_id)
        .single()

      if (existingCert) {
        // Update existing certificate
        await supabase
          .from('certificates')
          .update({
            team_id: member.team_id,
            rank,
            certificate_type: certificateType,
          })
          .eq('id', existingCert.id)

        // Queue job for regeneration
        await getCertificateQueue().add('generate-certificate', {
          certificate_id: existingCert.id,
          user_id: member.user_id,
          hackathon_id,
          team_id: member.team_id,
          rank,
          type: certificateType,
        })
      } else {
        // Create new certificate
        const { data: newCert, error: certError } = await supabase
          .from('certificates')
          .insert({
            user_id: member.user_id,
            hackathon_id,
            team_id: member.team_id,
            rank,
            certificate_type: certificateType,
          })
          .select()
          .single()

        if (certError) {
          console.error('Certificate creation error:', certError)
          continue
        }

        // Queue job for generation
        await getCertificateQueue().add('generate-certificate', {
          certificate_id: newCert.id,
          user_id: member.user_id,
          hackathon_id,
          team_id: member.team_id,
          rank,
          type: certificateType,
        })
      }

      queuedCount++
    }

    return NextResponse.json({
      queued: queuedCount,
      total: teamMembers.length,
      batch_offset,
      batch_size: BATCH_SIZE,
      has_more: hasMore,
      next_offset: hasMore ? batch_offset + BATCH_SIZE : null,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
