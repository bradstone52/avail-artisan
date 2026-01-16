import { useState } from "react";
import { useRecipients } from "@/hooks/useRecipients";
import { useSends } from "@/hooks/useSends";
import { useIssues } from "@/hooks/useIssues";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Send } from "lucide-react";
import { toast } from "sonner";

interface LogSendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LogSendDialog({ open, onOpenChange }: LogSendDialogProps) {
  const { recipients } = useRecipients();
  const { createSend } = useSends();
  const { issues } = useIssues();
  const [recipientId, setRecipientId] = useState<string>("");
  const [reportId, setReportId] = useState<string>("");

  // Filter to only show issues with PDFs
  const issuesWithPdf = issues.filter(
    (issue) => issue.pdf_url && issue.pdf_share_enabled
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!recipientId || !reportId) {
      toast.error("Please select both a recipient and a report");
      return;
    }

    await createSend.mutateAsync({
      recipient_id: recipientId,
      report_id: reportId,
    });

    // Get the created send to show the tracking link
    setRecipientId("");
    setReportId("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Log a Send
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="recipient">Recipient *</Label>
            <Select value={recipientId} onValueChange={setRecipientId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a recipient" />
              </SelectTrigger>
              <SelectContent>
                {recipients.map((recipient) => (
                  <SelectItem key={recipient.id} value={recipient.id}>
                    {recipient.contact_name} — {recipient.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="report">Report *</Label>
            <Select value={reportId} onValueChange={setReportId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a report" />
              </SelectTrigger>
              <SelectContent>
                {issuesWithPdf.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">
                    No reports with sharing enabled
                  </div>
                ) : (
                  issuesWithPdf.map((issue) => (
                    <SelectItem key={issue.id} value={issue.id}>
                      {issue.title}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <p className="text-sm text-muted-foreground">
            This will create a unique tracking link for this recipient. Copy and share
            the link to track when they view the report.
          </p>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createSend.isPending || !recipientId || !reportId}
            >
              <Send className="h-4 w-4 mr-2" />
              Log Send
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
