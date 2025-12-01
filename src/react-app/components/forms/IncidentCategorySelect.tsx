import { cn } from "@/lib/utils";
import {
  TreePine,
  Mountain,
  Waves,
  Construction,
  AlertTriangle,
  CircleSlash,
  Layers,
  HelpCircle,
} from "lucide-react";

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

interface Category {
  id: DamageType;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const categories: Category[] = [
  {
    id: "tree_fall",
    label: "Tree Fall",
    icon: <TreePine className="w-6 h-6" />,
    description: "Fallen tree blocking road",
  },
  {
    id: "landslide",
    label: "Landslide",
    icon: <Mountain className="w-6 h-6" />,
    description: "Earth/rock slide onto road",
  },
  {
    id: "flooding",
    label: "Flooding",
    icon: <Waves className="w-6 h-6" />,
    description: "Water covering road",
  },
  {
    id: "road_breakage",
    label: "Road Damage",
    icon: <Construction className="w-6 h-6" />,
    description: "Cracks, potholes, surface damage",
  },
  {
    id: "bridge_collapse",
    label: "Bridge Issue",
    icon: <AlertTriangle className="w-6 h-6" />,
    description: "Bridge damage or collapse",
  },
  {
    id: "washout",
    label: "Washout",
    icon: <Waves className="w-6 h-6" />,
    description: "Road washed away",
  },
  {
    id: "blockage",
    label: "Blockage",
    icon: <CircleSlash className="w-6 h-6" />,
    description: "Debris or obstacle blocking",
  },
  {
    id: "collapse",
    label: "Collapse",
    icon: <Layers className="w-6 h-6" />,
    description: "Road/structure collapsed",
  },
  {
    id: "other",
    label: "Other",
    icon: <HelpCircle className="w-6 h-6" />,
    description: "Other road issue",
  },
];

interface IncidentCategorySelectProps {
  value: DamageType | null;
  onChange: (type: DamageType) => void;
}

export function IncidentCategorySelect({ value, onChange }: IncidentCategorySelectProps) {
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        What type of incident? <span className="text-red-500">*</span>
      </label>
      <div className="grid grid-cols-3 gap-2">
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => onChange(category.id)}
            className={cn(
              "flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all",
              "hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950",
              value === category.id
                ? "border-primary-600 bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300"
                : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
            )}
          >
            {category.icon}
            <span className="text-xs font-medium text-center leading-tight">
              {category.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
