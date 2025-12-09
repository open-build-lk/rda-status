import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Ban, Footprints, Bike, Car, Bus, Truck } from "lucide-react";

type PassabilityLevel =
  | "unpassable"
  | "foot"
  | "bike"
  | "3wheeler"
  | "car"
  | "bus"
  | "truck";

interface PassabilityOption {
  id: PassabilityLevel;
  icon: React.ReactNode;
  color: string;
}

const passabilityOptions: PassabilityOption[] = [
  {
    id: "unpassable",
    icon: <Ban className="w-5 h-5" />,
    color: "bg-red-500",
  },
  {
    id: "foot",
    icon: <Footprints className="w-5 h-5" />,
    color: "bg-orange-500",
  },
  {
    id: "bike",
    icon: <Bike className="w-5 h-5" />,
    color: "bg-amber-500",
  },
  {
    id: "3wheeler",
    icon: <Car className="w-4 h-4" />,
    color: "bg-yellow-500",
  },
  {
    id: "car",
    icon: <Car className="w-5 h-5" />,
    color: "bg-lime-500",
  },
  {
    id: "bus",
    icon: <Bus className="w-5 h-5" />,
    color: "bg-green-500",
  },
  {
    id: "truck",
    icon: <Truck className="w-5 h-5" />,
    color: "bg-emerald-500",
  },
];

interface PassabilityScaleProps {
  value: PassabilityLevel | null;
  onChange: (level: PassabilityLevel | null) => void;
}

export function PassabilityScale({ value, onChange }: PassabilityScaleProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {t("report:details.passability")}
        </label>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            {t("buttons.clear")}
          </button>
        )}
      </div>
      <div className="flex gap-1">
        {passabilityOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={cn(
              "flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-lg border-2 transition-all",
              value === option.id
                ? `border-gray-800 dark:border-white ${option.color} text-white`
                : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-400"
            )}
          >
            {option.icon}
            <span className="text-[10px] font-medium">{t(`passability.${option.id}`)}</span>
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
        {t("report:details.passabilityHint")}
      </p>
    </div>
  );
}
