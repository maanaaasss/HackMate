export type UserRole = 'participant' | 'organiser' | 'judge' | 'mentor' | 'sponsor'

export interface UserProfile {
  id: string
  email: string
  full_name: string
  avatar_url?: string
  role: UserRole
  github_username?: string
  skills: string[]
  bio?: string
  college?: string
  year_of_study?: number
  sponsor_visible: boolean
  github_data?: GitHubData
  created_at: string
}

export interface GitHubData {
  public_repos: number
  followers: number
  bio?: string
  top_repos: {
    name: string
    description?: string
    language?: string
    stars: number
  }[]
  last_synced_at: string
}

export type HackathonStatus = 'draft' | 'published' | 'registration_open' | 'ongoing' | 'judging' | 'ended'

export interface Hackathon {
  id: string
  name: string
  description?: string
  organiser_id: string
  status: HackathonStatus
  start_time?: string
  end_time?: string
  registration_deadline?: string
  submission_deadline?: string
  venue?: string
  max_team_size: number
  min_team_size: number
  max_teams?: number
  presentation_order?: string[]
  created_at: string
}

export interface HackathonTimeline {
  id: string
  hackathon_id: string
  title: string
  description?: string
  scheduled_at: string
  type: 'registration' | 'kickoff' | 'mentor_session' | 'judging_round' | 'final_presentation' | 'results'
}

export type TeamStatus = 'forming' | 'full' | 'submitted' | 'disqualified'

export interface Team {
  id: string
  hackathon_id: string
  name: string
  description?: string
  team_lead_id: string
  status: TeamStatus
  created_at: string
}

export interface TeamMember {
  team_id: string
  user_id: string
  role: 'lead' | 'member'
  joined_at: string
  profile?: UserProfile
}

export interface GhostSlot {
  id: string
  team_id: string
  skill_needed: string
  description?: string
  filled: boolean
  created_at: string
}

export interface JoinRequest {
  id: string
  team_id: string
  user_id: string
  ghost_slot_id?: string
  message?: string
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
  profile?: UserProfile
}

export interface Submission {
  id: string
  team_id: string
  hackathon_id: string
  github_url: string
  live_url?: string
  description?: string
  submitted_at: string
  health_status: 'unchecked' | 'healthy' | 'broken' | 'checking'
  github_healthy?: boolean
  live_url_healthy?: boolean
  last_checked_at?: string
}

export interface RubricItem {
  id: string
  rubric_id: string
  label: string
  description?: string
  max_score: number
  weight: number
  sort_order: number
}

export interface Rubric {
  id: string
  hackathon_id: string
  items: RubricItem[]
}

export interface JudgingRound {
  id: string
  hackathon_id: string
  round_number: number
  label: string
  is_final: boolean
  opened_at?: string
  closed_at?: string
}

export interface Score {
  id: string
  team_id: string
  judge_id: string
  round_id: string
  rubric_item_id: string
  value: number
  notes?: string
}

export interface BlindMapping {
  id: string
  hackathon_id: string
  team_id: string
  anonymous_name: string
}

export interface HelpTicket {
  id: string
  team_id: string
  hackathon_id: string
  tag: string
  description: string
  status: 'open' | 'claimed' | 'resolved'
  claimed_by?: string
  created_at: string
  resolved_at?: string
}

export interface Announcement {
  id: string
  hackathon_id: string
  title: string
  message: string
  channel: 'website' | 'discord' | 'all'
  sent_at: string
}

export interface AttendanceRecord {
  id: string
  user_id: string
  hackathon_id: string
  checked_in_at: string
  checked_in_by?: string
}

export type RedemptionType = 'lunch_day1' | 'lunch_day2' | 'swag' | 'dinner'

export interface RedemptionRecord {
  id: string
  user_id: string
  hackathon_id: string
  type: RedemptionType
  redeemed_at: string
}

export interface Certificate {
  id: string
  user_id: string
  hackathon_id: string
  team_id?: string
  rank?: number
  certificate_type: 'winner' | 'runner_up' | 'participant'
  pdf_url?: string
  issued_at: string
}

export interface Sponsor {
  id: string
  hackathon_id: string
  user_id?: string
  name: string
  logo_url?: string
  website_url?: string
  tier: 'title' | 'gold' | 'silver'
  prize_description?: string
  can_ping_participants: boolean
}

export interface ApiResponse<T> {
  data: T | null
  error: string | null
}