-- Part 1: Initial Schema for Hackmate
-- Run this in Supabase SQL Editor

-- 1. profiles
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  avatar_url text,
  role text NOT NULL DEFAULT 'participant'
    CHECK (role IN ('participant','organiser','judge','mentor','sponsor')),
  github_username text,
  skills text[] NOT NULL DEFAULT '{}',
  bio text,
  college text,
  year_of_study int CHECK (year_of_study BETWEEN 1 AND 6),
  sponsor_visible boolean NOT NULL DEFAULT false,
  github_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. hackathons
CREATE TABLE IF NOT EXISTS hackathons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  organiser_id uuid NOT NULL REFERENCES profiles(id),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','published','registration_open','ongoing','judging','ended')),
  start_time timestamptz,
  end_time timestamptz,
  registration_deadline timestamptz,
  submission_deadline timestamptz,
  venue text,
  max_team_size int NOT NULL DEFAULT 4 CHECK (max_team_size BETWEEN 1 AND 10),
  min_team_size int NOT NULL DEFAULT 1 CHECK (min_team_size >= 1),
  max_teams int,
  presentation_order jsonb DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. hackathon_timeline
CREATE TABLE IF NOT EXISTS hackathon_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hackathon_id uuid NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  scheduled_at timestamptz NOT NULL,
  type text NOT NULL CHECK (type IN
    ('registration','kickoff','mentor_session','judging_round','final_presentation','results'))
);

-- 4. teams
CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hackathon_id uuid NOT NULL REFERENCES hackathons(id),
  name text NOT NULL,
  description text,
  team_lead_id uuid NOT NULL REFERENCES profiles(id),
  status text NOT NULL DEFAULT 'forming'
    CHECK (status IN ('forming','full','submitted','disqualified')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(hackathon_id, name)
);

-- 5. team_members
CREATE TABLE IF NOT EXISTS team_members (
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('lead','member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, user_id)
);

-- 6. ghost_slots
CREATE TABLE IF NOT EXISTS ghost_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  skill_needed text NOT NULL,
  description text,
  filled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 7. join_requests
CREATE TABLE IF NOT EXISTS join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id),
  user_id uuid NOT NULL REFERENCES profiles(id),
  ghost_slot_id uuid REFERENCES ghost_slots(id),
  message text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- 8. hackathon_judges
CREATE TABLE IF NOT EXISTS hackathon_judges (
  hackathon_id uuid REFERENCES hackathons(id) ON DELETE CASCADE,
  judge_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (hackathon_id, judge_id)
);

-- 9. hackathon_mentors
CREATE TABLE IF NOT EXISTS hackathon_mentors (
  hackathon_id uuid REFERENCES hackathons(id) ON DELETE CASCADE,
  mentor_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (hackathon_id, mentor_id)
);

-- A. Trigger function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- B. Apply trigger to profiles, hackathons, teams
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_hackathons_updated_at
  BEFORE UPDATE ON hackathons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_hackathons_organiser_id ON hackathons(organiser_id);
CREATE INDEX IF NOT EXISTS idx_hackathons_status ON hackathons(status);
CREATE INDEX IF NOT EXISTS idx_teams_hackathon_id ON teams(hackathon_id);
CREATE INDEX IF NOT EXISTS idx_teams_team_lead_id ON teams(team_lead_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_join_requests_team_id_status ON join_requests(team_id, status);
CREATE INDEX IF NOT EXISTS idx_ghost_slots_team_id_filled ON ghost_slots(team_id, filled);