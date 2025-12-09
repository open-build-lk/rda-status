import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PhotoWithMetadata } from "@/lib/exif-utils";
import type { LocationGroup } from "@/lib/location-grouping";

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

// Flexible incident details - add new fields here as needed
export interface IncidentDetails {
  isSingleLane?: boolean;
  needsSafetyBarriers?: boolean;
  blockedDistanceMeters?: number | null;
  // Add new fields here without schema changes:
  // alternativeRouteAvailable?: boolean;
  // estimatedRepairDays?: number;
  // hazardType?: string;
  // affectedLanes?: number;
  [key: string]: unknown; // Allow any additional fields
}

export interface SelectedRoad {
  id: string;
  roadNumber: string;
  roadClass: string;
  name: string | null;
}

export interface BulkIncident {
  groupId: string;
  photos: PhotoWithMetadata[];
  centroid: { latitude: number; longitude: number };
  incidentDate: Date | null; // Earliest photo timestamp
  province: string | null;
  district: string | null;
  roadNumberInput: string; // What user typed in the input
  selectedRoad: SelectedRoad | null; // Full road object if matched from database
  locationName: string;
  damageType: DamageType | null;
  passabilityLevel: PassabilityLevel | null;
  // Flexible incident details (new fields go in here)
  incidentDetails: IncidentDetails;
  description: string;
  isComplete: boolean;
}

export interface BulkSubmissionResult {
  groupId: string;
  success: boolean;
  reportId?: string;
  reportNumber?: string;
  error?: string;
}

interface BulkUploadState {
  // Step tracking
  currentStep: "select" | "review" | "submit" | "complete";

  // Photos
  allPhotos: PhotoWithMetadata[];
  orphanedPhotos: PhotoWithMetadata[];

  // Groups/Incidents
  incidents: BulkIncident[];
  currentIncidentIndex: number;

  // Processing
  isProcessing: boolean;
  processingProgress: number;

  // Submission
  isSubmitting: boolean;
  uploadProgress: Record<string, number>;
  submissionResults: BulkSubmissionResult[];
  submitError: string | null;
}

interface BulkUploadActions {
  // Photo actions
  addPhotos: (photos: PhotoWithMetadata[]) => void;
  setGroups: (groups: LocationGroup[], orphaned: PhotoWithMetadata[]) => void;
  movePhotoToGroup: (photoId: string, targetGroupId: string) => void;
  removePhoto: (photoId: string) => void;

  // Incident actions
  updateIncident: (groupId: string, data: Partial<BulkIncident>) => void;
  setCurrentIndex: (index: number) => void;

  // Step navigation
  setStep: (step: BulkUploadState["currentStep"]) => void;

  // Processing
  setProcessing: (isProcessing: boolean, progress?: number) => void;

  // Submission
  setSubmitting: (isSubmitting: boolean) => void;
  updateUploadProgress: (groupId: string, progress: number) => void;
  setSubmissionResults: (results: BulkSubmissionResult[]) => void;
  setSubmitError: (error: string | null) => void;
  clearSubmissionState: () => void;

  // Reset
  reset: () => void;
}

const initialState: BulkUploadState = {
  currentStep: "select",
  allPhotos: [],
  orphanedPhotos: [],
  incidents: [],
  currentIncidentIndex: 0,
  isProcessing: false,
  processingProgress: 0,
  isSubmitting: false,
  uploadProgress: {},
  submissionResults: [],
  submitError: null,
};

export const useBulkUploadStore = create<BulkUploadState & BulkUploadActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      addPhotos: (photos) =>
        set((state) => ({
          allPhotos: [...state.allPhotos, ...photos],
        })),

      setGroups: (groups, orphaned) =>
        set({
          incidents: groups.map((g) => {
            // Find earliest photo timestamp
            const timestamps = g.photos
              .map((p) => p.timestamp)
              .filter((t): t is Date => t !== null);
            const earliestDate =
              timestamps.length > 0
                ? new Date(Math.min(...timestamps.map((t) => t.getTime())))
                : null;

            return {
              groupId: g.id,
              photos: g.photos,
              centroid: g.centroid,
              incidentDate: earliestDate,
              province: null,
              district: null,
              roadNumberInput: "",
              selectedRoad: null,
              locationName: "",
              damageType: null,
              passabilityLevel: null,
              incidentDetails: {
                isSingleLane: false,
                needsSafetyBarriers: false,
                blockedDistanceMeters: null,
              },
              description: "",
              isComplete: false,
            };
          }),
          orphanedPhotos: orphaned,
          currentStep: "review",
        }),

      movePhotoToGroup: (photoId, targetGroupId) => {
        const state = get();

        // Find source (either from an incident or orphaned)
        let sourcePhoto: PhotoWithMetadata | null = null;

        // Check incidents
        for (const inc of state.incidents) {
          const found = inc.photos.find((p) => p.id === photoId);
          if (found) {
            sourcePhoto = found;
            break;
          }
        }

        // Check orphaned
        if (!sourcePhoto) {
          sourcePhoto =
            state.orphanedPhotos.find((p) => p.id === photoId) || null;
        }

        if (!sourcePhoto) return;

        // Remove from source
        const newIncidents = state.incidents.map((inc) => ({
          ...inc,
          photos: inc.photos.filter((p) => p.id !== photoId),
        }));
        const newOrphaned = state.orphanedPhotos.filter(
          (p) => p.id !== photoId
        );

        // Add to target
        const targetIncident = newIncidents.find(
          (inc) => inc.groupId === targetGroupId
        );
        if (targetIncident && targetIncident.photos.length < 5) {
          targetIncident.photos.push(sourcePhoto);
        }

        // Remove empty incidents
        const filteredIncidents = newIncidents.filter(
          (inc) => inc.photos.length > 0
        );

        set({
          incidents: filteredIncidents,
          orphanedPhotos: newOrphaned,
        });
      },

      removePhoto: (photoId) => {
        const state = get();
        const photo =
          state.allPhotos.find((p) => p.id === photoId) ||
          state.orphanedPhotos.find((p) => p.id === photoId);
        if (photo) {
          URL.revokeObjectURL(photo.preview);
        }

        set({
          allPhotos: state.allPhotos.filter((p) => p.id !== photoId),
          orphanedPhotos: state.orphanedPhotos.filter((p) => p.id !== photoId),
          incidents: state.incidents
            .map((inc) => ({
              ...inc,
              photos: inc.photos.filter((p) => p.id !== photoId),
            }))
            .filter((inc) => inc.photos.length > 0),
        });
      },

      updateIncident: (groupId, data) =>
        set((state) => ({
          incidents: state.incidents.map((inc) =>
            inc.groupId === groupId ? { ...inc, ...data } : inc
          ),
        })),

      setCurrentIndex: (index) => set({ currentIncidentIndex: index }),

      setStep: (step) => set({ currentStep: step }),

      setProcessing: (isProcessing, progress = 0) =>
        set({ isProcessing, processingProgress: progress }),

      setSubmitting: (isSubmitting) => set({ isSubmitting }),

      updateUploadProgress: (groupId, progress) =>
        set((state) => ({
          uploadProgress: { ...state.uploadProgress, [groupId]: progress },
        })),

      setSubmissionResults: (results) =>
        set((state) => ({
          submissionResults: results,
          // Only transition to complete if we have results
          currentStep: results.length > 0 ? "complete" : state.currentStep,
        })),

      setSubmitError: (error) => set({ submitError: error }),

      clearSubmissionState: () =>
        set({
          uploadProgress: {},
          submissionResults: [],
          submitError: null,
          isSubmitting: false,
        }),

      reset: () => {
        const state = get();
        // Revoke all object URLs to prevent memory leaks
        state.allPhotos.forEach((p) => URL.revokeObjectURL(p.preview));
        state.orphanedPhotos.forEach((p) => URL.revokeObjectURL(p.preview));
        set(initialState);
      },
    }),
    {
      name: "bulk-upload-draft",
      partialize: (state) => ({
        // Only persist non-blob data for draft recovery
        currentStep: state.currentStep,
        currentIncidentIndex: state.currentIncidentIndex,
        // Store incident metadata without file blobs
        incidents: state.incidents.map((inc) => ({
          ...inc,
          photos: inc.photos.map((p) => ({
            id: p.id,
            gps: p.gps,
            timestamp: p.timestamp,
          })),
        })),
      }),
    }
  )
);
