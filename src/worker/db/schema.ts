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

// ============ STATE TRANSITIONS ============
export const stateTransitions = sqliteTable(
  "state_transitions",
  {
    id: text("id").primaryKey(),
    reportId: text("report_id")
      .notNull()
      .references(() => damageReports.id),
    fromStatus: text("from_status"),
    toStatus: text("to_status").notNull(),
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

// ============ RELATIONS ============
export const userRelations = relations(user, ({ many }) => ({
  damageReports: many(damageReports),
  stateTransitions: many(stateTransitions),
  comments: many(comments),
  managedProjects: many(rebuildProjects),
  sentInvitations: many(userInvitations),
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
