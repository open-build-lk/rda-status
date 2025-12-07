-- Add flexible JSON column for incident details
ALTER TABLE damage_reports ADD COLUMN incident_details TEXT;

-- Migrate existing data to JSON format
UPDATE damage_reports
SET incident_details = json_object(
  'isSingleLane', CASE WHEN is_single_lane = 1 THEN json('true') ELSE json('false') END,
  'needsSafetyBarriers', CASE WHEN needs_safety_barriers = 1 THEN json('true') ELSE json('false') END,
  'blockedDistanceMeters', blocked_distance_meters
)
WHERE incident_details IS NULL;
