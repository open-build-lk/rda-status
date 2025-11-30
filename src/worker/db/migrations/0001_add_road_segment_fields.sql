-- Add missing fields from hardcoded data to road_segments
ALTER TABLE road_segments ADD COLUMN road_no TEXT;
ALTER TABLE road_segments ADD COLUMN from_km REAL;
ALTER TABLE road_segments ADD COLUMN to_km REAL;
ALTER TABLE road_segments ADD COLUMN reason TEXT;
ALTER TABLE road_segments ADD COLUMN data_source TEXT;
ALTER TABLE road_segments ADD COLUMN province TEXT;

-- Create province index for filtering
CREATE INDEX idx_road_segments_province ON road_segments(province);
