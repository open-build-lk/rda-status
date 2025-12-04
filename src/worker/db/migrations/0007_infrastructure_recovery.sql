-- Migration: Transform from road blockage tracking to infrastructure recovery system
-- This is a DESTRUCTIVE migration - existing road data will be lost

-- Step 1: Add new infrastructure columns
ALTER TABLE damage_reports ADD COLUMN infrastructure_category TEXT;
ALTER TABLE damage_reports ADD COLUMN facility_name TEXT;
ALTER TABLE damage_reports ADD COLUMN damage_level TEXT;
ALTER TABLE damage_reports ADD COLUMN citizen_priority TEXT;
ALTER TABLE damage_reports ADD COLUMN admin_priority TEXT;
ALTER TABLE damage_reports ADD COLUMN province TEXT;
ALTER TABLE damage_reports ADD COLUMN district TEXT;

-- Step 2: Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_reports_category ON damage_reports(infrastructure_category);
CREATE INDEX IF NOT EXISTS idx_reports_damage_level ON damage_reports(damage_level);
CREATE INDEX IF NOT EXISTS idx_reports_admin_priority ON damage_reports(admin_priority);

-- Step 3: Clear existing road blockage data (fresh start)
DELETE FROM road_segments;
DELETE FROM state_transitions;
DELETE FROM media_attachments WHERE report_id IS NOT NULL;
DELETE FROM damage_reports;

-- Note: The following columns are now deprecated and will be ignored:
-- - asset_type
-- - asset_id
-- - severity
-- - operational_impact
-- - route_category
-- - estimated_population
-- - estimated_economic_loss
-- - priority_score
-- - priority_version
-- - passability_level
-- - is_single_lane
-- - blocked_distance_meters
-- SQLite doesn't support DROP COLUMN in older versions, so we leave them but stop using them
