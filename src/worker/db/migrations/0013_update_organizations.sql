-- Update organization codes to use full province names and add UDA

-- Add UDA (Urban Development Authority)
INSERT OR IGNORE INTO organizations (id, name, code, type, road_classes, created_at, updated_at) VALUES
  ('org_uda', 'Urban Development Authority', 'UDA', 'national', '["A","B","C","D","E"]', unixepoch(), unixepoch());

-- Update provincial organization codes to use full province names
UPDATE organizations SET code = 'WESTERN', name = 'Western Provincial Council' WHERE id = 'org_wp_pra';
UPDATE organizations SET code = 'CENTRAL', name = 'Central Provincial Council' WHERE id = 'org_cp_pra';
UPDATE organizations SET code = 'SOUTHERN', name = 'Southern Provincial Council' WHERE id = 'org_sp_pra';
UPDATE organizations SET code = 'NORTHERN', name = 'Northern Provincial Council' WHERE id = 'org_np_pra';
UPDATE organizations SET code = 'EASTERN', name = 'Eastern Provincial Council' WHERE id = 'org_ep_pra';
UPDATE organizations SET code = 'NORTH WESTERN', name = 'North Western Provincial Council' WHERE id = 'org_nw_pra';
UPDATE organizations SET code = 'NORTH CENTRAL', name = 'North Central Provincial Council' WHERE id = 'org_nc_pra';
UPDATE organizations SET code = 'UVA', name = 'Uva Provincial Council' WHERE id = 'org_uva_pra';
UPDATE organizations SET code = 'SABARAGAMUWA', name = 'Sabaragamuwa Provincial Council' WHERE id = 'org_sab_pra';
