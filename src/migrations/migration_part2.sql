-- Part 2: Additional Tables for Hackmate
-- Run this after Part 1 in Supabase SQL Editor

-- 1. submissions
CREATE TABLE IF NOT EXISTS submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL UNIQUE REFERENCES teams(id),
  hackathon_id uuid NOT NULL REFERENCES hackathons(id),
  github_url text NOT NULL,
  live_url text,
  description text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  health_status text NOT NULL DEFAULT 'unchecked'
    CHECK (health_status IN ('unchecked','healthy','broken','checking')),
  github_healthy boolean,
  live_url_healthy boolean,
  last_checked_at timestamptz
);

-- 2. rubrics
CREATE TABLE IF NOT EXISTS rubrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hackathon_id uuid NOT NULL UNIQUE REFERENCES hackathons(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. rubric_items
CREATE TABLE IF NOT EXISTS rubric_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rubric_id uuid NOT NULL REFERENCES rubrics(id) ON DELETE CASCADE,
  label text NOT NULL,
  description text,
  max_score int NOT NULL DEFAULT 10 CHECK (max_score BETWEEN 1 AND 100),
  weight int NOT NULL DEFAULT 25 CHECK (weight BETWEEN 1 AND 100),
  sort_order int NOT NULL DEFAULT 0
);

-- 4. judging_rounds
CREATE TABLE IF NOT EXISTS judging_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hackathon_id uuid NOT NULL REFERENCES hackathons(id),
  round_number int NOT NULL,
  label text NOT NULL,
  is_final boolean NOT NULL DEFAULT false,
  opened_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(hackathon_id, round_number)
);

-- 5. scores
CREATE TABLE IF NOT EXISTS scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id),
  judge_id uuid NOT NULL REFERENCES profiles(id),
  round_id uuid NOT NULL REFERENCES judging_rounds(id),
  rubric_item_id uuid NOT NULL REFERENCES rubric_items(id),
  value numeric(5,2) NOT NULL CHECK (value >= 0),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(team_id, judge_id, round_id, rubric_item_id)
);

-- 6. blind_mappings
CREATE TABLE IF NOT EXISTS blind_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hackathon_id uuid NOT NULL REFERENCES hackathons(id),
  team_id uuid NOT NULL REFERENCES teams(id),
  anonymous_name text NOT NULL,
  UNIQUE(hackathon_id, team_id),
  UNIQUE(hackathon_id, anonymous_name)
);

-- Apply updated_at trigger to scores table
CREATE TRIGGER update_scores_updated_at
  BEFORE UPDATE ON scores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scores_team_id_round_id ON scores(team_id, round_id);
CREATE INDEX IF NOT EXISTS idx_scores_judge_id ON scores(judge_id);
CREATE INDEX IF NOT EXISTS idx_judging_rounds_hackathon_id ON judging_rounds(hackathon_id);
CREATE INDEX IF NOT EXISTS idx_submissions_hackathon_id ON submissions(hackathon_id);
CREATE INDEX IF NOT EXISTS idx_blind_mappings_hackathon_id ON blind_mappings(hackathon_id);