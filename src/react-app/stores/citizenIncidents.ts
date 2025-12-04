import { create } from "zustand";
import { LatLngExpression } from "leaflet";

export interface CitizenIncidentData {
  id: string;
  reportNumber: string;
  latitude: number;
  longitude: number;
  province: string | null;
  district: string | null;
  locationName: string | null;
  infrastructureCategory: string | null;
  facilityName: string | null;
  damageType: string;
  damageLevel: string | null;
  description: string | null;
  createdAt: string;
}

export interface ProcessedIncident {
  id: string;
  reportNumber: string;
  position: LatLngExpression;
  province: string;
  district: string;
  locationName: string | null;
  infrastructureCategory: string;
  facilityName: string;
  damageType: string;
  damageLevel: string;
  description: string;
  createdAt: string;
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
    .filter((inc) => inc.latitude && inc.longitude && inc.infrastructureCategory)
    .map((inc) => ({
      id: inc.id,
      reportNumber: inc.reportNumber,
      position: [inc.latitude, inc.longitude] as LatLngExpression,
      province: inc.province || "Unknown",
      district: inc.district || "Unknown",
      locationName: inc.locationName,
      infrastructureCategory: inc.infrastructureCategory || "other",
      facilityName: inc.facilityName || "Unknown Facility",
      damageType: inc.damageType || "other",
      damageLevel: inc.damageLevel || "minor",
      description: inc.description || "No description provided",
      createdAt: inc.createdAt,
    }));
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
