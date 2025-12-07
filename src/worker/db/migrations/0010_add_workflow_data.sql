-- Add flexible JSON column for workflow/admin data
-- Stores: progressPercent, estimatedCostLkr, and future workflow fields
ALTER TABLE damage_reports ADD COLUMN workflow_data TEXT;

-- Initialize with empty JSON for existing reports that are in_progress or resolved
UPDATE damage_reports
SET workflow_data = json_object(
  'progressPercent', 0,
  'estimatedCostLkr', null
)
WHERE status IN ('in_progress', 'resolved') AND workflow_data IS NULL;
