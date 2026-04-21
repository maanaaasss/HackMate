-- Part 3: Additional Tables for Hackmate
-- Run this after Part 2 in Supabase SQL Editor

-- 1. help_tickets
CREATE TABLE IF NOT EXISTS help_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id),
  hackathon_id uuid NOT NULL REFERENCES hackathons(id),
  tag text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','claimed','resolved')),
  claimed_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

-- 2. announcements
CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hackathon_id uuid NOT NULL REFERENCES hackathons(id),
  title text NOT NULL,
  message text NOT NULL,
  channel text NOT NULL DEFAULT 'website' CHECK (channel IN ('website','discord','all')),
  discord_webhook_url text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  sent_by uuid NOT NULL REFERENCES profiles(id)
);

-- 3. attendance_records
CREATE TABLE IF NOT EXISTS attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id),
  hackathon_id uuid NOT NULL REFERENCES hackathons(id),
  checked_in_at timestamptz NOT NULL DEFAULT now(),
  checked_in_by uuid REFERENCES profiles(id),
  UNIQUE(user_id, hackathon_id)
);

-- 4. redemption_records
CREATE TABLE IF NOT EXISTS redemption_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id),
  hackathon_id uuid NOT NULL REFERENCES hackathons(id),
  type text NOT NULL CHECK (type IN ('lunch_day1','lunch_day2','swag','dinner')),
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  redeemed_by uuid REFERENCES profiles(id),
  UNIQUE(user_id, hackathon_id, type)
);

-- 5. certificates
CREATE TABLE IF NOT EXISTS certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id),
  hackathon_id uuid NOT NULL REFERENCES hackathons(id),
  team_id uuid REFERENCES teams(id),
  rank int,
  certificate_type text NOT NULL CHECK (certificate_type IN ('winner','runner_up','participant')),
  pdf_url text,
  issued_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, hackathon_id)
);

-- 6. sponsors
CREATE TABLE IF NOT EXISTS sponsors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hackathon_id uuid NOT NULL REFERENCES hackathons(id),
  user_id uuid REFERENCES profiles(id),
  name text NOT NULL,
  logo_url text,
  website_url text,
  tier text NOT NULL DEFAULT 'silver' CHECK (tier IN ('title','gold','silver')),
  prize_description text,
  can_ping_participants boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 7. sponsor_pings
CREATE TABLE IF NOT EXISTS sponsor_pings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id uuid NOT NULL REFERENCES sponsors(id),
  hackathon_id uuid NOT NULL REFERENCES hackathons(id),
  message text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now()
);

-- 8. feedback_responses
CREATE TABLE IF NOT EXISTS feedback_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id),
  hackathon_id uuid NOT NULL REFERENCES hackathons(id),
  mentor_rating int CHECK (mentor_rating BETWEEN 1 AND 5),
  judge_rating int CHECK (judge_rating BETWEEN 1 AND 5),
  food_rating int CHECK (food_rating BETWEEN 1 AND 5),
  organisation_rating int CHECK (organisation_rating BETWEEN 1 AND 5),
  mentor_comment text,
  overall_comment text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, hackathon_id)
);

-- 9. backend_audit_log
CREATE TABLE IF NOT EXISTS backend_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  action text NOT NULL,
  target_id text,
  target_type text,
  metadata jsonb,
  performed_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_help_tickets_hackathon_id_status ON help_tickets(hackathon_id, status);
CREATE INDEX IF NOT EXISTS idx_attendance_records_hackathon_id ON attendance_records(hackathon_id);
CREATE INDEX IF NOT EXISTS idx_certificates_user_id ON certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_responses_hackathon_id ON feedback_responses(hackathon_id);