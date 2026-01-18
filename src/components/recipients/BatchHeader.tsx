import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RefreshCw, Calendar } from "lucide-react";
import { Batch } from "@/hooks/useBatches";

interface BatchHeaderProps {
  activeBatch: Batch | null;
  allBatches: Batch[];
  selectedBatchId: string | null;
  onSelectBatch: (batchId: string) => void;
  onCreateBatch: () => void;
  isCreating: boolean;
  stats: {
    total: number;
    replied: number;
    notReplied: number;
  };
}

export function BatchHeader({
  activeBatch,
  allBatches,
  selectedBatchId,
  onSelectBatch,
  onCreateBatch,
  isCreating,
  stats,
}: BatchHeaderProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleNewBatch = () => {
    setConfirmOpen(true);
  };

  const handleConfirmCreate = () => {
    onCreateBatch();
    setConfirmOpen(false);
  };

  const isViewingActive = selectedBatchId === activeBatch?.id;

  return (
    <div className="space-y-4">
      {/* Top row: Batch selector and New Batch button */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          {allBatches.length > 0 ? (
            <Select value={selectedBatchId || ""} onValueChange={onSelectBatch}>
              <SelectTrigger className="w-[320px]">
                <SelectValue placeholder="Select a batch" />
              </SelectTrigger>
              <SelectContent>
                {allBatches.map((batch) => (
                  <SelectItem key={batch.id} value={batch.id}>
                    <div className="flex items-center gap-2">
                      {batch.name}
                      {batch.is_active && (
                        <Badge variant="default" className="ml-2 text-xs">
                          Active
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="text-muted-foreground">No batches yet</span>
          )}
        </div>

        <Button onClick={handleNewBatch} disabled={isCreating}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isCreating ? "animate-spin" : ""}`} />
          New Batch Send
        </Button>
      </div>

      {/* Active batch indicator */}
      {activeBatch && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Active Batch:</span>
          <span className="font-medium">{activeBatch.name}</span>
          {!isViewingActive && (
            <Badge variant="outline" className="ml-2 text-xs">
              Viewing historical
            </Badge>
          )}
        </div>
      )}

      {/* Summary stats */}
      {selectedBatchId && (
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Total:</span>
            <span className="font-semibold">{stats.total}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Replied:</span>
            <span className="font-semibold text-green-600">{stats.replied}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Not Replied:</span>
            <span className="font-semibold text-orange-600">{stats.notReplied}</span>
          </div>
        </div>
      )}

      {/* Confirmation dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start a new batch?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset reply tracking for all recipients for the new batch. 
              Historical batches are preserved and can be viewed from the dropdown.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCreate}>
              Create New Batch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
