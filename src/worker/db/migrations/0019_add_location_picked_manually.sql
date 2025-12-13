-- Add column to track manually picked locations (no GPS data)
ALTER TABLE damage_reports ADD COLUMN location_picked_manually INTEGER DEFAULT 0;
