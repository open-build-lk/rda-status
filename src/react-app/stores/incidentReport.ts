import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Photo } from "@/components/camera/PhotoGallery";
import type { InfrastructureCategory, DamageLevel, PriorityLevel } from "../../shared/types";

type DamageType =
  | "roof_damage"
  | "wall_collapse"
  | "foundation_crack"
  | "flooding_damage"
  | "structural_crack"
  | "complete_collapse"
  | "fire_damage"
  | "water_damage"
  | "other";

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

  // Step 2: Facility Details
  infrastructureCategory: InfrastructureCategory | null;
  facilityName: string;

  // Step 3: Damage Details
  damageType: DamageType | null;
  damageLevel: DamageLevel | null;
  citizenPriority: PriorityLevel | null;
  description: string;

  // Step 4: Contact Info
  anonymousName: string;
  anonymousEmail: string;
  anonymousContact: string;

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

  // Facility actions
  setInfrastructureCategory: (category: InfrastructureCategory | null) => void;
  setFacilityName: (name: string) => void;

  // Damage actions
  setDamageType: (type: DamageType | null) => void;
  setDamageLevel: (level: DamageLevel | null) => void;
  setCitizenPriority: (priority: PriorityLevel | null) => void;
  setDescription: (desc: string) => void;

  // Contact actions
  setAnonymousName: (name: string) => void;
  setAnonymousEmail: (email: string) => void;
  setAnonymousContact: (contact: string) => void;

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
  infrastructureCategory: null,
  facilityName: "",
  damageType: null,
  damageLevel: null,
  citizenPriority: null,
  description: "",
  anonymousName: "",
  anonymousEmail: "",
  anonymousContact: "",
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

      setInfrastructureCategory: (category: InfrastructureCategory | null) => {
        set({ infrastructureCategory: category });
      },

      setFacilityName: (name: string) => {
        set({ facilityName: name });
      },

      setDamageType: (type: DamageType | null) => {
        set({ damageType: type });
      },

      setDamageLevel: (level: DamageLevel | null) => {
        set({ damageLevel: level });
      },

      setCitizenPriority: (priority: PriorityLevel | null) => {
        set({ citizenPriority: priority });
      },

      setDescription: (desc: string) => {
        set({ description: desc });
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
        infrastructureCategory: state.infrastructureCategory,
        facilityName: state.facilityName,
        damageType: state.damageType,
        damageLevel: state.damageLevel,
        citizenPriority: state.citizenPriority,
        description: state.description,
        anonymousName: state.anonymousName,
        anonymousEmail: state.anonymousEmail,
        anonymousContact: state.anonymousContact,
      }),
    }
  )
);
