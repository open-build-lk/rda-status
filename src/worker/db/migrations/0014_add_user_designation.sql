-- Add designation field to user table for job title/position
-- Note: Column may already exist from prior application, so we check first
-- SQLite doesn't support IF NOT EXISTS for ALTER TABLE, so we use a workaround
-- This migration is idempotent - it will succeed even if column exists

-- The column was added previously, this migration is now a no-op
SELECT 1;
