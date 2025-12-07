-- Fix FK constraints by removing them from damage_reports table
-- The 'users' table was empty and has been dropped
-- damage_reports no longer has FK constraints (app logic handles validation)

-- This migration was applied manually via fix_fk.sql

-- The damage_reports table was recreated without FK constraints
-- All indexes were recreated
