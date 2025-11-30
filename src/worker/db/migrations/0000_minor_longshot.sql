CREATE TABLE `comments` (
	`id` text PRIMARY KEY NOT NULL,
	`report_id` text,
	`project_id` text,
	`user_id` text,
	`content` text NOT NULL,
	`is_internal` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`report_id`) REFERENCES `damage_reports`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `rebuild_projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `comments_report_idx` ON `comments` (`report_id`);--> statement-breakpoint
CREATE INDEX `comments_project_idx` ON `comments` (`project_id`);--> statement-breakpoint
CREATE TABLE `damage_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`report_number` text NOT NULL,
	`submitter_id` text,
	`anonymous_name` text,
	`anonymous_contact` text,
	`source_type` text NOT NULL,
	`source_channel` text NOT NULL,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`province_id` text,
	`district_id` text,
	`city_id` text,
	`landmark` text,
	`asset_type` text NOT NULL,
	`asset_id` text,
	`damage_observed_at` integer,
	`damage_type` text NOT NULL,
	`severity` integer NOT NULL,
	`description` text NOT NULL,
	`operational_impact` text,
	`route_category` text,
	`estimated_population` integer,
	`estimated_economic_loss` real,
	`status` text DEFAULT 'new' NOT NULL,
	`priority_score` real,
	`priority_version` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`submitter_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`province_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`district_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`city_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `damage_reports_report_number_unique` ON `damage_reports` (`report_number`);--> statement-breakpoint
CREATE INDEX `reports_status_idx` ON `damage_reports` (`status`);--> statement-breakpoint
CREATE INDEX `reports_severity_idx` ON `damage_reports` (`severity`);--> statement-breakpoint
CREATE INDEX `reports_province_idx` ON `damage_reports` (`province_id`);--> statement-breakpoint
CREATE INDEX `reports_district_idx` ON `damage_reports` (`district_id`);--> statement-breakpoint
CREATE INDEX `reports_asset_type_idx` ON `damage_reports` (`asset_type`);--> statement-breakpoint
CREATE INDEX `reports_priority_idx` ON `damage_reports` (`priority_score`);--> statement-breakpoint
CREATE INDEX `reports_location_idx` ON `damage_reports` (`latitude`,`longitude`);--> statement-breakpoint
CREATE TABLE `locations` (
	`id` text PRIMARY KEY NOT NULL,
	`parent_id` text,
	`level` text NOT NULL,
	`name_en` text NOT NULL,
	`name_si` text,
	`name_ta` text,
	`boundary_geojson` text,
	`centroid_lat` real,
	`centroid_lng` real,
	`is_active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE INDEX `locations_level_idx` ON `locations` (`level`);--> statement-breakpoint
CREATE INDEX `locations_parent_idx` ON `locations` (`parent_id`);--> statement-breakpoint
CREATE TABLE `media_attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`report_id` text,
	`project_id` text,
	`media_type` text NOT NULL,
	`storage_key` text NOT NULL,
	`original_filename` text,
	`file_size` integer,
	`captured_lat` real,
	`captured_lng` real,
	`captured_at` integer,
	`is_public` integer DEFAULT true NOT NULL,
	`uploaded_at` integer NOT NULL,
	FOREIGN KEY (`report_id`) REFERENCES `damage_reports`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `rebuild_projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `media_report_idx` ON `media_attachments` (`report_id`);--> statement-breakpoint
CREATE INDEX `media_project_idx` ON `media_attachments` (`project_id`);--> statement-breakpoint
CREATE TABLE `milestones` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`milestone_type` text,
	`target_date` text,
	`actual_date` text,
	`status` text DEFAULT 'not_started' NOT NULL,
	`order_index` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `rebuild_projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `milestones_project_idx` ON `milestones` (`project_id`);--> statement-breakpoint
CREATE INDEX `milestones_status_idx` ON `milestones` (`status`);--> statement-breakpoint
CREATE TABLE `priority_config` (
	`id` text PRIMARY KEY NOT NULL,
	`version` text NOT NULL,
	`weights` text NOT NULL,
	`created_by` text,
	`created_at` integer NOT NULL,
	`is_active` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `priority_config_version_unique` ON `priority_config` (`version`);--> statement-breakpoint
CREATE TABLE `rebuild_projects` (
	`id` text PRIMARY KEY NOT NULL,
	`project_code` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`owner_department` text,
	`project_manager_id` text,
	`province_id` text,
	`district_id` text,
	`city_id` text,
	`geo_extent` text,
	`status` text DEFAULT 'planned' NOT NULL,
	`planned_start` text,
	`planned_end` text,
	`actual_start` text,
	`actual_end` text,
	`progress_percent` real DEFAULT 0,
	`funding_source` text,
	`estimated_budget` real,
	`actual_expenditure` real,
	`contractor_info` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_manager_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`province_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`district_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`city_id`) REFERENCES `locations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rebuild_projects_project_code_unique` ON `rebuild_projects` (`project_code`);--> statement-breakpoint
CREATE INDEX `projects_status_idx` ON `rebuild_projects` (`status`);--> statement-breakpoint
CREATE INDEX `projects_province_idx` ON `rebuild_projects` (`province_id`);--> statement-breakpoint
CREATE INDEX `projects_district_idx` ON `rebuild_projects` (`district_id`);--> statement-breakpoint
CREATE TABLE `report_project_links` (
	`id` text PRIMARY KEY NOT NULL,
	`report_id` text NOT NULL,
	`project_id` text NOT NULL,
	`link_type` text DEFAULT 'primary' NOT NULL,
	`linked_by` text,
	`notes` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`report_id`) REFERENCES `damage_reports`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`) REFERENCES `rebuild_projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`linked_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `links_report_idx` ON `report_project_links` (`report_id`);--> statement-breakpoint
CREATE INDEX `links_project_idx` ON `report_project_links` (`project_id`);--> statement-breakpoint
CREATE TABLE `road_segments` (
	`id` text PRIMARY KEY NOT NULL,
	`report_id` text,
	`start_lat` real NOT NULL,
	`start_lng` real NOT NULL,
	`end_lat` real NOT NULL,
	`end_lng` real NOT NULL,
	`snapped_path` text,
	`road_name` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`report_id`) REFERENCES `damage_reports`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `road_segments_report_idx` ON `road_segments` (`report_id`);--> statement-breakpoint
CREATE TABLE `state_transitions` (
	`id` text PRIMARY KEY NOT NULL,
	`report_id` text NOT NULL,
	`from_status` text,
	`to_status` text NOT NULL,
	`user_id` text,
	`user_role` text,
	`reason` text,
	`metadata` text,
	`ip_address` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`report_id`) REFERENCES `damage_reports`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `transitions_report_idx` ON `state_transitions` (`report_id`);--> statement-breakpoint
CREATE INDEX `transitions_created_idx` ON `state_transitions` (`created_at`);--> statement-breakpoint
-- Better-Auth user table
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`phone` text,
	`role` text DEFAULT 'citizen' NOT NULL,
	`province_scope` text,
	`district_scope` text,
	`is_active` integer DEFAULT true NOT NULL,
	`last_login` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);

-- Better-Auth session table
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);
--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);

-- Better-Auth account table (for password and OAuth)
CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);

-- Better-Auth verification table (for email verification, password reset)
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);