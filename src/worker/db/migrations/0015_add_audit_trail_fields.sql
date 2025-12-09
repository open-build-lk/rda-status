-- Add generic field tracking columns to state_transitions for full audit trail
ALTER TABLE state_transitions ADD COLUMN field_name TEXT NOT NULL DEFAULT 'status';
ALTER TABLE state_transitions ADD COLUMN old_value TEXT;
ALTER TABLE state_transitions ADD COLUMN new_value TEXT;

-- Make to_status nullable (was required before, now we use newValue for non-status fields)
-- SQLite doesn't support ALTER COLUMN, so we'll handle this at application level

-- Add index for efficient field-based queries
CREATE INDEX IF NOT EXISTS idx_transitions_field ON state_transitions(field_name);
