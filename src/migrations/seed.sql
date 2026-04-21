-- Seed data for Hackmate
-- Run after all migrations

-- 1. Insert organiser profile (placeholder UUID, assumes corresponding auth user exists)
INSERT INTO profiles (id, email, full_name, role, created_at)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'organiser@hackmate.dev',
  'Test Organiser',
  'organiser',
  now()
) ON CONFLICT (id) DO NOTHING;

-- 2. Insert hackathon in registration_open status
INSERT INTO hackathons (
  id,
  name,
  description,
  organiser_id,
  status,
  start_time,
  end_time,
  registration_deadline,
  submission_deadline,
  venue,
  max_team_size,
  min_team_size,
  max_teams
) VALUES (
  'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  'HackMate Launch Hackathon',
  'The inaugural hackathon for the HackMate platform. Build something awesome!',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'registration_open',
  now() + interval '7 days',          -- start_time: 1 week from now
  now() + interval '10 days',         -- end_time: 10 days from now
  now() + interval '6 days',          -- registration_deadline: 1 day before start
  now() + interval '9 days 23 hours', -- submission_deadline: 1 hour before end
  'Virtual (Zoom)',
  4,
  1,
  20
) ON CONFLICT (id) DO NOTHING;

-- 3. Insert rubric for the hackathon
INSERT INTO rubrics (id, hackathon_id)
VALUES (
  'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
  'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'
) ON CONFLICT (id) DO NOTHING;

-- 4. Insert rubric items
INSERT INTO rubric_items (id, rubric_id, label, description, max_score, weight, sort_order)
VALUES
  (
    'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
    'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    'Innovation',
    'Creativity and originality of the idea',
    100,
    40,
    1
  ),
  (
    'd2eebc99-9c0b-4ef8-bb6d-6bb9bd380a45',
    'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    'Technical',
    'Implementation quality, code structure, and technical complexity',
    100,
    40,
    2
  ),
  (
    'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a46',
    'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    'Presentation',
    'Clarity of demo, pitch, and overall presentation',
    100,
    20,
    3
  ) ON CONFLICT (id) DO NOTHING;

-- 5. Insert timeline events
INSERT INTO hackathon_timeline (id, hackathon_id, title, description, scheduled_at, type)
VALUES
  (
    'e1eebc99-9c0b-4ef8-bb6d-6bb9bd380a55',
    'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'Registration Opens',
    'Registration for the hackathon is now open',
    now(),
    'registration'
  ),
  (
    'e2eebc99-9c0b-4ef8-bb6d-6bb9bd380a56',
    'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'Kickoff Ceremony',
    'Opening ceremony and team formation',
    now() + interval '7 days',
    'kickoff'
  ),
  (
    'e3eebc99-9c0b-4ef8-bb6d-6bb9bd380a57',
    'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
    'Mentor Session: API Design',
    'Workshop on designing robust APIs',
    now() + interval '8 days',
    'mentor_session'
  ) ON CONFLICT (id) DO NOTHING;