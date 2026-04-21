-- Fix: Remove default role so users must explicitly choose
-- Run this in Supabase SQL Editor

-- 1. Allow NULL role temporarily
ALTER TABLE profiles ALTER COLUMN role DROP NOT NULL;

-- 2. Change default to NULL
ALTER TABLE profiles ALTER COLUMN role DROP DEFAULT;

-- 3. Update existing profiles with NULL role to 'participant' (keep existing users)
UPDATE profiles SET role = 'participant' WHERE role IS NULL;

-- 4. Now make role NOT NULL again (after fixing existing data)
-- ALTER TABLE profiles ALTER COLUMN role SET NOT NULL;
-- Comment out above if you want to allow NULL for new users
