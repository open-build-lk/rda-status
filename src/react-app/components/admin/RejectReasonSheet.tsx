import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface RejectReasonSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportNumber: string;
  onConfirmReject: (reason: string, notes?: string) => Promise<void>;
}

const REJECTION_REASONS = [
  { value: "duplicate", label: "Duplicate report" },
  { value: "insufficient_info", label: "Insufficient information" },
  { value: "outside_jurisdiction", label: "Location outside jurisdiction" },
  { value: "not_infrastructure", label: "Not road infrastructure damage" },
  { value: "spam", label: "Spam / Invalid submission" },
  { value: "other", label: "Other" },
];

export function RejectReasonSheet({
  open,
  onOpenChange,
  reportNumber,
  onConfirmReject,
}: RejectReasonSheetProps) {
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!selectedReason) return;

    setIsSubmitting(true);
    try {
      const reasonLabel = REJECTION_REASONS.find(r => r.value === selectedReason)?.label || selectedReason;
      const fullReason = notes ? `${reasonLabel}: ${notes}` : reasonLabel;
      await onConfirmReject(fullReason, notes);
      // Reset state after successful rejection
      setSelectedReason("");
      setNotes("");
      onOpenChange(false);
    } catch (error) {
      // Error handling is done in parent
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedReason("");
    setNotes("");
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="border-b">
          <DrawerTitle>Reject Report</DrawerTitle>
          <DrawerDescription>
            Report {reportNumber} will be marked as rejected
          </DrawerDescription>
        </DrawerHeader>

        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Select reason:</Label>
            <div className="space-y-2">
              {REJECTION_REASONS.map((reason) => (
                <label
                  key={reason.value}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedReason === reason.value
                      ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                      : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  <input
                    type="radio"
                    name="rejection-reason"
                    value={reason.value}
                    checked={selectedReason === reason.value}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="w-4 h-4 text-primary-600"
                  />
                  <span className="text-sm">{reason.label}</span>
                </label>
              ))}
            </div>
          </div>

          {selectedReason === "other" && (
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-medium">
                Additional notes (required)
              </Label>
              <Textarea
                id="notes"
                placeholder="Please describe the reason..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          )}
        </div>

        <DrawerFooter className="border-t">
          <div className="flex gap-2 w-full">
            <DrawerClose asChild>
              <Button variant="outline" className="flex-1" onClick={handleClose}>
                Cancel
              </Button>
            </DrawerClose>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleConfirm}
              disabled={!selectedReason || (selectedReason === "other" && !notes.trim()) || isSubmitting}
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Reject Report
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
