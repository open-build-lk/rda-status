import { stateTransitions } from "../db/schema";
import type { DrizzleD1Database } from "drizzle-orm/d1";

export type AuditTargetType = "report" | "user" | "invitation" | "user_organization";

export interface AuditEntry {
  targetType: AuditTargetType;
  targetId: string;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  performedBy: string | null;
  performerRole: string | null;
  reason?: string;
  metadata?: Record<string, unknown>;
  // For status changes on reports (backwards compatibility)
  fromStatus?: string | null;
  toStatus?: string | null;
}

/**
 * Records one or more audit entries in the state_transitions table.
 * Use this for tracking changes to any entity (users, invitations, org assignments, reports).
 */
export async function recordAuditEntries(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: DrizzleD1Database<any>,
  entries: AuditEntry[]
): Promise<void> {
  if (entries.length === 0) return;

  const now = new Date();
  await db.insert(stateTransitions).values(
    entries.map((entry) => ({
      id: crypto.randomUUID(),
      targetType: entry.targetType,
      targetId: entry.targetId,
      // For backwards compatibility, set reportId when target is a report
      reportId: entry.targetType === "report" ? entry.targetId : null,
      fieldName: entry.fieldName,
      oldValue: entry.oldValue,
      newValue: entry.newValue,
      // Use "n/a" as placeholder for non-status audit entries (production DB may have NOT NULL constraint)
      fromStatus: entry.fromStatus || "n/a",
      toStatus: entry.toStatus || "n/a",
      userId: entry.performedBy,
      userRole: entry.performerRole,
      reason: entry.reason || null,
      metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
      createdAt: now,
    }))
  );
}

/**
 * Helper to create audit entries for changed fields.
 * Compares old and new values and creates entries only for fields that changed.
 */
export function createFieldChangeEntries<T extends Record<string, unknown>>(
  targetType: AuditTargetType,
  targetId: string,
  oldValues: T,
  newValues: Partial<{ [K in keyof T]: T[K] | null | undefined }>,
  performedBy: string | null,
  performerRole: string | null,
  metadata?: Record<string, unknown>
): AuditEntry[] {
  const entries: AuditEntry[] = [];

  for (const [key, newVal] of Object.entries(newValues)) {
    if (newVal === undefined) continue;

    const oldVal = oldValues[key];
    // Convert to string for comparison (handles boolean, number, etc.)
    const oldStr = oldVal === null || oldVal === undefined ? null : String(oldVal);
    const newStr = newVal === null ? null : String(newVal);

    if (oldStr !== newStr) {
      entries.push({
        targetType,
        targetId,
        fieldName: key,
        oldValue: oldStr,
        newValue: newStr,
        performedBy,
        performerRole,
        metadata,
      });
    }
  }

  return entries;
}
