import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FolderOpen } from "lucide-react";
import { Batch } from "@/hooks/useBatches";
import { format } from "date-fns";

interface BatchWithStats extends Batch {
  totalRecipients: number;
  repliedCount: number;
}

interface BatchListProps {
  batches: BatchWithStats[];
  isLoading: boolean;
  onOpenBatch: (batchId: string) => void;
}

export function BatchList({ batches, isLoading, onOpenBatch }: BatchListProps) {
  if (isLoading) {
    return <div className="text-muted-foreground p-4">Loading batches...</div>;
  }

  if (batches.length === 0) {
    return (
      <div className="border rounded-lg p-8 text-center text-muted-foreground">
        No batches yet. Select recipients and click "New Batch Send" to create one.
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[300px]">Batch Name</TableHead>
            <TableHead className="w-[120px]">Created</TableHead>
            <TableHead className="w-[100px]">Status</TableHead>
            <TableHead className="w-[120px] text-center">Total Recipients</TableHead>
            <TableHead className="w-[100px] text-center">Replied</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {batches.map((batch) => (
            <TableRow key={batch.id}>
              <TableCell className="font-medium">{batch.name}</TableCell>
              <TableCell className="text-muted-foreground">
                {format(new Date(batch.created_at), "MMM d, yyyy")}
              </TableCell>
              <TableCell>
                <Badge variant={batch.status === "Active" ? "default" : "secondary"}>
                  {batch.status}
                </Badge>
              </TableCell>
              <TableCell className="text-center">{batch.totalRecipients}</TableCell>
              <TableCell className="text-center">
                <span className="text-green-600 font-medium">{batch.repliedCount}</span>
                <span className="text-muted-foreground"> / {batch.totalRecipients}</span>
              </TableCell>
              <TableCell>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => onOpenBatch(batch.id)}
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Open
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}