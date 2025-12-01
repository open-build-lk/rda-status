import { useEffect } from "react";
import {
  useCitizenIncidentsStore,
  ProcessedIncident,
  CitizenIncidentData,
} from "@/stores/citizenIncidents";

// Re-export types for convenience
export type { ProcessedIncident, CitizenIncidentData };

export function useCitizenIncidentsAPI() {
  const { rawIncidents, isLoading, error, fetchIncidents } =
    useCitizenIncidentsStore();

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  return { incidents: rawIncidents, isLoading, error };
}

export function useCitizenIncidents(): {
  incidents: ProcessedIncident[];
  isLoading: boolean;
  error: string | null;
} {
  const { incidents, isLoading, error, fetchIncidents } =
    useCitizenIncidentsStore();

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  return { incidents, isLoading, error };
}
