import { useTranslation } from "react-i18next";
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
  icon: React.ReactNode;
}

const categories: Category[] = [
  { id: "tree_fall", icon: <TreePine className="w-6 h-6" /> },
  { id: "landslide", icon: <Mountain className="w-6 h-6" /> },
  { id: "flooding", icon: <Waves className="w-6 h-6" /> },
  { id: "road_breakage", icon: <Construction className="w-6 h-6" /> },
  { id: "bridge_collapse", icon: <AlertTriangle className="w-6 h-6" /> },
  { id: "washout", icon: <Waves className="w-6 h-6" /> },
  { id: "blockage", icon: <CircleSlash className="w-6 h-6" /> },
  { id: "collapse", icon: <Layers className="w-6 h-6" /> },
  { id: "other", icon: <HelpCircle className="w-6 h-6" /> },
];

interface IncidentCategorySelectProps {
  value: DamageType | null;
  onChange: (type: DamageType) => void;
}

export function IncidentCategorySelect({ value, onChange }: IncidentCategorySelectProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {t("report:details.damageType")} <span className="text-red-500">*</span>
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
              {t(`damageTypes.${category.id}`)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
