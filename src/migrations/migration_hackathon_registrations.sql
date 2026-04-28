-- Add hackathon registrations table
-- This allows participants to register for hackathons

CREATE TABLE IF NOT EXISTS hackathon_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hackathon_id uuid NOT NULL REFERENCES hackathons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'cancelled', 'checked_in')),
  registered_at timestamptz NOT NULL DEFAULT now(),
  checked_in_at timestamptz,
  UNIQUE(hackathon_id, user_id)
);

-- Enable RLS
ALTER TABLE hackathon_registrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for hackathon_registrations
CREATE POLICY "registrations_select_own" ON hackathon_registrations
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "registrations_insert_own" ON hackathon_registrations
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "registrations_update_own" ON hackathon_registrations
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "registrations_delete_own" ON hackathon_registrations
  FOR DELETE USING (user_id = auth.uid());

-- Organisers can view all registrations for their hackathons
CREATE POLICY "registrations_select_organiser" ON hackathon_registrations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM hackathons 
      WHERE hackathons.id = hackathon_registrations.hackathon_id 
      AND hackathons.organiser_id = auth.uid()
    )
  );

-- Organisers can update registrations (e.g., check-in)
CREATE POLICY "registrations_update_organiser" ON hackathon_registrations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM hackathons 
      WHERE hackathons.id = hackathon_registrations.hackathon_id 
      AND hackathons.organiser_id = auth.uid()
    )
  );

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_hackathon_registrations_hackathon_id ON hackathon_registrations(hackathon_id);
CREATE INDEX IF NOT EXISTS idx_hackathon_registrations_user_id ON hackathon_registrations(user_id);