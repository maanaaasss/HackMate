import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await params
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is mentor or organiser
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['mentor', 'organiser'].includes(profile.role)) {
      return NextResponse.json({ error: 'Only mentors and organisers can access GitHub activity' }, { status: 403 })
    }

    // Fetch team's submission to get github_url
    const { data: submission, error: submissionError } = await supabase
      .from('submissions')
      .select('github_url, team_id')
      .eq('team_id', teamId)
      .single()

    if (submissionError || !submission) {
      return NextResponse.json({ error: 'No submission found for this team' }, { status: 404 })
    }

    // Parse github_url: extract owner and repo
    const githubUrl = submission.github_url
    const match = githubUrl.match(/github\.com\/([\w-]+)\/([\w-]+)/)
    if (!match) {
      return NextResponse.json({ error: 'Invalid GitHub URL' }, { status: 400 })
    }

    const [, owner, repo] = match
    const repoUrl = `https://github.com/${owner}/${repo}`

    // Fetch commits from GitHub API
    try {
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/commits?per_page=5`,
        {
          headers: {
            Authorization: `token ${process.env.GITHUB_TOKEN}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      )

      if (!response.ok) {
        if (response.status === 404) {
          return NextResponse.json({ error: 'Repository not found or private' }, { status: 404 })
        }
        if (response.status === 403) {
          return NextResponse.json({ error: 'Rate limit hit' }, { status: 403 })
        }
        throw new Error(`GitHub API error: ${response.status}`)
      }

      const commits = await response.json()

      if (!commits || commits.length === 0) {
        return NextResponse.json({
          repo_url: repoUrl,
          last_commit_at: null,
          last_commit_message: null,
          commit_count_24h: 0,
          last_5_commits: [],
          inactive_hours: Infinity,
          alert: true,
        })
      }

      // Compute inactive_hours
      const lastCommitDate = new Date(commits[0].commit.committer.date)
      const now = new Date()
      const inactiveHours = (now.getTime() - lastCommitDate.getTime()) / 3600000

      // Count commits in last 24 hours
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const commits24h = commits.filter((commit: { commit: { committer: { date: string } } }) => 
        new Date(commit.commit.committer.date) >= twentyFourHoursAgo
      ).length

      // Format last 5 commits
      const last5Commits = commits.slice(0, 5).map((commit: { 
        sha: string
        commit: { 
          message: string
          author: { name: string }
          committer: { date: string }
        }
      }) => ({
        sha: commit.sha.substring(0, 7),
        message: commit.commit.message.substring(0, 60),
        author: commit.commit.author.name,
        committed_at: commit.commit.committer.date,
      }))

      return NextResponse.json({
        repo_url: repoUrl,
        last_commit_at: lastCommitDate.toISOString(),
        last_commit_message: commits[0].commit.message,
        commit_count_24h: commits24h,
        last_5_commits: last5Commits,
        inactive_hours: parseFloat(inactiveHours.toFixed(1)),
        alert: inactiveHours > 6,
      })
    } catch (githubError: unknown) {
      const error = githubError as { message?: string }
      console.error('GitHub API error:', error.message)
      return NextResponse.json({ error: 'Failed to fetch GitHub data' }, { status: 500 })
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
