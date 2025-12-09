-- Add classification columns to damage_reports
ALTER TABLE damage_reports ADD COLUMN road_id TEXT;
ALTER TABLE damage_reports ADD COLUMN road_number_input TEXT;
ALTER TABLE damage_reports ADD COLUMN road_class TEXT;
ALTER TABLE damage_reports ADD COLUMN assigned_org_id TEXT;
ALTER TABLE damage_reports ADD COLUMN classification_status TEXT DEFAULT 'pending';
ALTER TABLE damage_reports ADD COLUMN classified_by TEXT;
ALTER TABLE damage_reports ADD COLUMN classified_at INTEGER;

-- Indexes for filtering
CREATE INDEX idx_reports_road_id ON damage_reports(road_id);
CREATE INDEX idx_reports_assigned_org ON damage_reports(assigned_org_id);
CREATE INDEX idx_reports_classification_status ON damage_reports(classification_status);
CREATE INDEX idx_reports_road_class ON damage_reports(road_class);

-- Composite index for common query pattern (org + status filtering)
CREATE INDEX idx_reports_org_class_status ON damage_reports(assigned_org_id, classification_status);

-- Classification history table for full audit trail
CREATE TABLE classification_history (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL,
  previous_road_class TEXT,
  new_road_class TEXT,
  previous_org_id TEXT,
  new_org_id TEXT,
  previous_status TEXT,
  new_status TEXT,
  changed_by TEXT NOT NULL,
  reason TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX idx_classification_history_report ON classification_history(report_id);
CREATE INDEX idx_classification_history_created ON classification_history(created_at);

-- Initialize existing reports:
-- Verified/in_progress/resolved reports are considered "legacy" (no classification needed)
-- New/rejected reports will need classification when the feature is actively used
UPDATE damage_reports
SET classification_status = 'legacy'
WHERE status IN ('verified', 'in_progress', 'resolved');

UPDATE damage_reports
SET classification_status = 'pending'
WHERE status IN ('new', 'rejected') OR classification_status IS NULL;
