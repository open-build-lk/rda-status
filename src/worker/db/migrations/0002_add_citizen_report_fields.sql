-- Add citizen report fields to damage_reports table
ALTER TABLE damage_reports ADD COLUMN passability_level TEXT;
ALTER TABLE damage_reports ADD COLUMN is_single_lane INTEGER DEFAULT 0;
ALTER TABLE damage_reports ADD COLUMN blocked_distance_meters REAL;
ALTER TABLE damage_reports ADD COLUMN submission_source TEXT;
ALTER TABLE damage_reports ADD COLUMN is_verified_submitter INTEGER DEFAULT 0;
ALTER TABLE damage_reports ADD COLUMN claim_token TEXT;

-- Add index for claim token lookups
CREATE INDEX IF NOT EXISTS idx_reports_claim_token ON damage_reports(claim_token);
