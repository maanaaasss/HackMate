import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { redis } from '@/lib/redis'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const roundId = searchParams.get('round_id')
    const reveal = searchParams.get('reveal') === 'true'
    
    const supabase = await createClient()
    
    // Get current user (optional for public access)
    const { data: { user: _user } } = await supabase.auth.getUser()

    // Check Redis cache
    const cacheKey = `leaderboard:${id}:${roundId || 'overall'}`
    if (!reveal) {
      const cached = await redis.get(cacheKey)
      if (cached) {
        return NextResponse.json(JSON.parse(cached))
      }
    }

    // Fetch hackathon info
    const { data: hackathon } = await supabase
      .from('hackathons')
      .select('organiser_id')
      .eq('id', id)
      .single()

    if (!hackathon) {
      return NextResponse.json({ error: 'Hackathon not found' }, { status: 404 })
    }

    // Fetch scores (filter by round if provided)
    let scoresQuery = supabase
      .from('scores')
      .select(`
        team_id,
        rubric_item_id,
        value,
        judging_rounds (
          id,
          label
        )
      `)
      .eq('judging_rounds.hackathon_id', id)

    if (roundId) {
      scoresQuery = scoresQuery.eq('round_id', roundId)
    }

    const { data: scores } = await scoresQuery

    // Fetch rubric items
    const { data: rubricItems } = await supabase
      .from('rubric_items')
      .select(`
        id,
        label,
        max_score,
        weight,
        rubrics (
          hackathon_id
        )
      `)
      .eq('rubrics.hackathon_id', id)

    // Fetch teams
    const { data: teams } = await supabase
      .from('teams')
      .select('id, name')
      .eq('hackathon_id', id)

    // Fetch blind mappings
    const { data: blindMappings } = await supabase
      .from('blind_mappings')
      .select('team_id, anonymous_name')
      .eq('hackathon_id', id)

    const isBlind = blindMappings && blindMappings.length > 0

    // Get round label if specific round
    let roundLabel = 'Overall'
    if (roundId && scores && scores.length > 0) {
      const round = Array.isArray(scores[0].judging_rounds) 
        ? scores[0].judging_rounds[0] 
        : scores[0].judging_rounds
      roundLabel = round?.label || 'Round'
    }

    // Calculate scores per team
    const teamScores: Record<string, {
      itemScores: Record<string, { total: number; count: number }>
      judgeIds: Set<string>
    }> = {}

    // Initialize team scores
    teams?.forEach(team => {
      teamScores[team.id] = {
        itemScores: {},
        judgeIds: new Set(),
      }
    })

    // Group scores by team and rubric item
    scores?.forEach(score => {
      if (!teamScores[score.team_id]) return
      
      if (!teamScores[score.team_id].itemScores[score.rubric_item_id]) {
        teamScores[score.team_id].itemScores[score.rubric_item_id] = { total: 0, count: 0 }
      }
      
      teamScores[score.team_id].itemScores[score.rubric_item_id].total += score.value
      teamScores[score.team_id].itemScores[score.rubric_item_id].count += 1
    })

    // Calculate weighted totals
    const leaderboard = teams?.map(team => {
      const teamScore = teamScores[team.id]
      if (!teamScore) {
        return {
          team_id: team.id,
          display_name: blindMappings?.find(m => m.team_id === team.id)?.anonymous_name || team.name,
          total_score: 0,
          breakdown: {},
          judge_count: 0,
        }
      }

      const breakdown: Record<string, number> = {}
      let totalScore = 0

      rubricItems?.forEach(item => {
        const itemScore = teamScore.itemScores[item.id]
        if (itemScore && itemScore.count > 0) {
          const avg = itemScore.total / itemScore.count
          const weightedScore = (avg / item.max_score) * item.weight
          breakdown[item.label] = parseFloat(weightedScore.toFixed(2))
          totalScore += weightedScore
        } else {
          breakdown[item.label] = 0
        }
      })

      return {
        team_id: team.id,
        display_name: blindMappings?.find(m => m.team_id === team.id)?.anonymous_name || team.name,
        total_score: parseFloat(totalScore.toFixed(2)),
        breakdown,
        judge_count: teamScore.judgeIds.size,
      }
    }) || []

    // Sort by total_score descending
    leaderboard.sort((a, b) => b.total_score - a.total_score)

    // Assign ranks with tie handling
    let currentRank = 1
    let previousScore: number | null = null
    const rankedLeaderboard = leaderboard.map((team, index) => {
      if (previousScore !== null && team.total_score === previousScore) {
        // Same rank as previous
      } else {
        currentRank = index + 1
      }
      previousScore = team.total_score
      
      return {
        rank: currentRank,
        ...team,
      }
    })

    const result = {
      teams: rankedLeaderboard,
      is_blind: isBlind && !reveal,
      round_label: roundLabel,
      generated_at: new Date().toISOString(),
    }

    // Cache result (30 seconds)
    if (!reveal) {
      await redis.setex(cacheKey, 30, JSON.stringify(result))
    }

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 's-maxage=30, stale-while-revalidate=60',
      },
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}