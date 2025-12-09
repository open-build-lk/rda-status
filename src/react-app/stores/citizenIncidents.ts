import { create } from "zustand";
import { LatLngExpression } from "leaflet";

export interface CitizenIncidentData {
  id: string;
  latitude: number;
  longitude: number;
  locationName: string | null;
  damageType: string;
  passabilityLevel: string | null;
  isSingleLane: boolean | null;
  description: string | null;
  createdAt: string;
  reportNumber: string;
  districtName: string | null;
  provinceName: string | null;
  roadLocation: string | null;
  status: string;
  workflowData: string | null;
  resolvedAt: string | null;
}

export interface ProcessedIncident {
  id: string;
  reportNumber: string;
  position: LatLngExpression;
  damageType: string;
  passabilityLevel: string;
  isSingleLane: boolean;
  description: string;
  createdAt: string;
  districtName: string;
  provinceName: string;
  roadLocation: string | null;
  status: string;
  progressPercent: number;
  resolvedAt: string | null;
}

interface CitizenIncidentsState {
  rawIncidents: CitizenIncidentData[];
  incidents: ProcessedIncident[];
  isLoading: boolean;
  error: string | null;
  hasFetched: boolean;
}

interface CitizenIncidentsActions {
  fetchIncidents: () => Promise<void>;
}

function processIncidents(
  rawIncidents: CitizenIncidentData[]
): ProcessedIncident[] {
  return rawIncidents
    .filter((inc) => inc.latitude && inc.longitude)
    .map((inc) => {
      // Parse workflowData for progress percent
      let progressPercent = 0;
      if (inc.workflowData) {
        try {
          const workflow = JSON.parse(inc.workflowData);
          progressPercent = workflow.progressPercent || 0;
        } catch {
          // Ignore parse errors
        }
      }

      return {
        id: inc.id,
        reportNumber: inc.reportNumber,
        position: [inc.latitude, inc.longitude] as LatLngExpression,
        damageType: inc.damageType || "other",
        passabilityLevel: inc.passabilityLevel || "unknown",
        isSingleLane: inc.isSingleLane ?? false,
        description: inc.description || "No description provided",
        createdAt: inc.createdAt,
        districtName: inc.districtName || "Unknown",
        provinceName: inc.provinceName || "Unknown",
        roadLocation: inc.roadLocation,
        status: inc.status,
        progressPercent,
        resolvedAt: inc.resolvedAt,
      };
    });
}

export const useCitizenIncidentsStore = create<
  CitizenIncidentsState & CitizenIncidentsActions
>()((set, get) => ({
  rawIncidents: [],
  incidents: [],
  isLoading: false,
  error: null,
  hasFetched: false,

  fetchIncidents: async () => {
    // Don't fetch if already fetched or currently loading
    if (get().hasFetched || get().isLoading) {
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const res = await fetch("/api/v1/map/incidents");
      if (!res.ok) throw new Error("Failed to fetch incidents");

      const rawIncidents = (await res.json()) as CitizenIncidentData[];
      const incidents = processIncidents(rawIncidents);

      set({
        rawIncidents,
        incidents,
        isLoading: false,
        hasFetched: true,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Failed to fetch incidents",
        isLoading: false,
        hasFetched: true,
      });
    }
  },
}));
