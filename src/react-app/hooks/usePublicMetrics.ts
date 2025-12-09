import { useState, useEffect } from "react";

export interface MetricsSummary {
  totalReports: number;
  resolved: number;
  inProgress: number;
  pending: number;
}

export interface MetricsPerformance {
  avgResolutionTimeDays: number;
  resolvedThisWeek: number;
  resolvedThisMonth: number;
}

export interface RecentResolution {
  id: string;
  roadName: string;
  district: string;
  damageType: string;
  resolutionTimeDays: number;
  resolvedAt: string;
}

export interface InProgressWork {
  id: string;
  roadName: string;
  district: string;
  progressPercent: number;
}

export interface DistrictStats {
  district: string;
  resolved: number;
  inProgress: number;
  pending: number;
}

export interface PublicMetrics {
  summary: MetricsSummary;
  performance: MetricsPerformance;
  recentResolutions: RecentResolution[];
  inProgressWork: InProgressWork[];
  byDistrict: DistrictStats[];
}

export function usePublicMetrics() {
  const [metrics, setMetrics] = useState<PublicMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const res = await fetch("/api/v1/public/metrics");
        if (!res.ok) throw new Error("Failed to fetch metrics");
        const data = await res.json() as PublicMetrics;
        setMetrics(data);
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch metrics");
        setIsLoading(false);
      }
    }

    fetchMetrics();
  }, []);

  return { metrics, isLoading, error };
}
