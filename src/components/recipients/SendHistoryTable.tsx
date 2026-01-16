import { useSends, SendWithDetails } from "@/hooks/useSends";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Trash2, Eye, EyeOff, Copy, ExternalLink } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";

export function SendHistoryTable() {
  const { sends, isLoading, deleteSend } = useSends();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const openDelete = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (deletingId) {
      await deleteSend.mutateAsync(deletingId);
      setDeleteDialogOpen(false);
      setDeletingId(null);
    }
  };

  const copyTrackingLink = (token: string) => {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/r/${token}`;
    navigator.clipboard.writeText(link);
    toast.success("Tracking link copied to clipboard");
  };

  if (isLoading) {
    return <div className="text-muted-foreground p-4">Loading send history...</div>;
  }

  if (sends.length === 0) {
    return (
      <div className="border rounded-lg p-8 text-center text-muted-foreground">
        No sends logged yet. Log a send when you share a report with a recipient.
      </div>
    );
  }

  return (
    <>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Recipient</TableHead>
              <TableHead>Report</TableHead>
              <TableHead>Sent</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Views</TableHead>
              <TableHead>Last Viewed</TableHead>
              <TableHead className="w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sends.map((send) => (
              <TableRow key={send.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{send.recipient.contact_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {send.recipient.company_name}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm">{send.issue?.title || "Unknown"}</span>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {format(new Date(send.sent_at), "MMM d, yyyy")}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(send.sent_at), "h:mm a")}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  {send.view_count > 0 ? (
                    <Badge variant="default" className="bg-success/10 text-success border-success/20">
                      <Eye className="w-3 h-3 mr-1" />
                      Viewed
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <EyeOff className="w-3 h-3 mr-1" />
                      Not Viewed
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-center font-medium">
                  {send.view_count}
                </TableCell>
                <TableCell>
                  {send.last_viewed_at ? (
                    <span className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(send.last_viewed_at), { addSuffix: true })}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyTrackingLink(send.tracking_token)}
                      title="Copy tracking link"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => window.open(`/r/${send.tracking_token}`, '_blank')}
                      title="Open tracking link"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openDelete(send.id)}
                      title="Delete send"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Send Record?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this send record and all associated view events.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
