import { create } from "zustand";
import { LatLngExpression } from "leaflet";

export interface CitizenIncidentData {
  id: string;
  latitude: number;
  longitude: number;
  damageType: string;
  passabilityLevel: string | null;
  isSingleLane: boolean | null;
  description: string | null;
  createdAt: string;
}

export interface ProcessedIncident {
  id: string;
  position: LatLngExpression;
  damageType: string;
  passabilityLevel: string;
  isSingleLane: boolean;
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
    .filter((inc) => inc.latitude && inc.longitude)
    .map((inc) => ({
      id: inc.id,
      position: [inc.latitude, inc.longitude] as LatLngExpression,
      damageType: inc.damageType || "other",
      passabilityLevel: inc.passabilityLevel || "unknown",
      isSingleLane: inc.isSingleLane ?? false,
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
