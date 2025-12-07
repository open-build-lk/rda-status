import { useState, useEffect } from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface UpdateProgressSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportNumber: string;
  currentProgress: number;
  currentCost: number | null;
  onConfirm: (progress: number, cost: number | null) => Promise<void>;
}

export function UpdateProgressSheet({
  open,
  onOpenChange,
  reportNumber,
  currentProgress,
  currentCost,
  onConfirm,
}: UpdateProgressSheetProps) {
  const [progress, setProgress] = useState(currentProgress);
  const [cost, setCost] = useState<string>(currentCost?.toString() ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset when opened with new values
  useEffect(() => {
    if (open) {
      setProgress(currentProgress);
      setCost(currentCost?.toString() ?? "");
    }
  }, [open, currentProgress, currentCost]);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      const costValue = cost === "" ? null : parseInt(cost) || null;
      await onConfirm(progress, costValue);
      onOpenChange(false);
    } catch {
      // Error handling done in parent
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick progress buttons
  const quickProgressOptions = [0, 25, 50, 75, 100];

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="border-b">
          <DrawerTitle>Update Progress</DrawerTitle>
          <DrawerDescription>
            Report {reportNumber}
          </DrawerDescription>
        </DrawerHeader>

        <div className="p-4 space-y-4">
          {/* Progress */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Progress (%)</Label>

            {/* Quick select buttons */}
            <div className="flex gap-2">
              {quickProgressOptions.map((value) => (
                <button
                  key={value}
                  onClick={() => setProgress(value)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    progress === value
                      ? "bg-primary text-primary-foreground"
                      : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  {value}%
                </button>
              ))}
            </div>

            {/* Custom input */}
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={100}
                value={progress}
                onChange={(e) => setProgress(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                className="text-center text-lg font-medium"
              />
              <span className="text-gray-500">%</span>
            </div>

            {/* Progress bar preview */}
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  progress >= 100
                    ? "bg-green-500"
                    : progress >= 50
                    ? "bg-blue-500"
                    : "bg-yellow-500"
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Cost estimate */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Est. Cost (LKR)</Label>
            <Input
              type="number"
              min={0}
              placeholder="e.g. 1500000"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
            />
            {cost && (
              <p className="text-xs text-gray-500">
                {new Intl.NumberFormat("en-LK", {
                  style: "currency",
                  currency: "LKR",
                  minimumFractionDigits: 0,
                }).format(parseInt(cost) || 0)}
              </p>
            )}
          </div>
        </div>

        <DrawerFooter className="border-t">
          <div className="flex gap-2 w-full">
            <DrawerClose asChild>
              <Button variant="outline" className="flex-1">
                Cancel
              </Button>
            </DrawerClose>
            <Button
              className="flex-1"
              onClick={handleConfirm}
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Progress
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
