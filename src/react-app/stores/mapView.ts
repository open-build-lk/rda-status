import { create } from "zustand";
import { LatLngExpression, LatLngBounds } from "leaflet";

export type StatusFilter = "all" | "pending" | "in_progress" | "resolved";

interface MapViewState {
  selectedProvince: string | null;
  selectedSegmentId: string | null;
  expandedProvinces: Set<string>;
  targetBounds: LatLngBounds | null;
  targetLocation: LatLngExpression | null;
  targetZoom: number | null;
  statusFilter: StatusFilter;
}

interface MapViewActions {
  selectProvince: (province: string, bounds: LatLngBounds) => void;
  selectSegment: (segmentId: string, location: LatLngExpression) => void;
  toggleProvinceExpanded: (province: string) => void;
  setStatusFilter: (filter: StatusFilter) => void;
  clearSelection: () => void;
  clearMapTarget: () => void;
}

export const useMapViewStore = create<MapViewState & MapViewActions>()(
  (set, get) => ({
    selectedProvince: null,
    selectedSegmentId: null,
    expandedProvinces: new Set<string>(),
    targetBounds: null,
    targetLocation: null,
    targetZoom: null,
    statusFilter: "all" as StatusFilter,

    selectProvince: (province: string, bounds: LatLngBounds) => {
      const { expandedProvinces } = get();
      const newExpanded = new Set(expandedProvinces);

      // Toggle expansion
      if (newExpanded.has(province)) {
        newExpanded.delete(province);
      } else {
        newExpanded.add(province);
      }

      set({
        selectedProvince: province,
        selectedSegmentId: null,
        expandedProvinces: newExpanded,
        targetBounds: bounds,
        targetLocation: null,
        targetZoom: null,
      });
    },

    selectSegment: (segmentId: string, location: LatLngExpression) => {
      set({
        selectedSegmentId: segmentId,
        targetLocation: location,
        targetZoom: 14,
        targetBounds: null,
      });
    },

    toggleProvinceExpanded: (province: string) => {
      const { expandedProvinces } = get();
      const newExpanded = new Set(expandedProvinces);

      if (newExpanded.has(province)) {
        newExpanded.delete(province);
      } else {
        newExpanded.add(province);
      }

      set({ expandedProvinces: newExpanded });
    },

    setStatusFilter: (filter: StatusFilter) => {
      const { statusFilter } = get();
      // Toggle off if clicking same filter, otherwise set new filter
      set({ statusFilter: statusFilter === filter ? "all" : filter });
    },

    clearSelection: () => {
      set({
        selectedProvince: null,
        selectedSegmentId: null,
        targetBounds: null,
        targetLocation: null,
        targetZoom: null,
      });
    },

    clearMapTarget: () => {
      set({
        targetBounds: null,
        targetLocation: null,
        targetZoom: null,
      });
    },
  })
);
