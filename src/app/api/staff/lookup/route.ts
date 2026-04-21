import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { email, role } = body

    if (!email || !role) {
      return NextResponse.json({ error: 'Email and role are required' }, { status: 400 })
    }

    if (!['judge', 'mentor'].includes(role)) {
      return NextResponse.json({ error: 'Role must be judge or mentor' }, { status: 400 })
    }

    // Look up profile by email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, skills')
      .eq('email', email)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ found: false })
    }

    // Check if profile has the requested role
    if (profile.role !== role) {
      return NextResponse.json({
        found: true,
        profile,
        error: `This user has role ${profile.role}, not ${role}`,
      })
    }

    return NextResponse.json({
      found: true,
      profile,
    })
  } catch (error) {
    console.error('Staff lookup error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}