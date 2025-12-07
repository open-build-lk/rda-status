-- Add needs_safety_barriers field to damage_reports table
ALTER TABLE damage_reports ADD COLUMN needs_safety_barriers INTEGER DEFAULT 0;
