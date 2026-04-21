-- Part 4: Row Level Security (RLS) Policies for Hackmate
-- Run after all migrations in Supabase SQL Editor

-- Helper function to get current user's role
CREATE OR REPLACE FUNCTION get_user_role() RETURNS text AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE hackathons ENABLE ROW LEVEL SECURITY;
ALTER TABLE hackathon_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE ghost_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE hackathon_judges ENABLE ROW LEVEL SECURITY;
ALTER TABLE hackathon_mentors ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE rubric_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE judging_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE blind_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemption_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsor_pings ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE backend_audit_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (for clean reinstall)
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_staff" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_blocked" ON profiles;

DROP POLICY IF EXISTS "hackathons_select_public" ON hackathons;
DROP POLICY IF EXISTS "hackathons_select_organiser" ON hackathons;
DROP POLICY IF EXISTS "hackathons_insert_organiser" ON hackathons;
DROP POLICY IF EXISTS "hackathons_update_organiser" ON hackathons;
DROP POLICY IF EXISTS "hackathons_delete_organiser" ON hackathons;

DROP POLICY IF EXISTS "teams_select_all" ON teams;
DROP POLICY IF EXISTS "teams_insert_participant" ON teams;
DROP POLICY IF EXISTS "teams_update_lead" ON teams;

DROP POLICY IF EXISTS "team_members_select_all" ON team_members;
DROP POLICY IF EXISTS "team_members_insert_self_or_lead" ON team_members;
DROP POLICY IF EXISTS "team_members_delete_self_or_lead" ON team_members;

DROP POLICY IF EXISTS "ghost_slots_select_all" ON ghost_slots;
DROP POLICY IF EXISTS "ghost_slots_insert_lead" ON ghost_slots;
DROP POLICY IF EXISTS "ghost_slots_update_lead" ON ghost_slots;
DROP POLICY IF EXISTS "ghost_slots_delete_lead" ON ghost_slots;

DROP POLICY IF EXISTS "join_requests_select_team_lead" ON join_requests;
DROP POLICY IF EXISTS "join_requests_select_self" ON join_requests;
DROP POLICY IF EXISTS "join_requests_insert_participant" ON join_requests;
DROP POLICY IF EXISTS "join_requests_update_team_lead" ON join_requests;

DROP POLICY IF EXISTS "hackathon_judges_select_all" ON hackathon_judges;
DROP POLICY IF EXISTS "hackathon_judges_insert_organiser" ON hackathon_judges;
DROP POLICY IF EXISTS "hackathon_judges_delete_organiser" ON hackathon_judges;

DROP POLICY IF EXISTS "hackathon_mentors_select_all" ON hackathon_mentors;
DROP POLICY IF EXISTS "hackathon_mentors_insert_organiser" ON hackathon_mentors;
DROP POLICY IF EXISTS "hackathon_mentors_delete_organiser" ON hackathon_mentors;

DROP POLICY IF EXISTS "submissions_select_all" ON submissions;
DROP POLICY IF EXISTS "submissions_insert_team_member" ON submissions;
DROP POLICY IF EXISTS "submissions_update_team_member" ON submissions;

DROP POLICY IF EXISTS "rubrics_select_all" ON rubrics;
DROP POLICY IF EXISTS "rubrics_insert_organiser" ON rubrics;
DROP POLICY IF EXISTS "rubrics_update_organiser" ON rubrics;
DROP POLICY IF EXISTS "rubrics_delete_organiser" ON rubrics;

DROP POLICY IF EXISTS "rubric_items_select_all" ON rubric_items;
DROP POLICY IF EXISTS "rubric_items_insert_organiser" ON rubric_items;
DROP POLICY IF EXISTS "rubric_items_update_organiser" ON rubric_items;
DROP POLICY IF EXISTS "rubric_items_delete_organiser" ON rubric_items;

DROP POLICY IF EXISTS "judging_rounds_select_all" ON judging_rounds;
DROP POLICY IF EXISTS "judging_rounds_insert_organiser" ON judging_rounds;
DROP POLICY IF EXISTS "judging_rounds_update_organiser" ON judging_rounds;

DROP POLICY IF EXISTS "scores_select_judge_or_organiser" ON scores;
DROP POLICY IF EXISTS "scores_insert_judge" ON scores;
DROP POLICY IF EXISTS "scores_update_judge" ON scores;

DROP POLICY IF EXISTS "blind_mappings_select_judges" ON blind_mappings;
DROP POLICY IF EXISTS "blind_mappings_insert_organiser" ON blind_mappings;
DROP POLICY IF EXISTS "blind_mappings_delete_organiser" ON blind_mappings;

DROP POLICY IF EXISTS "help_tickets_select_team_or_staff" ON help_tickets;
DROP POLICY IF EXISTS "help_tickets_insert_team_member" ON help_tickets;
DROP POLICY IF EXISTS "help_tickets_update_team_or_mentor" ON help_tickets;

DROP POLICY IF EXISTS "announcements_select_all" ON announcements;
DROP POLICY IF EXISTS "announcements_insert_organiser" ON announcements;
DROP POLICY IF EXISTS "announcements_update_organiser" ON announcements;
DROP POLICY IF EXISTS "announcements_delete_organiser" ON announcements;

DROP POLICY IF EXISTS "attendance_records_select_own_or_organiser" ON attendance_records;
DROP POLICY IF EXISTS "attendance_records_insert_organiser" ON attendance_records;

DROP POLICY IF EXISTS "redemption_records_select_own_or_organiser" ON redemption_records;
DROP POLICY IF EXISTS "redemption_records_insert_organiser" ON redemption_records;

DROP POLICY IF EXISTS "certificates_select_all" ON certificates;
DROP POLICY IF EXISTS "certificates_insert_organiser" ON certificates;
DROP POLICY IF EXISTS "certificates_update_organiser" ON certificates;

DROP POLICY IF EXISTS "sponsors_select_all" ON sponsors;
DROP POLICY IF EXISTS "sponsors_insert_organiser" ON sponsors;
DROP POLICY IF EXISTS "sponsors_update_organiser" ON sponsors;

DROP POLICY IF EXISTS "sponsor_pings_select_all" ON sponsor_pings;
DROP POLICY IF EXISTS "sponsor_pings_insert_sponsor_or_organiser" ON sponsor_pings;

DROP POLICY IF EXISTS "feedback_responses_select_own_or_organiser" ON feedback_responses;
DROP POLICY IF EXISTS "feedback_responses_insert_participant" ON feedback_responses;

DROP POLICY IF EXISTS "backend_audit_log_select_organiser" ON backend_audit_log;
DROP POLICY IF EXISTS "backend_audit_log_insert_system" ON backend_audit_log;

-- profiles policies
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "profiles_select_staff" ON profiles
  FOR SELECT USING (
    get_user_role() IN ('organiser', 'judge', 'mentor', 'sponsor')
  );

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "profiles_insert_blocked" ON profiles
  FOR INSERT WITH CHECK (false);

-- hackathons policies
CREATE POLICY "hackathons_select_public" ON hackathons
  FOR SELECT USING (
    status IN ('published', 'registration_open', 'ongoing', 'judging', 'ended')
    OR auth.uid() IS NOT NULL
  );

CREATE POLICY "hackathons_select_organiser" ON hackathons
  FOR SELECT USING (organiser_id = auth.uid());

CREATE POLICY "hackathons_insert_organiser" ON hackathons
  FOR INSERT WITH CHECK (get_user_role() = 'organiser');

CREATE POLICY "hackathons_update_organiser" ON hackathons
  FOR UPDATE USING (organiser_id = auth.uid());

CREATE POLICY "hackathons_delete_organiser" ON hackathons
  FOR DELETE USING (
    organiser_id = auth.uid() AND status = 'draft'
  );

-- hackathon_timeline (inherits hackathon visibility)
CREATE POLICY "hackathon_timeline_select_all" ON hackathon_timeline
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM hackathons h
      WHERE h.id = hackathon_id
      AND (
        h.status IN ('published', 'registration_open', 'ongoing', 'judging', 'ended')
        OR h.organiser_id = auth.uid()
      )
    )
  );

CREATE POLICY "hackathon_timeline_insert_organiser" ON hackathon_timeline
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM hackathons h
      WHERE h.id = hackathon_id
      AND h.organiser_id = auth.uid()
    )
  );

CREATE POLICY "hackathon_timeline_update_organiser" ON hackathon_timeline
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM hackathons h
      WHERE h.id = hackathon_id
      AND h.organiser_id = auth.uid()
    )
  );

CREATE POLICY "hackathon_timeline_delete_organiser" ON hackathon_timeline
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM hackathons h
      WHERE h.id = hackathon_id
      AND h.organiser_id = auth.uid()
    )
  );

-- teams policies
CREATE POLICY "teams_select_all" ON teams
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "teams_insert_participant" ON teams
  FOR INSERT WITH CHECK (
    get_user_role() = 'participant'
    AND NOT EXISTS (
      SELECT 1 FROM team_members tm
      JOIN teams t ON t.id = tm.team_id
      WHERE tm.user_id = auth.uid()
      AND t.hackathon_id = hackathon_id
    )
  );

CREATE POLICY "teams_update_lead" ON teams
  FOR UPDATE USING (team_lead_id = auth.uid());

-- team_members policies
CREATE POLICY "team_members_select_all" ON team_members
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "team_members_insert_self_or_lead" ON team_members
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = team_id
      AND t.team_lead_id = auth.uid()
    )
  );

CREATE POLICY "team_members_delete_self_or_lead" ON team_members
  FOR DELETE USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = team_id
      AND t.team_lead_id = auth.uid()
    )
  );

-- ghost_slots policies
CREATE POLICY "ghost_slots_select_all" ON ghost_slots
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "ghost_slots_insert_lead" ON ghost_slots
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = team_id
      AND t.team_lead_id = auth.uid()
    )
  );

CREATE POLICY "ghost_slots_update_lead" ON ghost_slots
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = team_id
      AND t.team_lead_id = auth.uid()
    )
  );

CREATE POLICY "ghost_slots_delete_lead" ON ghost_slots
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = team_id
      AND t.team_lead_id = auth.uid()
    )
  );

-- join_requests policies
CREATE POLICY "join_requests_select_team_lead" ON join_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = team_id
      AND t.team_lead_id = auth.uid()
    )
  );

CREATE POLICY "join_requests_select_self" ON join_requests
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "join_requests_insert_participant" ON join_requests
  FOR INSERT WITH CHECK (
    get_user_role() = 'participant'
    AND user_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_id
      AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "join_requests_update_team_lead" ON join_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = team_id
      AND t.team_lead_id = auth.uid()
    )
  );

-- hackathon_judges policies
CREATE POLICY "hackathon_judges_select_all" ON hackathon_judges
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "hackathon_judges_insert_organiser" ON hackathon_judges
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM hackathons h
      WHERE h.id = hackathon_id
      AND h.organiser_id = auth.uid()
    )
  );

CREATE POLICY "hackathon_judges_delete_organiser" ON hackathon_judges
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM hackathons h
      WHERE h.id = hackathon_id
      AND h.organiser_id = auth.uid()
    )
  );

-- hackathon_mentors policies
CREATE POLICY "hackathon_mentors_select_all" ON hackathon_mentors
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "hackathon_mentors_insert_organiser" ON hackathon_mentors
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM hackathons h
      WHERE h.id = hackathon_id
      AND h.organiser_id = auth.uid()
    )
  );

CREATE POLICY "hackathon_mentors_delete_organiser" ON hackathon_mentors
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM hackathons h
      WHERE h.id = hackathon_id
      AND h.organiser_id = auth.uid()
    )
  );

-- submissions policies
CREATE POLICY "submissions_select_all" ON submissions
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "submissions_insert_team_member" ON submissions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_id
      AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "submissions_update_team_member" ON submissions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_id
      AND tm.user_id = auth.uid()
    )
  );

-- rubrics policies
CREATE POLICY "rubrics_select_all" ON rubrics
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "rubrics_insert_organiser" ON rubrics
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM hackathons h
      WHERE h.id = hackathon_id
      AND h.organiser_id = auth.uid()
    )
  );

CREATE POLICY "rubrics_update_organiser" ON rubrics
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM hackathons h
      WHERE h.id = hackathon_id
      AND h.organiser_id = auth.uid()
    )
  );

CREATE POLICY "rubrics_delete_organiser" ON rubrics
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM hackathons h
      WHERE h.id = hackathon_id
      AND h.organiser_id = auth.uid()
    )
  );

-- rubric_items policies
CREATE POLICY "rubric_items_select_all" ON rubric_items
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "rubric_items_insert_organiser" ON rubric_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM rubrics r
      JOIN hackathons h ON h.id = r.hackathon_id
      WHERE r.id = rubric_id
      AND h.organiser_id = auth.uid()
    )
  );

CREATE POLICY "rubric_items_update_organiser" ON rubric_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM rubrics r
      JOIN hackathons h ON h.id = r.hackathon_id
      WHERE r.id = rubric_id
      AND h.organiser_id = auth.uid()
    )
  );

CREATE POLICY "rubric_items_delete_organiser" ON rubric_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM rubrics r
      JOIN hackathons h ON h.id = r.hackathon_id
      WHERE r.id = rubric_id
      AND h.organiser_id = auth.uid()
    )
  );

-- judging_rounds policies
CREATE POLICY "judging_rounds_select_all" ON judging_rounds
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "judging_rounds_insert_organiser" ON judging_rounds
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM hackathons h
      WHERE h.id = hackathon_id
      AND h.organiser_id = auth.uid()
    )
  );

CREATE POLICY "judging_rounds_update_organiser" ON judging_rounds
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM hackathons h
      WHERE h.id = hackathon_id
      AND h.organiser_id = auth.uid()
    )
  );

-- scores policies
CREATE POLICY "scores_select_judge_or_organiser" ON scores
  FOR SELECT USING (
    judge_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM hackathons h
      JOIN judging_rounds jr ON jr.hackathon_id = h.id
      WHERE jr.id = round_id
      AND h.organiser_id = auth.uid()
    )
  );

CREATE POLICY "scores_insert_judge" ON scores
  FOR INSERT WITH CHECK (
    get_user_role() = 'judge'
    AND judge_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM judging_rounds jr
      WHERE jr.id = round_id
      AND jr.opened_at IS NOT NULL
      AND jr.closed_at IS NULL
    )
  );

CREATE POLICY "scores_update_judge" ON scores
  FOR UPDATE USING (
    judge_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM judging_rounds jr
      WHERE jr.id = round_id
      AND jr.opened_at IS NOT NULL
      AND jr.closed_at IS NULL
    )
  );

-- blind_mappings policies
CREATE POLICY "blind_mappings_select_judges" ON blind_mappings
  FOR SELECT USING (
    get_user_role() = 'judge'
    AND EXISTS (
      SELECT 1 FROM hackathon_judges hj
      WHERE hj.hackathon_id = blind_mappings.hackathon_id
      AND hj.judge_id = auth.uid()
    )
  );

CREATE POLICY "blind_mappings_insert_organiser" ON blind_mappings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM hackathons h
      WHERE h.id = hackathon_id
      AND h.organiser_id = auth.uid()
    )
  );

CREATE POLICY "blind_mappings_delete_organiser" ON blind_mappings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM hackathons h
      WHERE h.id = hackathon_id
      AND h.organiser_id = auth.uid()
    )
  );

-- help_tickets policies
CREATE POLICY "help_tickets_select_team_or_staff" ON help_tickets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_id
      AND tm.user_id = auth.uid()
    )
    OR get_user_role() IN ('mentor', 'organiser')
  );

CREATE POLICY "help_tickets_insert_team_member" ON help_tickets
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_id
      AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "help_tickets_update_team_or_mentor" ON help_tickets
  FOR UPDATE USING (
    (
      status = 'open'
      AND EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.team_id = team_id
        AND tm.user_id = auth.uid()
      )
    )
    OR get_user_role() = 'mentor'
  );

-- announcements policies
CREATE POLICY "announcements_select_all" ON announcements
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "announcements_insert_organiser" ON announcements
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM hackathons h
      WHERE h.id = hackathon_id
      AND h.organiser_id = auth.uid()
    )
  );

CREATE POLICY "announcements_update_organiser" ON announcements
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM hackathons h
      WHERE h.id = hackathon_id
      AND h.organiser_id = auth.uid()
    )
  );

CREATE POLICY "announcements_delete_organiser" ON announcements
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM hackathons h
      WHERE h.id = hackathon_id
      AND h.organiser_id = auth.uid()
    )
  );

-- attendance_records policies
CREATE POLICY "attendance_records_select_own_or_organiser" ON attendance_records
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM hackathons h
      WHERE h.id = hackathon_id
      AND h.organiser_id = auth.uid()
    )
  );

CREATE POLICY "attendance_records_insert_organiser" ON attendance_records
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM hackathons h
      WHERE h.id = hackathon_id
      AND h.organiser_id = auth.uid()
    )
  );

-- redemption_records policies
CREATE POLICY "redemption_records_select_own_or_organiser" ON redemption_records
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM hackathons h
      WHERE h.id = hackathon_id
      AND h.organiser_id = auth.uid()
    )
  );

CREATE POLICY "redemption_records_insert_organiser" ON redemption_records
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM hackathons h
      WHERE h.id = hackathon_id
      AND h.organiser_id = auth.uid()
    )
  );

-- certificates policies
CREATE POLICY "certificates_select_all" ON certificates
  FOR SELECT USING (true);

CREATE POLICY "certificates_insert_organiser" ON certificates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM hackathons h
      WHERE h.id = hackathon_id
      AND h.organiser_id = auth.uid()
    )
  );

CREATE POLICY "certificates_update_organiser" ON certificates
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM hackathons h
      WHERE h.id = hackathon_id
      AND h.organiser_id = auth.uid()
    )
  );

-- sponsors policies
CREATE POLICY "sponsors_select_all" ON sponsors
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "sponsors_insert_organiser" ON sponsors
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM hackathons h
      WHERE h.id = hackathon_id
      AND h.organiser_id = auth.uid()
    )
  );

CREATE POLICY "sponsors_update_organiser" ON sponsors
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM hackathons h
      WHERE h.id = hackathon_id
      AND h.organiser_id = auth.uid()
    )
  );

-- sponsor_pings policies
CREATE POLICY "sponsor_pings_select_all" ON sponsor_pings
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "sponsor_pings_insert_sponsor_or_organiser" ON sponsor_pings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sponsors s
      WHERE s.id = sponsor_id
      AND (s.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM hackathons h
        WHERE h.id = s.hackathon_id
        AND h.organiser_id = auth.uid()
      ))
    )
  );

-- feedback_responses policies
CREATE POLICY "feedback_responses_select_own_or_organiser" ON feedback_responses
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM hackathons h
      WHERE h.id = hackathon_id
      AND h.organiser_id = auth.uid()
    )
  );

CREATE POLICY "feedback_responses_insert_participant" ON feedback_responses
  FOR INSERT WITH CHECK (
    get_user_role() = 'participant'
    AND user_id = auth.uid()
  );

-- backend_audit_log policies
CREATE POLICY "backend_audit_log_select_organiser" ON backend_audit_log
  FOR SELECT USING (get_user_role() = 'organiser');

CREATE POLICY "backend_audit_log_insert_system" ON backend_audit_log
  FOR INSERT WITH CHECK (true);

-- Create view for judges to see blind mappings without team_id
CREATE OR REPLACE VIEW judge_blind_view AS
  SELECT hackathon_id, anonymous_name
  FROM blind_mappings;

-- Grant access to the view
GRANT SELECT ON judge_blind_view TO authenticated;

-- Auth trigger to create profile on user creation
CREATE OR REPLACE FUNCTION handle_new_user() RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();