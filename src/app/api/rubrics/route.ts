import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { RubricItem } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const hackathonId = searchParams.get('hackathon_id')

    if (!hackathonId) {
      return NextResponse.json({ error: 'hackathon_id is required' }, { status: 400 })
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify organiser of hackathon
    const { data: hackathon, error: hackathonError } = await supabase
      .from('hackathons')
      .select('organiser_id')
      .eq('id', hackathonId)
      .single()

    if (hackathonError || !hackathon || hackathon.organiser_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch rubric with items
    const { data: rubric, error: rubricError } = await supabase
      .from('rubrics')
      .select(`
        id,
        hackathon_id,
        rubric_items (
          id,
          label,
          description,
          max_score,
          weight,
          sort_order
        )
      `)
      .eq('hackathon_id', hackathonId)
      .single()

    if (rubricError && rubricError.code !== 'PGRST116') {
      // PGRST116 means no rows found, which is fine
      return NextResponse.json({ error: 'Failed to fetch rubric' }, { status: 500 })
    }

    return NextResponse.json(rubric || null)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
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
    const { hackathon_id, items } = body

    if (!hackathon_id || !items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'hackathon_id and items array are required' }, { status: 400 })
    }

    // Verify organiser of hackathon
    const { data: hackathon, error: hackathonError } = await supabase
      .from('hackathons')
      .select('organiser_id')
      .eq('id', hackathon_id)
      .single()

    if (hackathonError || !hackathon || hackathon.organiser_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Validate total weight = 100
    const totalWeight = items.reduce((sum: number, item: RubricItem) => sum + (item.weight || 0), 0)
    if (totalWeight !== 100) {
      return NextResponse.json({ error: 'Total weight must equal 100%' }, { status: 400 })
    }

    // Upsert rubric (insert or update)
    const { data: rubric, error: rubricError } = await supabase
      .from('rubrics')
      .upsert({
        hackathon_id,
      }, {
        onConflict: 'hackathon_id',
      })
      .select()
      .single()

    if (rubricError) {
      console.error('Rubric upsert error:', rubricError)
      return NextResponse.json({ error: 'Failed to upsert rubric' }, { status: 500 })
    }

    const rubricId = rubric.id

    // Delete existing items for this rubric
    const { error: deleteError } = await supabase
      .from('rubric_items')
      .delete()
      .eq('rubric_id', rubricId)

    if (deleteError) {
      console.error('Delete items error:', deleteError)
      return NextResponse.json({ error: 'Failed to replace rubric items' }, { status: 500 })
    }

    // Insert new items
    const itemsToInsert = items.map((item: RubricItem, index: number) => ({
      rubric_id: rubricId,
      label: item.label,
      description: item.description || null,
      max_score: item.max_score || 10,
      weight: item.weight,
      sort_order: index,
    }))

    const { error: insertError } = await supabase
      .from('rubric_items')
      .insert(itemsToInsert)

    if (insertError) {
      console.error('Insert items error:', insertError)
      return NextResponse.json({ error: 'Failed to insert rubric items' }, { status: 500 })
    }

    return NextResponse.json({ success: true, rubric_id: rubricId })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}