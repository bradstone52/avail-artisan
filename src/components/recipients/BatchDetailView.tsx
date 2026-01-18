import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Check, X } from "lucide-react";
import { RecipientWithBatchStatus, Batch, OwnerOption } from "@/hooks/useBatches";
import { format } from "date-fns";

const OWNER_OPTIONS: OwnerOption[] = ["Brad", "Doug", "Angel", "Unassigned"];

interface BatchDetailViewProps {
  batch: Batch;
  recipients: RecipientWithBatchStatus[];
  isLoading: boolean;
  onBack: () => void;
  onUpdateStatus: (recipientId: string, updates: {
    replied?: boolean;
    reply_date?: string | null;
    next_step?: string | null;
    owner?: string;
  }) => void;
  onUpdateBatchStatus: (status: string) => void;
}

export function BatchDetailView({
  batch,
  recipients,
  isLoading,
  onBack,
  onUpdateStatus,
  onUpdateBatchStatus,
}: BatchDetailViewProps) {
  const [editingNextStep, setEditingNextStep] = useState<string | null>(null);
  const [nextStepValue, setNextStepValue] = useState("");

  // Calculate stats
  const stats = useMemo(() => {
    const total = recipients.length;
    const replied = recipients.filter(r => r.batchStatus?.replied).length;
    return {
      total,
      replied,
      notReplied: total - replied,
    };
  }, [recipients]);

  const handleRepliedToggle = (recipientId: string, currentValue: boolean) => {
    onUpdateStatus(recipientId, {
      replied: !currentValue,
      reply_date: !currentValue ? new Date().toISOString().split("T")[0] : null,
    });
  };

  const handleReplyDateChange = (recipientId: string, date: string) => {
    onUpdateStatus(recipientId, {
      reply_date: date || null,
    });
  };

  const handleOwnerChange = (recipientId: string, owner: string) => {
    onUpdateStatus(recipientId, { owner });
  };

  const startEditingNextStep = (recipientId: string, currentValue: string | null) => {
    setEditingNextStep(recipientId);
    setNextStepValue(currentValue || "");
  };

  const saveNextStep = (recipientId: string) => {
    onUpdateStatus(recipientId, {
      next_step: nextStepValue.trim() || null,
    });
    setEditingNextStep(null);
    setNextStepValue("");
  };

  const cancelEditNextStep = () => {
    setEditingNextStep(null);
    setNextStepValue("");
  };

  if (isLoading) {
    return <div className="text-muted-foreground p-4">Loading batch details...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Batches
          </Button>
          <span className="text-lg font-semibold">{batch.name}</span>
          <Badge variant={batch.status === "Active" ? "default" : "secondary"}>
            {batch.status}
          </Badge>
        </div>
        <Select value={batch.status} onValueChange={onUpdateBatchStatus}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
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

      {/* Table */}
      {recipients.length === 0 ? (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          No recipients in this batch.
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Company</TableHead>
                <TableHead className="w-[150px]">Contact</TableHead>
                <TableHead className="w-[180px]">Email</TableHead>
                <TableHead className="w-[80px] text-center">Replied</TableHead>
                <TableHead className="w-[120px]">Reply Date</TableHead>
                <TableHead className="w-[200px]">Next Step</TableHead>
                <TableHead className="w-[120px]">Owner</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recipients.map((recipient) => {
                const status = recipient.batchStatus;
                const replied = status?.replied ?? false;
                const replyDate = status?.reply_date ?? null;
                const nextStep = status?.next_step ?? null;
                const owner = status?.owner ?? recipient.default_owner ?? "Unassigned";
                const isEditingThis = editingNextStep === recipient.id;

                return (
                  <TableRow key={recipient.id}>
                    <TableCell className="font-medium">{recipient.company_name}</TableCell>
                    <TableCell>{recipient.contact_name}</TableCell>
                    <TableCell className="text-muted-foreground">{recipient.email}</TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={replied}
                        onCheckedChange={() => handleRepliedToggle(recipient.id, replied)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        value={replyDate || ""}
                        onChange={(e) => handleReplyDateChange(recipient.id, e.target.value)}
                        className="h-8 text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      {isEditingThis ? (
                        <div className="flex items-center gap-1">
                          <Input
                            value={nextStepValue}
                            onChange={(e) => setNextStepValue(e.target.value)}
                            className="h-8 text-sm"
                            placeholder="Enter next step..."
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveNextStep(recipient.id);
                              if (e.key === "Escape") cancelEditNextStep();
                            }}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => saveNextStep(recipient.id)}
                          >
                            <Check className="h-3.5 w-3.5 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={cancelEditNextStep}
                          >
                            <X className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </div>
                      ) : (
                        <button
                          className="text-sm text-left w-full hover:bg-muted/50 rounded px-2 py-1 -mx-2"
                          onClick={() => startEditingNextStep(recipient.id, nextStep)}
                        >
                          {nextStep || <span className="text-muted-foreground">Click to add...</span>}
                        </button>
                      )}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={owner}
                        onValueChange={(value) => handleOwnerChange(recipient.id, value)}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {OWNER_OPTIONS.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}