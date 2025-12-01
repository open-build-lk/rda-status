-- Add anonymous email field to damage_reports for verification
ALTER TABLE damage_reports ADD COLUMN anonymous_email TEXT;
