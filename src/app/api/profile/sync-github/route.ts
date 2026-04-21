import { createClient } from '@/lib/supabase/server'
import { unauthorized, notFound, error, serverError, success, rateLimit as rateLimitResponse } from '@/lib/api-response'
import { rateLimit } from '@/lib/rate-limit'

export async function POST() {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return unauthorized()
    }

    // Rate limiting: 5 per user per hour
    const rl = await rateLimit(`user:${user.id}:sync-github`, 5, 3600)
    if (!rl.success) {
      return rateLimitResponse('Too many GitHub syncs', Math.ceil((rl.resetAt - Date.now()) / 1000))
    }

    // Get user's github_username from their profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('github_username')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return notFound('Profile not found')
    }

    if (!profile.github_username) {
      return error('Set your GitHub username in your profile first')
    }

    const githubUsername = profile.github_username

    // Fetch GitHub user info
    const userResponse = await fetch(
      `https://api.github.com/users/${githubUsername}`,
      {
        headers: {
          Authorization: `token ${process.env.GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    )

    if (!userResponse.ok) {
      if (userResponse.status === 404) {
        return notFound('GitHub user not found')
      }
      if (userResponse.status === 403) {
        return error('GitHub API rate limit hit', 403)
      }
      throw new Error(`GitHub API error: ${userResponse.status}`)
    }

    const githubUser = await userResponse.json()

    // Fetch top repos
    const reposResponse = await fetch(
      `https://api.github.com/users/${githubUsername}/repos?sort=pushed&per_page=6`,
      {
        headers: {
          Authorization: `token ${process.env.GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    )

    if (!reposResponse.ok) {
      throw new Error(`GitHub repos API error: ${reposResponse.status}`)
    }

    const repos = await reposResponse.json()

    // Build github_data object
    const githubData = {
      public_repos: githubUser.public_repos,
      followers: githubUser.followers,
      bio: githubUser.bio || null,
      top_repos: repos.map((repo: {
        name: string
        description: string | null
        language: string | null
        stargazers_count: number
      }) => ({
        name: repo.name,
        description: repo.description || undefined,
        language: repo.language || undefined,
        stars: repo.stargazers_count,
      })),
      last_synced_at: new Date().toISOString(),
    }

    // Update profile with github_data
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        github_data: githubData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Profile update error:', updateError)
      return serverError(updateError)
    }

    return success(githubData, 200, true)
  } catch (err) {
    return serverError(err)
  }
}
