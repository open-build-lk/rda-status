import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";

// Re-export auth schema tables
export {
  user,
  session,
  account,
  verification,
} from "./auth-schema";

// Import user for relations
import { user } from "./auth-schema";

// ============ USER INVITATIONS ============
export const userInvitations = sqliteTable(
  "user_invitations",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    role: text("role").notNull(),
    invitedBy: text("invited_by").references(() => user.id),
    token: text("token").notNull().unique(),
    status: text("status").notNull().default("pending"), // pending, accepted, expired, cancelled
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    acceptedAt: integer("accepted_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (table) => [
    index("user_invitations_email_idx").on(table.email),
    index("user_invitations_token_idx").on(table.token),
    index("user_invitations_status_idx").on(table.status),
  ]
);

// ============ LOCATIONS ============
export const locations = sqliteTable(
  "locations",
  {
    id: text("id").primaryKey(),
    parentId: text("parent_id"), // Self-reference handled in relations
    level: text("level").notNull(), // country, province, district, city, gn_division
    nameEn: text("name_en").notNull(),
    nameSi: text("name_si"),
    nameTa: text("name_ta"),
    boundaryGeojson: text("boundary_geojson"), // JSON stored as text
    centroidLat: real("centroid_lat"),
    centroidLng: real("centroid_lng"),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  },
  (table) => [
    index("locations_level_idx").on(table.level),
    index("locations_parent_idx").on(table.parentId),
  ]
);

// ============ DAMAGE REPORTS ============
export const damageReports = sqliteTable(
  "damage_reports",
  {
    id: text("id").primaryKey(),
    reportNumber: text("report_number").notNull().unique(),
    submitterId: text("submitter_id").references(() => user.id),
    // Anonymous submissions may not have a submitter
    anonymousName: text("anonymous_name"),
    anonymousEmail: text("anonymous_email"),
    anonymousContact: text("anonymous_contact"),
    sourceType: text("source_type").notNull(), // citizen, field_officer, other_agency
    sourceChannel: text("source_channel").notNull(), // web, mobile_web, bulk_upload
    // Location
    latitude: real("latitude").notNull(),
    longitude: real("longitude").notNull(),
    provinceId: text("province_id").references(() => locations.id),
    districtId: text("district_id").references(() => locations.id),
    cityId: text("city_id").references(() => locations.id),
    landmark: text("landmark"),
    locationName: text("location_name"), // Reverse-geocoded address/area name
    // Asset info
    assetType: text("asset_type").notNull(), // road, bridge, culvert, rail_track, etc.
    assetId: text("asset_id"),
    // Damage details
    damageObservedAt: integer("damage_observed_at", { mode: "timestamp" }),
    damageType: text("damage_type").notNull(),
    severity: integer("severity").notNull(), // 1-4
    description: text("description").notNull(),
    // Impact
    operationalImpact: text("operational_impact"),
    routeCategory: text("route_category"),
    estimatedPopulation: integer("estimated_population"),
    estimatedEconomicLoss: real("estimated_economic_loss"),
    // Status and priority
    status: text("status").notNull().default("new"),
    priorityScore: real("priority_score"),
    priorityVersion: text("priority_version"),
    // Citizen report fields
    passabilityLevel: text("passability_level"), // unpassable, foot, bike, 3wheeler, car, bus, truck
    isSingleLane: integer("is_single_lane", { mode: "boolean" }).default(false),
    needsSafetyBarriers: integer("needs_safety_barriers", { mode: "boolean" }).default(false),
    blockedDistanceMeters: real("blocked_distance_meters"),
    // Flexible JSON for additional incident details (future-proof)
    incidentDetails: text("incident_details"), // JSON: { alternativeRoutes, estimatedRepairTime, hazardType, etc. }
    submissionSource: text("submission_source"), // citizen_web, citizen_mobile, official
    isVerifiedSubmitter: integer("is_verified_submitter", { mode: "boolean" }).default(false),
    claimToken: text("claim_token"), // For anonymous users to claim reports later
    // Workflow data (admin/field officer updates)
    workflowData: text("workflow_data"), // JSON: { progressPercent, estimatedCostLkr, notes, etc. }
    // Classification fields
    roadId: text("road_id"), // FK to roads table (if matched)
    roadNumberInput: text("road_number_input"), // What user typed (free text)
    roadClass: text("road_class"), // A, B, C, D, E, or NULL
    assignedOrgId: text("assigned_org_id"), // FK to organizations
    classificationStatus: text("classification_status").default("pending"), // pending, auto_classified, manual_classified, legacy, unclassifiable
    classifiedBy: text("classified_by"), // User ID who classified
    classifiedAt: integer("classified_at", { mode: "timestamp" }),
    // Timestamps
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("reports_status_idx").on(table.status),
    index("reports_severity_idx").on(table.severity),
    index("reports_province_idx").on(table.provinceId),
    index("reports_district_idx").on(table.districtId),
    index("reports_asset_type_idx").on(table.assetType),
    index("reports_priority_idx").on(table.priorityScore),
    index("reports_location_idx").on(table.latitude, table.longitude),
    index("reports_claim_token_idx").on(table.claimToken),
    index("reports_road_id_idx").on(table.roadId),
    index("reports_assigned_org_idx").on(table.assignedOrgId),
    index("reports_classification_status_idx").on(table.classificationStatus),
    index("reports_road_class_idx").on(table.roadClass),
  ]
);

// ============ MEDIA ATTACHMENTS ============
export const mediaAttachments = sqliteTable(
  "media_attachments",
  {
    id: text("id").primaryKey(),
    reportId: text("report_id").references(() => damageReports.id),
    projectId: text("project_id").references(() => rebuildProjects.id),
    mediaType: text("media_type").notNull(), // image, video
    storageKey: text("storage_key").notNull(), // R2 key
    originalFilename: text("original_filename"),
    fileSize: integer("file_size"),
    capturedLat: real("captured_lat"),
    capturedLng: real("captured_lng"),
    capturedAt: integer("captured_at", { mode: "timestamp" }),
    isPublic: integer("is_public", { mode: "boolean" }).notNull().default(true),
    uploadedAt: integer("uploaded_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("media_report_idx").on(table.reportId),
    index("media_project_idx").on(table.projectId),
  ]
);

// ============ STATE TRANSITIONS (Audit Trail) ============
export const stateTransitions = sqliteTable(
  "state_transitions",
  {
    id: text("id").primaryKey(),
    // Generic target tracking for multi-entity audit trail
    targetType: text("target_type").notNull().default("report"), // report, user, invitation, user_organization
    targetId: text("target_id"), // ID of the affected entity
    // Legacy: Keep reportId for backwards compatibility with existing code
    reportId: text("report_id").references(() => damageReports.id),
    // For backwards compatibility, keep status-specific fields
    fromStatus: text("from_status"),
    toStatus: text("to_status"),
    // Generic field tracking for full audit trail
    fieldName: text("field_name").notNull().default("status"), // status, severity, damageType, role, isActive, etc.
    oldValue: text("old_value"),
    newValue: text("new_value"),
    userId: text("user_id").references(() => user.id),
    userRole: text("user_role"),
    reason: text("reason"),
    metadata: text("metadata"), // JSON stored as text
    ipAddress: text("ip_address"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("transitions_report_idx").on(table.reportId),
    index("transitions_created_idx").on(table.createdAt),
    index("transitions_field_idx").on(table.fieldName),
    index("transitions_target_type_idx").on(table.targetType),
    index("transitions_target_idx").on(table.targetType, table.targetId),
  ]
);

// ============ REBUILD PROJECTS ============
export const rebuildProjects = sqliteTable(
  "rebuild_projects",
  {
    id: text("id").primaryKey(),
    projectCode: text("project_code").notNull().unique(),
    name: text("name").notNull(),
    description: text("description"),
    ownerDepartment: text("owner_department"),
    projectManagerId: text("project_manager_id").references(() => user.id),
    // Location scope
    provinceId: text("province_id").references(() => locations.id),
    districtId: text("district_id").references(() => locations.id),
    cityId: text("city_id").references(() => locations.id),
    geoExtent: text("geo_extent"), // GeoJSON stored as text
    // Status
    status: text("status").notNull().default("planned"),
    // Timeline
    plannedStart: text("planned_start"), // ISO date string
    plannedEnd: text("planned_end"),
    actualStart: text("actual_start"),
    actualEnd: text("actual_end"),
    progressPercent: real("progress_percent").default(0),
    // Budget
    fundingSource: text("funding_source"),
    estimatedBudget: real("estimated_budget"),
    actualExpenditure: real("actual_expenditure"),
    contractorInfo: text("contractor_info"), // JSON stored as text
    // Timestamps
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("projects_status_idx").on(table.status),
    index("projects_province_idx").on(table.provinceId),
    index("projects_district_idx").on(table.districtId),
  ]
);

// ============ MILESTONES ============
export const milestones = sqliteTable(
  "milestones",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => rebuildProjects.id),
    name: text("name").notNull(),
    description: text("description"),
    milestoneType: text("milestone_type"),
    targetDate: text("target_date"), // ISO date string
    actualDate: text("actual_date"),
    status: text("status").notNull().default("not_started"),
    orderIndex: integer("order_index").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("milestones_project_idx").on(table.projectId),
    index("milestones_status_idx").on(table.status),
  ]
);

// ============ REPORT-PROJECT LINKS ============
export const reportProjectLinks = sqliteTable(
  "report_project_links",
  {
    id: text("id").primaryKey(),
    reportId: text("report_id")
      .notNull()
      .references(() => damageReports.id),
    projectId: text("project_id")
      .notNull()
      .references(() => rebuildProjects.id),
    linkType: text("link_type").notNull().default("primary"), // primary, related, contributing
    linkedBy: text("linked_by").references(() => user.id),
    notes: text("notes"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("links_report_idx").on(table.reportId),
    index("links_project_idx").on(table.projectId),
  ]
);

// ============ ROAD SEGMENTS ============
export const roadSegments = sqliteTable(
  "road_segments",
  {
    id: text("id").primaryKey(),
    reportId: text("report_id").references(() => damageReports.id),
    startLat: real("start_lat").notNull(),
    startLng: real("start_lng").notNull(),
    endLat: real("end_lat").notNull(),
    endLng: real("end_lng").notNull(),
    snappedPath: text("snapped_path"), // JSON array of coordinates
    roadName: text("road_name"),
    // New fields from hardcoded data
    roadNo: text("road_no"),
    fromKm: real("from_km"),
    toKm: real("to_km"),
    reason: text("reason"),
    dataSource: text("data_source"),
    province: text("province"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("road_segments_report_idx").on(table.reportId),
    index("road_segments_province_idx").on(table.province),
  ]
);

// ============ PRIORITY CONFIG ============
export const priorityConfig = sqliteTable("priority_config", {
  id: text("id").primaryKey(),
  version: text("version").notNull().unique(),
  weights: text("weights").notNull(), // JSON stored as text
  createdBy: text("created_by").references(() => user.id),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(false),
});

// ============ COMMENTS ============
export const comments = sqliteTable(
  "comments",
  {
    id: text("id").primaryKey(),
    reportId: text("report_id").references(() => damageReports.id),
    projectId: text("project_id").references(() => rebuildProjects.id),
    userId: text("user_id").references(() => user.id),
    content: text("content").notNull(),
    isInternal: integer("is_internal", { mode: "boolean" })
      .notNull()
      .default(false),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("comments_report_idx").on(table.reportId),
    index("comments_project_idx").on(table.projectId),
  ]
);

// ============ ROADS (from OpenStreetMap) ============
export const roads = sqliteTable(
  "roads",
  {
    id: text("id").primaryKey(),
    osmId: text("osm_id").unique(),
    roadNumber: text("road_number").notNull(),
    roadClass: text("road_class").notNull(), // A, B, C, D, E
    name: text("name"),
    nameSi: text("name_si"),
    nameTa: text("name_ta"),
    province: text("province"),
    districts: text("districts"), // JSON array
    lastUpdated: integer("last_updated", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("roads_road_number_idx").on(table.roadNumber),
    index("roads_road_class_idx").on(table.roadClass),
    index("roads_name_idx").on(table.name),
    index("roads_province_idx").on(table.province),
  ]
);

// ============ ORGANIZATIONS ============
export const organizations = sqliteTable(
  "organizations",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    code: text("code").notNull().unique(),
    type: text("type").notNull(), // national, provincial, local, special
    province: text("province"),
    district: text("district"),
    roadClasses: text("road_classes"), // JSON array: ["A", "B", "E"]
    parentOrgId: text("parent_org_id"),
    contactEmail: text("contact_email"),
    contactPhone: text("contact_phone"),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (table) => [
    index("organizations_code_idx").on(table.code),
    index("organizations_type_idx").on(table.type),
    index("organizations_province_idx").on(table.province),
    index("organizations_is_active_idx").on(table.isActive),
  ]
);

// ============ USER-ORGANIZATION ASSIGNMENTS ============
export const userOrganizations = sqliteTable(
  "user_organizations",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id),
    organizationId: text("organization_id").notNull().references(() => organizations.id),
    role: text("role").notNull().default("member"), // member, manager, admin
    isPrimary: integer("is_primary", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (table) => [
    index("user_orgs_user_idx").on(table.userId),
    index("user_orgs_org_idx").on(table.organizationId),
  ]
);

// ============ CLASSIFICATION HISTORY ============
export const classificationHistory = sqliteTable(
  "classification_history",
  {
    id: text("id").primaryKey(),
    reportId: text("report_id").notNull().references(() => damageReports.id),
    previousRoadClass: text("previous_road_class"),
    newRoadClass: text("new_road_class"),
    previousOrgId: text("previous_org_id"),
    newOrgId: text("new_org_id"),
    previousStatus: text("previous_status"),
    newStatus: text("new_status"),
    changedBy: text("changed_by").notNull(),
    reason: text("reason"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (table) => [
    index("classification_history_report_idx").on(table.reportId),
    index("classification_history_created_idx").on(table.createdAt),
  ]
);

// ============ RELATIONS ============
export const userRelations = relations(user, ({ one, many }) => ({
  damageReports: many(damageReports),
  stateTransitions: many(stateTransitions),
  comments: many(comments),
  managedProjects: many(rebuildProjects),
  sentInvitations: many(userInvitations),
  userOrganizations: many(userOrganizations),
  primaryOrganization: one(organizations, {
    fields: [user.organizationId],
    references: [organizations.id],
  }),
}));

export const userInvitationsRelations = relations(userInvitations, ({ one }) => ({
  inviter: one(user, {
    fields: [userInvitations.invitedBy],
    references: [user.id],
  }),
}));

export const locationsRelations = relations(locations, ({ one, many }) => ({
  parent: one(locations, {
    fields: [locations.parentId],
    references: [locations.id],
  }),
  children: many(locations),
  damageReports: many(damageReports),
  rebuildProjects: many(rebuildProjects),
}));

export const damageReportsRelations = relations(
  damageReports,
  ({ one, many }) => ({
    submitter: one(user, {
      fields: [damageReports.submitterId],
      references: [user.id],
    }),
    province: one(locations, {
      fields: [damageReports.provinceId],
      references: [locations.id],
    }),
    district: one(locations, {
      fields: [damageReports.districtId],
      references: [locations.id],
    }),
    city: one(locations, {
      fields: [damageReports.cityId],
      references: [locations.id],
    }),
    mediaAttachments: many(mediaAttachments),
    stateTransitions: many(stateTransitions),
    projectLinks: many(reportProjectLinks),
    comments: many(comments),
    roadSegments: many(roadSegments),
    road: one(roads, {
      fields: [damageReports.roadId],
      references: [roads.id],
    }),
    assignedOrg: one(organizations, {
      fields: [damageReports.assignedOrgId],
      references: [organizations.id],
    }),
    classificationHistory: many(classificationHistory),
  })
);

export const roadSegmentsRelations = relations(roadSegments, ({ one }) => ({
  report: one(damageReports, {
    fields: [roadSegments.reportId],
    references: [damageReports.id],
  }),
}));

export const rebuildProjectsRelations = relations(
  rebuildProjects,
  ({ one, many }) => ({
    projectManager: one(user, {
      fields: [rebuildProjects.projectManagerId],
      references: [user.id],
    }),
    province: one(locations, {
      fields: [rebuildProjects.provinceId],
      references: [locations.id],
    }),
    district: one(locations, {
      fields: [rebuildProjects.districtId],
      references: [locations.id],
    }),
    city: one(locations, {
      fields: [rebuildProjects.cityId],
      references: [locations.id],
    }),
    milestones: many(milestones),
    reportLinks: many(reportProjectLinks),
    mediaAttachments: many(mediaAttachments),
    comments: many(comments),
  })
);

export const milestonesRelations = relations(milestones, ({ one }) => ({
  project: one(rebuildProjects, {
    fields: [milestones.projectId],
    references: [rebuildProjects.id],
  }),
}));

export const mediaAttachmentsRelations = relations(
  mediaAttachments,
  ({ one }) => ({
    report: one(damageReports, {
      fields: [mediaAttachments.reportId],
      references: [damageReports.id],
    }),
    project: one(rebuildProjects, {
      fields: [mediaAttachments.projectId],
      references: [rebuildProjects.id],
    }),
  })
);

export const stateTransitionsRelations = relations(
  stateTransitions,
  ({ one }) => ({
    report: one(damageReports, {
      fields: [stateTransitions.reportId],
      references: [damageReports.id],
    }),
    transitionUser: one(user, {
      fields: [stateTransitions.userId],
      references: [user.id],
    }),
  })
);

export const reportProjectLinksRelations = relations(
  reportProjectLinks,
  ({ one }) => ({
    report: one(damageReports, {
      fields: [reportProjectLinks.reportId],
      references: [damageReports.id],
    }),
    project: one(rebuildProjects, {
      fields: [reportProjectLinks.projectId],
      references: [rebuildProjects.id],
    }),
    linkedByUser: one(user, {
      fields: [reportProjectLinks.linkedBy],
      references: [user.id],
    }),
  })
);

export const commentsRelations = relations(comments, ({ one }) => ({
  report: one(damageReports, {
    fields: [comments.reportId],
    references: [damageReports.id],
  }),
  project: one(rebuildProjects, {
    fields: [comments.projectId],
    references: [rebuildProjects.id],
  }),
  commentUser: one(user, {
    fields: [comments.userId],
    references: [user.id],
  }),
}));

export const roadsRelations = relations(roads, ({ many }) => ({
  damageReports: many(damageReports),
}));

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  parentOrg: one(organizations, {
    fields: [organizations.parentOrgId],
    references: [organizations.id],
  }),
  childOrgs: many(organizations),
  userOrganizations: many(userOrganizations),
  damageReports: many(damageReports),
  users: many(user),
}));

export const userOrganizationsRelations = relations(userOrganizations, ({ one }) => ({
  user: one(user, {
    fields: [userOrganizations.userId],
    references: [user.id],
  }),
  organization: one(organizations, {
    fields: [userOrganizations.organizationId],
    references: [organizations.id],
  }),
}));

export const classificationHistoryRelations = relations(classificationHistory, ({ one }) => ({
  report: one(damageReports, {
    fields: [classificationHistory.reportId],
    references: [damageReports.id],
  }),
}));
