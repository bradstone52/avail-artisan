import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

interface NewBatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (name: string) => void;
  selectedCount: number;
  isCreating: boolean;
}

export function NewBatchDialog({
  open,
  onOpenChange,
  onConfirm,
  selectedCount,
  isCreating,
}: NewBatchDialogProps) {
  const now = new Date();
  const defaultName = `Distribution Availabilities — ${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;
  
  const [batchName, setBatchName] = useState(defaultName);

  const handleConfirm = () => {
    onConfirm(batchName.trim() || defaultName);
  };

  // Reset name when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      const now = new Date();
      setBatchName(`Distribution Availabilities — ${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Batch Send</DialogTitle>
          <DialogDescription>
            This will create a new batch with {selectedCount} recipient{selectedCount !== 1 ? "s" : ""}.
            Reply tracking will start fresh for this batch.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="batch-name">Batch Name</Label>
            <Input
              id="batch-name"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              placeholder="Enter batch name..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isCreating}>
            {isCreating ? "Creating..." : "Create Batch"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}