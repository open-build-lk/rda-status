import { Hono } from "hono";
import { createDb } from "../db";
import { damageReports } from "../db/schema";
import { sql } from "drizzle-orm";

const publicMetricsRoutes = new Hono<{ Bindings: Env }>();

// Cache TTL in seconds (5 minutes)
const CACHE_TTL = 300;
interface PublicMetricsResponse {
  summary: {
    totalReports: number;
    resolved: number;
    inProgress: number;
    pending: number;
  };
  performance: {
    avgResolutionTimeDays: number;
    resolvedThisWeek: number;
    resolvedThisMonth: number;
  };
  recentResolutions: {
    id: string;
    roadName: string;
    district: string;
    damageType: string;
    resolutionTimeDays: number;
    resolvedAt: string;
  }[];
  inProgressWork: {
    id: string;
    roadName: string;
    district: string;
    progressPercent: number;
  }[];
  byDistrict: {
    district: string;
    resolved: number;
    inProgress: number;
    pending: number;
  }[];
}

let cachedMetrics: { data: PublicMetricsResponse; timestamp: number } | null = null;

// Helper to calculate days between two dates
function daysBetween(start: Date, end: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((end.getTime() - start.getTime()) / msPerDay);
}

// GET /api/v1/public/metrics - Get public dashboard metrics
publicMetricsRoutes.get("/metrics", async (c) => {
  const now = Date.now();

  // Check cache
  if (cachedMetrics && (now - cachedMetrics.timestamp) < CACHE_TTL * 1000) {
    return c.json(cachedMetrics.data);
  }

  const db = createDb(c.env.DB);

  // Calculate date boundaries
  const today = new Date();
  const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const oneYearAgo = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);

  // Get all non-rejected reports
  const allReports = await db
    .select({
      id: damageReports.id,
      status: damageReports.status,
      locationName: damageReports.locationName,
      damageType: damageReports.damageType,
      workflowData: damageReports.workflowData,
      createdAt: damageReports.createdAt,
      resolvedAt: damageReports.resolvedAt,
      inProgressAt: damageReports.inProgressAt,
    })
    .from(damageReports)
    .where(
      sql`${damageReports.status} != 'rejected'`
    );

  // Calculate summary counts
  const summary = {
    totalReports: allReports.length,
    resolved: allReports.filter(r => r.status === "resolved").length,
    inProgress: allReports.filter(r => r.status === "in_progress").length,
    pending: allReports.filter(r => r.status === "new" || r.status === "verified").length,
  };

  // Get resolved reports with timestamps for metrics calculation
  const resolvedReports = allReports.filter(r =>
    r.status === "resolved" && r.resolvedAt
  );

  // Calculate resolution times (only for reports that have both timestamps)
  // Note: Drizzle with mode: "timestamp" returns Date objects directly
  const reportsWithResolutionTime = resolvedReports
    .filter(r => r.createdAt && r.resolvedAt)
    .map(r => ({
      ...r,
      resolutionTimeDays: daysBetween(
        r.createdAt as Date,
        r.resolvedAt as Date
      ),
    }));

  // Average resolution time (for reports resolved within last year)
  const recentResolved = reportsWithResolutionTime.filter(r => {
    return (r.resolvedAt as Date) >= oneYearAgo;
  });

  const avgResolutionTimeDays = recentResolved.length > 0
    ? Math.round(recentResolved.reduce((sum, r) => sum + r.resolutionTimeDays, 0) / recentResolved.length * 10) / 10
    : 0;

  // Resolved counts for time periods
  const resolvedThisWeek = resolvedReports.filter(r => {
    return (r.resolvedAt as Date) >= oneWeekAgo;
  }).length;

  const resolvedThisMonth = resolvedReports.filter(r => {
    return (r.resolvedAt as Date) >= oneMonthAgo;
  }).length;

  // Recent resolutions (last 5, within a year)
  const recentResolutions = recentResolved
    .sort((a, b) => {
      return (b.resolvedAt as Date).getTime() - (a.resolvedAt as Date).getTime();
    })
    .slice(0, 5)
    .map(r => {
      // Parse location name for district
      let districtName = null;
      let roadName = r.locationName;
      if (r.locationName) {
        const match = r.locationName.match(/\(([^,]+),\s*([^)]+)\)/);
        if (match) {
          districtName = match[1].trim();
          const roadMatch = r.locationName.match(/^([^(]+)/);
          if (roadMatch && roadMatch[1].trim()) {
            roadName = roadMatch[1].trim();
          }
        }
      }

      return {
        id: r.id,
        roadName: roadName || "Unknown Road",
        district: districtName || "Unknown",
        damageType: r.damageType,
        resolutionTimeDays: r.resolutionTimeDays,
        resolvedAt: (r.resolvedAt as Date).toISOString(),
      };
    });

  // In-progress work
  const inProgressReports = allReports.filter(r => r.status === "in_progress");
  const inProgressWork = inProgressReports
    .slice(0, 10)
    .map(r => {
      // Parse location name for district
      let districtName = null;
      let roadName = r.locationName;
      if (r.locationName) {
        const match = r.locationName.match(/\(([^,]+),\s*([^)]+)\)/);
        if (match) {
          districtName = match[1].trim();
          const roadMatch = r.locationName.match(/^([^(]+)/);
          if (roadMatch && roadMatch[1].trim()) {
            roadName = roadMatch[1].trim();
          }
        }
      }

      // Parse workflowData for progress
      let progressPercent = 0;
      if (r.workflowData) {
        try {
          const workflow = JSON.parse(r.workflowData);
          progressPercent = workflow.progressPercent || 0;
        } catch {
          // Ignore parse errors
        }
      }

      return {
        id: r.id,
        roadName: roadName || "Unknown Road",
        district: districtName || "Unknown",
        progressPercent,
      };
    });

  // District breakdown
  const districtCounts: Record<string, { resolved: number; inProgress: number; pending: number }> = {};

  allReports.forEach(r => {
    let districtName = "Unknown";
    if (r.locationName) {
      const match = r.locationName.match(/\(([^,]+),\s*([^)]+)\)/);
      if (match) {
        districtName = match[1].trim();
      }
    }

    if (!districtCounts[districtName]) {
      districtCounts[districtName] = { resolved: 0, inProgress: 0, pending: 0 };
    }

    if (r.status === "resolved") {
      districtCounts[districtName].resolved++;
    } else if (r.status === "in_progress") {
      districtCounts[districtName].inProgress++;
    } else if (r.status === "new" || r.status === "verified") {
      districtCounts[districtName].pending++;
    }
  });

  // Convert to array and sort by total activity
  const byDistrict = Object.entries(districtCounts)
    .map(([district, counts]) => ({
      district,
      ...counts,
    }))
    .sort((a, b) =>
      (b.resolved + b.inProgress + b.pending) - (a.resolved + a.inProgress + a.pending)
    )
    .slice(0, 10);

  const metricsData = {
    summary,
    performance: {
      avgResolutionTimeDays,
      resolvedThisWeek,
      resolvedThisMonth,
    },
    recentResolutions,
    inProgressWork,
    byDistrict,
  };

  // Cache the result
  cachedMetrics = {
    data: metricsData,
    timestamp: now,
  };

  return c.json(metricsData);
});

export { publicMetricsRoutes };
