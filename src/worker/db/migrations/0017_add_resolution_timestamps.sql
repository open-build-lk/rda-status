-- Add timestamp fields for resolution metrics calculation
ALTER TABLE damage_reports ADD COLUMN resolved_at INTEGER;
ALTER TABLE damage_reports ADD COLUMN in_progress_at INTEGER;

-- Add indexes for efficient queries on resolved reports
CREATE INDEX IF NOT EXISTS idx_reports_resolved_at ON damage_reports(resolved_at);
CREATE INDEX IF NOT EXISTS idx_reports_in_progress_at ON damage_reports(in_progress_at);
