import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type ScoreInput = {
  rubric_item_id: string
  value: number
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { round_id, team_id, scores, notes } = body

    if (!round_id || !team_id || !scores || !Array.isArray(scores)) {
      return NextResponse.json({ error: 'round_id, team_id, and scores array are required' }, { status: 400 })
    }

    // Verify user is judge
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'judge') {
      return NextResponse.json({ error: 'Only judges can seal scores' }, { status: 403 })
    }

    // Verify round is open
    const { data: round } = await supabase
      .from('judging_rounds')
      .select('id, hackathon_id, opened_at, closed_at')
      .eq('id', round_id)
      .single()

    if (!round) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 })
    }

    if (!round.opened_at || round.closed_at) {
      return NextResponse.json({ error: 'Round is not open for scoring' }, { status: 400 })
    }

    // Verify judge is assigned to this hackathon
    const { data: judgeAssignment } = await supabase
      .from('hackathon_judges')
      .select('judge_id')
      .eq('hackathon_id', round.hackathon_id)
      .eq('judge_id', user.id)
      .single()

    if (!judgeAssignment) {
      return NextResponse.json({ error: 'You are not assigned as a judge for this hackathon' }, { status: 403 })
    }

    // Start transaction
    const { error: deleteError } = await supabase
      .from('scores')
      .delete()
      .eq('round_id', round_id)
      .eq('team_id', team_id)
      .eq('judge_id', user.id)

    if (deleteError) {
      console.error('Delete existing scores error:', deleteError)
      return NextResponse.json({ error: 'Failed to clear existing scores' }, { status: 500 })
    }

    // Insert new scores
    const scoresToInsert = scores.map((score: ScoreInput) => ({
      round_id,
      team_id,
      judge_id: user.id,
      rubric_item_id: score.rubric_item_id,
      value: score.value,
      notes: notes || null,
    }))

    const { error: insertError } = await supabase
      .from('scores')
      .insert(scoresToInsert)

    if (insertError) {
      console.error('Insert scores error:', insertError)
      return NextResponse.json({ error: 'Failed to insert scores' }, { status: 500 })
    }

    // Record in audit log
    await supabase
      .from('backend_audit_log')
      .insert({
        user_id: user.id,
        action: 'seal_scores',
        target_id: team_id,
        target_type: 'team',
        metadata: {
          round_id,
          hackathon_id: round.hackathon_id,
          scores_count: scores.length,
          total_score: scores.reduce((sum: number, s: ScoreInput) => sum + s.value, 0),
        },
      })

    // Invalidate Redis leaderboard cache (fire and forget)
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/cache/invalidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: `leaderboard:${round.hackathon_id}`,
      }),
    }).catch(console.error)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}