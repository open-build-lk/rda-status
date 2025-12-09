-- Extend state_transitions table to support multi-entity audit trail
-- Adds targetType and targetId for tracking changes to users, invitations, and org assignments

ALTER TABLE state_transitions ADD COLUMN target_type TEXT NOT NULL DEFAULT 'report';
ALTER TABLE state_transitions ADD COLUMN target_id TEXT;

-- Backfill existing records to set target_id from report_id
UPDATE state_transitions SET target_id = report_id WHERE target_id IS NULL AND report_id IS NOT NULL;

-- Make report_id nullable for non-report audit entries
-- Note: SQLite doesn't support ALTER COLUMN, so we handle this at application level

-- Add indexes for efficient target-based queries
CREATE INDEX IF NOT EXISTS idx_transitions_target_type ON state_transitions(target_type);
CREATE INDEX IF NOT EXISTS idx_transitions_target ON state_transitions(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_transitions_user_performer ON state_transitions(user_id);
