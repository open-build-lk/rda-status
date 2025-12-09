import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, X, Route } from "lucide-react";
import clsx from "clsx";

interface RoadSuggestion {
  id: string;
  roadNumber: string;
  roadClass: string;
  name: string | null;
}

export interface SelectedRoad {
  id: string;
  roadNumber: string;
  roadClass: string;
  name: string | null;
}

interface RoadNumberInputProps {
  value: string;
  selectedRoad: SelectedRoad | null;
  onChange: (input: string) => void;
  onRoadSelect: (road: SelectedRoad | null) => void;
}

const ROAD_CLASS_COLORS: Record<string, string> = {
  A: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  B: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  C: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  D: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  E: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
};

const ROAD_CLASS_LABELS: Record<string, string> = {
  A: "National Trunk",
  B: "National Secondary",
  C: "Provincial Main",
  D: "Provincial Secondary",
  E: "Expressway",
};

export function RoadNumberInput({
  value,
  selectedRoad,
  onChange,
  onRoadSelect,
}: RoadNumberInputProps) {
  const [suggestions, setSuggestions] = useState<RoadSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [lookedUpRoad, setLookedUpRoad] = useState<SelectedRoad | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastLookedUpValue = useRef<string>("");

  // Auto-lookup road info when value is set but no selectedRoad
  useEffect(() => {
    if (value && !selectedRoad && value !== lastLookedUpValue.current) {
      lastLookedUpValue.current = value;
      // Fetch road info for the value
      fetch(`/api/v1/roads/suggest?q=${encodeURIComponent(value)}&limit=1`)
        .then((res) => res.json() as Promise<RoadSuggestion[]>)
        .then((data) => {
          if (data.length > 0 && data[0].roadNumber.toUpperCase() === value.toUpperCase()) {
            setLookedUpRoad(data[0]);
            // Also notify parent so road info is saved on submit
            onRoadSelect(data[0]);
          } else {
            setLookedUpRoad(null);
          }
        })
        .catch(() => setLookedUpRoad(null));
    } else if (!value) {
      setLookedUpRoad(null);
      lastLookedUpValue.current = "";
    }
  }, [value, selectedRoad, onRoadSelect]);

  // Use either the provided selectedRoad or the looked-up road
  const displayRoad = selectedRoad || lookedUpRoad;

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 1) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/v1/roads/suggest?q=${encodeURIComponent(query)}&limit=8`
      );
      if (response.ok) {
        const data = (await response.json()) as RoadSuggestion[];
        setSuggestions(data);
      }
    } catch (error) {
      console.error("Failed to fetch road suggestions:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    // Clear selected road when user types
    if (selectedRoad || lookedUpRoad) {
      onRoadSelect(null);
      setLookedUpRoad(null);
      lastLookedUpValue.current = "";
    }

    // Debounce API calls
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(newValue);
    }, 150);

    setShowSuggestions(true);
    setHighlightedIndex(-1);
  };

  const handleSelectRoad = (road: RoadSuggestion) => {
    onChange(road.roadNumber);
    onRoadSelect(road);
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.blur();
  };

  const handleClearSelection = () => {
    onChange("");
    onRoadSelect(null);
    setLookedUpRoad(null);
    lastLookedUpValue.current = "";
    setSuggestions([]);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          handleSelectRoad(suggestions[highlightedIndex]);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        break;
    }
  };

  // Close suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-2">
      <Label htmlFor="roadNumber" className="flex items-center gap-2">
        <Route className="w-4 h-4" />
        Road Number
        <span className="text-xs text-gray-500 font-normal">(optional)</span>
      </Label>

      <div className="relative">
        {/* Selected road display */}
        {displayRoad ? (
          <div className="flex items-center gap-2 p-2 border rounded-md bg-gray-50 dark:bg-gray-800">
            <span
              className={clsx(
                "px-2 py-0.5 rounded text-xs font-medium",
                ROAD_CLASS_COLORS[displayRoad.roadClass] ||
                  "bg-gray-100 text-gray-700"
              )}
            >
              {displayRoad.roadNumber}
            </span>
            {displayRoad.name && (
              <span className="text-sm text-gray-600 dark:text-gray-400 truncate flex-1">
                {displayRoad.name}
              </span>
            )}
            <span className="text-xs text-gray-500">
              {ROAD_CLASS_LABELS[displayRoad.roadClass]}
            </span>
            <button
              type="button"
              onClick={handleClearSelection}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            <Input
              ref={inputRef}
              id="roadNumber"
              placeholder="e.g., A1, B84, E01"
              value={value}
              onChange={handleInputChange}
              onFocus={() => value && setShowSuggestions(true)}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              className="pr-8"
            />
            {isLoading && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              </div>
            )}
          </>
        )}

        {/* Suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && !displayRoad && (
          <div
            ref={suggestionsRef}
            className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-64 overflow-y-auto"
          >
            {suggestions.map((road, index) => (
              <button
                key={road.id}
                type="button"
                onClick={() => handleSelectRoad(road)}
                className={clsx(
                  "w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors",
                  index === highlightedIndex &&
                    "bg-gray-100 dark:bg-gray-700"
                )}
              >
                <span
                  className={clsx(
                    "px-2 py-0.5 rounded text-xs font-medium shrink-0",
                    ROAD_CLASS_COLORS[road.roadClass] ||
                      "bg-gray-100 text-gray-700"
                  )}
                >
                  {road.roadNumber}
                </span>
                {road.name && (
                  <span className="text-sm text-gray-600 dark:text-gray-400 truncate">
                    {road.name}
                  </span>
                )}
                <span className="ml-auto text-xs text-gray-500 shrink-0">
                  {ROAD_CLASS_LABELS[road.roadClass]}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* No results message */}
        {showSuggestions &&
          value.length >= 1 &&
          !isLoading &&
          suggestions.length === 0 &&
          !displayRoad && (
            <div className="absolute z-50 w-full mt-1 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg text-sm text-gray-500">
              No matching roads found. You can still type the road number
              manually.
            </div>
          )}
      </div>

      <p className="text-xs text-gray-500">
        Type to search RDA/Provincial roads. Leave empty if unknown.
      </p>
    </div>
  );
}
