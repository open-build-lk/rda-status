import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Photo } from "@/components/camera/PhotoGallery";

type DamageType =
  | "tree_fall"
  | "bridge_collapse"
  | "landslide"
  | "flooding"
  | "road_breakage"
  | "washout"
  | "collapse"
  | "blockage"
  | "other";

type PassabilityLevel =
  | "unpassable"
  | "foot"
  | "bike"
  | "3wheeler"
  | "car"
  | "bus"
  | "truck";

export interface SelectedRoad {
  id: string;
  roadNumber: string;
  roadClass: string;
  name: string | null;
}

interface IncidentReportState {
  // Step 1: Photos
  photos: Photo[];

  // Location (from first photo or manual)
  latitude: number | null;
  longitude: number | null;
  province: string | null;
  district: string | null;
  locationName: string;
  isLoadingLocation: boolean;

  // Road classification
  roadNumberInput: string;
  selectedRoad: SelectedRoad | null;

  // Step 2: Incident Details
  damageType: DamageType | null;
  passabilityLevel: PassabilityLevel | null;
  isSingleLane: boolean;
  needsSafetyBarriers: boolean;
  blockedDistanceMeters: number | null;

  // Step 3: Contact Info
  anonymousName: string;
  anonymousEmail: string;
  anonymousContact: string;
  description: string;

  // Submission state
  isSubmitting: boolean;
  submitError: string | null;
  submittedReportId: string | null;
  claimToken: string | null;
}

interface IncidentReportActions {
  // Photo actions
  addPhoto: (photo: Photo) => void;
  removePhoto: (id: string) => void;
  clearPhotos: () => void;

  // Location actions
  setLocation: (lat: number, lng: number) => void;
  setProvince: (province: string | null) => void;
  setDistrict: (district: string | null) => void;
  setLocationName: (name: string) => void;
  setIsLoadingLocation: (loading: boolean) => void;

  // Road actions
  setRoadNumberInput: (input: string) => void;
  setSelectedRoad: (road: SelectedRoad | null) => void;

  // Form field actions
  setDamageType: (type: DamageType) => void;
  setPassabilityLevel: (level: PassabilityLevel | null) => void;
  setIsSingleLane: (value: boolean) => void;
  setNeedsSafetyBarriers: (value: boolean) => void;
  setBlockedDistance: (meters: number | null) => void;
  setAnonymousName: (name: string) => void;
  setAnonymousEmail: (email: string) => void;
  setAnonymousContact: (contact: string) => void;
  setDescription: (desc: string) => void;

  // Submission actions
  setSubmitting: (isSubmitting: boolean) => void;
  setSubmitError: (error: string | null) => void;
  setSubmittedReport: (reportId: string, claimToken: string | null) => void;

  // Reset
  reset: () => void;
}

const initialState: IncidentReportState = {
  photos: [],
  latitude: null,
  longitude: null,
  province: null,
  district: null,
  locationName: "",
  isLoadingLocation: false,
  roadNumberInput: "",
  selectedRoad: null,
  damageType: null,
  passabilityLevel: null,
  isSingleLane: false,
  needsSafetyBarriers: false,
  blockedDistanceMeters: null,
  anonymousName: "",
  anonymousEmail: "",
  anonymousContact: "",
  description: "",
  isSubmitting: false,
  submitError: null,
  submittedReportId: null,
  claimToken: null,
};

export const useIncidentReportStore = create<IncidentReportState & IncidentReportActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      addPhoto: (photo: Photo) => {
        const state = get();
        if (state.photos.length >= 5) return;

        // Use first photo's GPS as location
        if (state.photos.length === 0 && photo.coords) {
          set({
            photos: [...state.photos, photo],
            latitude: photo.coords.lat,
            longitude: photo.coords.lng,
          });
        } else {
          set({ photos: [...state.photos, photo] });
        }
      },

      removePhoto: (id: string) => {
        const state = get();
        const newPhotos = state.photos.filter((p) => p.id !== id);

        // If removing first photo, update location from new first photo
        if (newPhotos.length > 0 && state.photos[0]?.id === id) {
          const newFirst = newPhotos[0];
          set({
            photos: newPhotos,
            latitude: newFirst.coords?.lat ?? state.latitude,
            longitude: newFirst.coords?.lng ?? state.longitude,
          });
        } else {
          set({ photos: newPhotos });
        }
      },

      clearPhotos: () => {
        set({ photos: [], latitude: null, longitude: null });
      },

      setLocation: (lat: number, lng: number) => {
        set({ latitude: lat, longitude: lng });
      },

      setProvince: (province: string | null) => {
        set({ province, district: null }); // Reset district when province changes
      },

      setDistrict: (district: string | null) => {
        set({ district });
      },

      setLocationName: (name: string) => {
        set({ locationName: name });
      },

      setIsLoadingLocation: (loading: boolean) => {
        set({ isLoadingLocation: loading });
      },

      setRoadNumberInput: (input: string) => {
        set({ roadNumberInput: input });
      },

      setSelectedRoad: (road: SelectedRoad | null) => {
        set({ selectedRoad: road });
      },

      setDamageType: (type: DamageType) => {
        set({ damageType: type });
      },

      setPassabilityLevel: (level: PassabilityLevel | null) => {
        set({ passabilityLevel: level });
      },

      setIsSingleLane: (value: boolean) => {
        set({ isSingleLane: value });
      },

      setNeedsSafetyBarriers: (value: boolean) => {
        set({ needsSafetyBarriers: value });
      },

      setBlockedDistance: (meters: number | null) => {
        set({ blockedDistanceMeters: meters });
      },

      setAnonymousName: (name: string) => {
        set({ anonymousName: name });
      },

      setAnonymousEmail: (email: string) => {
        set({ anonymousEmail: email });
      },

      setAnonymousContact: (contact: string) => {
        set({ anonymousContact: contact });
      },

      setDescription: (desc: string) => {
        set({ description: desc });
      },

      setSubmitting: (isSubmitting: boolean) => {
        set({ isSubmitting });
      },

      setSubmitError: (error: string | null) => {
        set({ submitError: error });
      },

      setSubmittedReport: (reportId: string, claimToken: string | null) => {
        set({
          submittedReportId: reportId,
          claimToken,
          isSubmitting: false,
        });
      },

      reset: () => {
        // Revoke all photo preview URLs
        const state = get();
        state.photos.forEach((p) => URL.revokeObjectURL(p.preview));
        set(initialState);
      },
    }),
    {
      name: "incident-report-draft",
      // Only persist certain fields, not photos (blobs can't be serialized)
      partialize: (state) => ({
        damageType: state.damageType,
        passabilityLevel: state.passabilityLevel,
        isSingleLane: state.isSingleLane,
        needsSafetyBarriers: state.needsSafetyBarriers,
        blockedDistanceMeters: state.blockedDistanceMeters,
        anonymousName: state.anonymousName,
        anonymousEmail: state.anonymousEmail,
        anonymousContact: state.anonymousContact,
        description: state.description,
      }),
    }
  )
);
