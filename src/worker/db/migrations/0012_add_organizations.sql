-- Organizations table for RDA, Provincial Road Authorities, and Local Authorities
CREATE TABLE organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  province TEXT,
  district TEXT,
  road_classes TEXT,
  parent_org_id TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX idx_organizations_code ON organizations(code);
CREATE INDEX idx_organizations_type ON organizations(type);
CREATE INDEX idx_organizations_province ON organizations(province);
CREATE INDEX idx_organizations_is_active ON organizations(is_active);

-- User-Organization assignments (many-to-many)
CREATE TABLE user_organizations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  is_primary INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(user_id, organization_id)
);

CREATE INDEX idx_user_organizations_user ON user_organizations(user_id);
CREATE INDEX idx_user_organizations_org ON user_organizations(organization_id);

-- Add primary organization to user table for quick access
ALTER TABLE user ADD COLUMN organization_id TEXT;

-- Seed initial organizations
INSERT INTO organizations (id, name, code, type, road_classes, created_at, updated_at) VALUES
  ('org_rda', 'Road Development Authority', 'RDA', 'national', '["A","B","E"]', unixepoch(), unixepoch());

-- 9 Provincial Road Authorities
INSERT INTO organizations (id, name, code, type, province, road_classes, parent_org_id, created_at, updated_at) VALUES
  ('org_wp_pra', 'Western Province Road Authority', 'WP-PRA', 'provincial', 'Western', '["C","D"]', 'org_rda', unixepoch(), unixepoch()),
  ('org_cp_pra', 'Central Province Road Authority', 'CP-PRA', 'provincial', 'Central', '["C","D"]', 'org_rda', unixepoch(), unixepoch()),
  ('org_sp_pra', 'Southern Province Road Authority', 'SP-PRA', 'provincial', 'Southern', '["C","D"]', 'org_rda', unixepoch(), unixepoch()),
  ('org_np_pra', 'Northern Province Road Authority', 'NP-PRA', 'provincial', 'Northern', '["C","D"]', 'org_rda', unixepoch(), unixepoch()),
  ('org_ep_pra', 'Eastern Province Road Authority', 'EP-PRA', 'provincial', 'Eastern', '["C","D"]', 'org_rda', unixepoch(), unixepoch()),
  ('org_nw_pra', 'North Western Province Road Authority', 'NW-PRA', 'provincial', 'North Western', '["C","D"]', 'org_rda', unixepoch(), unixepoch()),
  ('org_nc_pra', 'North Central Province Road Authority', 'NC-PRA', 'provincial', 'North Central', '["C","D"]', 'org_rda', unixepoch(), unixepoch()),
  ('org_uva_pra', 'Uva Province Road Authority', 'UVA-PRA', 'provincial', 'Uva', '["C","D"]', 'org_rda', unixepoch(), unixepoch()),
  ('org_sab_pra', 'Sabaragamuwa Province Road Authority', 'SAB-PRA', 'provincial', 'Sabaragamuwa', '["C","D"]', 'org_rda', unixepoch(), unixepoch());
