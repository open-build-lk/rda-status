import { useState, useCallback, useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { LatLng, DivIcon } from "leaflet";
import "leaflet/dist/leaflet.css";
import { Search, MapPin, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

// Sri Lanka bounds for validation
const SRI_LANKA_BOUNDS = {
  minLat: 5.9,
  maxLat: 9.9,
  minLng: 79.5,
  maxLng: 82.0,
};

// Center of Sri Lanka
const SRI_LANKA_CENTER: [number, number] = [7.8731, 80.7718];

interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (location: { lat: number; lng: number; address?: string }) => void;
  initialCenter?: [number, number];
}

// Create a custom pin icon
function createPinIcon(isPlaced: boolean = false): DivIcon {
  return new DivIcon({
    html: `
      <div style="
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        transform: translate(-50%, -100%);
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="${isPlaced ? "#DC2626" : "#3B82F6"}" stroke="white" stroke-width="1.5">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
          <circle cx="12" cy="10" r="3" fill="white"/>
        </svg>
      </div>
    `,
    className: "location-picker-pin",
    iconSize: [40, 40],
    iconAnchor: [20, 40],
  });
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    road?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
  };
}

// Component to handle map click events
function MapClickHandler({
  onLocationSelect,
}: {
  onLocationSelect: (latlng: LatLng) => void;
}) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng);
    },
  });
  return null;
}

// Component to control map view programmatically
function MapController({
  center,
  zoom,
}: {
  center: [number, number] | null;
  zoom: number | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (center && zoom) {
      map.flyTo(center, zoom, { duration: 0.5 });
    }
  }, [map, center, zoom]);

  return null;
}

// Component to show current zoom level
function ZoomIndicator({ minZoom }: { minZoom: number }) {
  const map = useMap();
  const [currentZoom, setCurrentZoom] = useState(map.getZoom());

  useMapEvents({
    zoomend() {
      setCurrentZoom(map.getZoom());
    },
  });

  const isZoomSufficient = currentZoom >= minZoom;

  return (
    <div
      className={`absolute bottom-4 left-4 z-[1000] px-3 py-1.5 rounded-full text-xs font-medium ${
        isZoomSufficient
          ? "bg-green-100 text-green-700"
          : "bg-amber-100 text-amber-700"
      }`}
    >
      Zoom: {Math.round(currentZoom)}
      {!isZoomSufficient && ` (need ${minZoom}+)`}
    </div>
  );
}

export function LocationPickerModal({
  isOpen,
  onClose,
  onConfirm,
  initialCenter,
}: LocationPickerModalProps) {
  const [selectedPosition, setSelectedPosition] = useState<LatLng | null>(null);
  const [address, setAddress] = useState<string>("");
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [mapZoom, setMapZoom] = useState<number | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [currentZoom, setCurrentZoom] = useState(8);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const MIN_ZOOM_LEVEL = 15;

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedPosition(null);
      setAddress("");
      setSearchQuery("");
      setSearchResults([]);
      setValidationError(null);
      setMapCenter(initialCenter || SRI_LANKA_CENTER);
      setMapZoom(initialCenter ? 15 : 8);
    }
  }, [isOpen, initialCenter]);

  // Validate if position is within Sri Lanka
  const isWithinSriLanka = useCallback((lat: number, lng: number): boolean => {
    return (
      lat >= SRI_LANKA_BOUNDS.minLat &&
      lat <= SRI_LANKA_BOUNDS.maxLat &&
      lng >= SRI_LANKA_BOUNDS.minLng &&
      lng <= SRI_LANKA_BOUNDS.maxLng
    );
  }, []);

  // Handle location selection from map click
  const handleLocationSelect = useCallback(
    (latlng: LatLng) => {
      if (!isWithinSriLanka(latlng.lat, latlng.lng)) {
        setValidationError("Please select a location within Sri Lanka");
        return;
      }

      setValidationError(null);
      setSelectedPosition(latlng);

      // Reverse geocode to get address
      setIsLoadingAddress(true);
      fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            "User-Agent": "SriLankaRoadStatus/1.0",
            "Accept-Language": "en",
          },
        }
      )
        .then((res) => res.json() as Promise<{ display_name?: string }>)
        .then((data) => {
          if (data.display_name) {
            setAddress(data.display_name);
          }
        })
        .catch((err) => {
          console.error("Reverse geocoding failed:", err);
        })
        .finally(() => {
          setIsLoadingAddress(false);
        });
    },
    [isWithinSriLanka]
  );

  // Debounced search
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      setIsSearching(true);
      fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=lk&limit=5`,
        {
          headers: {
            "User-Agent": "SriLankaRoadStatus/1.0",
            "Accept-Language": "en",
          },
        }
      )
        .then((res) => res.json() as Promise<NominatimResult[]>)
        .then((data) => {
          setSearchResults(data);
        })
        .catch((err) => {
          console.error("Search failed:", err);
          setSearchResults([]);
        })
        .finally(() => {
          setIsSearching(false);
        });
    }, 300);
  }, []);

  // Handle search result selection
  const handleSearchResultSelect = useCallback((result: NominatimResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);

    setMapCenter([lat, lng]);
    setMapZoom(17);
    setSearchResults([]);
    setSearchQuery(result.display_name.split(",")[0]); // Show short name

    // Auto-place marker at search result
    const latlng = new LatLng(lat, lng);
    setSelectedPosition(latlng);
    setAddress(result.display_name);
    setValidationError(null);
  }, []);

  // Handle confirm
  const handleConfirm = useCallback(() => {
    if (!selectedPosition) return;

    if (currentZoom < MIN_ZOOM_LEVEL) {
      setValidationError(`Please zoom in more (current: ${currentZoom}, need: ${MIN_ZOOM_LEVEL}+)`);
      return;
    }

    onConfirm({
      lat: selectedPosition.lat,
      lng: selectedPosition.lng,
      address: address || undefined,
    });
    onClose();
  }, [selectedPosition, address, currentZoom, onConfirm, onClose]);

  // Track zoom level
  const MapZoomTracker = () => {
    useMapEvents({
      zoomend(e) {
        setCurrentZoom(e.target.getZoom());
      },
    });
    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            Pick Location on Map
          </DialogTitle>
          <DialogDescription>
            Search for a location or click on the map to place a pin. Zoom in
            for precise placement.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search Box */}
          <div className="px-6 py-4 border-b bg-gray-50 dark:bg-gray-900">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search for a location in Sri Lanka..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10 pr-10"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
              )}
            </div>

            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute z-[1001] mt-1 w-[calc(100%-3rem)] bg-white dark:bg-gray-800 rounded-lg shadow-lg border max-h-48 overflow-auto">
                {searchResults.map((result, index) => (
                  <button
                    key={index}
                    type="button"
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
                    onClick={() => handleSearchResultSelect(result)}
                  >
                    {result.display_name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Map Container */}
          <div className="flex-1 relative">
            <MapContainer
              center={initialCenter || SRI_LANKA_CENTER}
              zoom={initialCenter ? 15 : 8}
              className="h-full w-full"
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              />

              <MapClickHandler onLocationSelect={handleLocationSelect} />
              <MapController center={mapCenter} zoom={mapZoom} />
              <MapZoomTracker />
              <ZoomIndicator minZoom={MIN_ZOOM_LEVEL} />

              {selectedPosition && (
                <Marker
                  position={selectedPosition}
                  icon={createPinIcon(true)}
                  draggable={true}
                  eventHandlers={{
                    dragend: (e) => {
                      const marker = e.target;
                      const position = marker.getLatLng();
                      handleLocationSelect(position);
                    },
                  }}
                />
              )}
            </MapContainer>

            {/* Validation Error */}
            {validationError && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] px-4 py-2 bg-red-100 text-red-700 rounded-lg flex items-center gap-2 shadow-lg">
                <AlertCircle className="w-4 h-4" />
                {validationError}
              </div>
            )}
          </div>

          {/* Selected Location Info */}
          {selectedPosition && (
            <div className="px-6 py-4 border-t bg-gray-50 dark:bg-gray-900">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Selected Location
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {selectedPosition.lat.toFixed(6)},{" "}
                    {selectedPosition.lng.toFixed(6)}
                  </div>
                  {isLoadingAddress ? (
                    <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Loading address...
                    </div>
                  ) : address ? (
                    <div className="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                      {address}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t flex justify-between items-center">
          <div className="text-xs text-gray-500">
            {selectedPosition
              ? "Drag the pin or click elsewhere to adjust"
              : "Click on the map to place a pin"}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!selectedPosition || currentZoom < MIN_ZOOM_LEVEL}
            >
              Confirm Location
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
