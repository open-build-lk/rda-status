-- Roads table populated from OpenStreetMap Overpass API
-- Stores classified roads (A, B, C, D, E) for Sri Lanka

CREATE TABLE roads (
  id TEXT PRIMARY KEY,
  osm_id TEXT UNIQUE,
  road_number TEXT NOT NULL,
  road_class TEXT NOT NULL,
  name TEXT,
  name_si TEXT,
  name_ta TEXT,
  province TEXT,
  districts TEXT,
  last_updated INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX idx_roads_road_number ON roads(road_number);
CREATE INDEX idx_roads_road_class ON roads(road_class);
CREATE INDEX idx_roads_name ON roads(name);
CREATE INDEX idx_roads_province ON roads(province);
