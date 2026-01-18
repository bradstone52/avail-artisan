import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { RecipientWithStatus } from "@/hooks/useBatches";
import { format } from "date-fns";

interface AppUser {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface RecipientTrackingTableProps {
  recipients: RecipientWithStatus[];
  batchId: string;
  isActiveBatch: boolean;
  appUsers: AppUser[];
  onUpdateStatus: (recipientId: string, updates: {
    replied?: boolean;
    reply_date?: string | null;
    next_step?: string | null;
    owner_user_id?: string | null;
  }) => void;
  onEditRecipient: (recipient: RecipientWithStatus) => void;
  onDeleteRecipient: (id: string) => void;
}

export function RecipientTrackingTable({
  recipients,
  batchId,
  isActiveBatch,
  appUsers,
  onUpdateStatus,
  onEditRecipient,
  onDeleteRecipient,
}: RecipientTrackingTableProps) {
  const [editingNextStep, setEditingNextStep] = useState<string | null>(null);
  const [nextStepValue, setNextStepValue] = useState("");

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

  const handleOwnerChange = (recipientId: string, ownerId: string) => {
    onUpdateStatus(recipientId, {
      owner_user_id: ownerId === "none" ? null : ownerId,
    });
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

  const getUserDisplayName = (userId: string | null) => {
    if (!userId) return null;
    const user = appUsers.find(u => u.id === userId);
    return user?.full_name || user?.email || "Unknown";
  };

  if (recipients.length === 0) {
    return (
      <div className="border rounded-lg p-8 text-center text-muted-foreground">
        No recipients yet. Add your first recipient to get started.
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[180px]">Company</TableHead>
            <TableHead className="w-[150px]">Contact</TableHead>
            <TableHead className="w-[80px] text-center">Replied</TableHead>
            <TableHead className="w-[120px]">Reply Date</TableHead>
            <TableHead className="w-[200px]">Next Step</TableHead>
            <TableHead className="w-[140px]">Owner</TableHead>
            <TableHead className="w-[80px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {recipients.map((recipient) => {
            const status = recipient.status;
            const replied = status?.replied ?? false;
            const replyDate = status?.reply_date ?? null;
            const nextStep = status?.next_step ?? null;
            const ownerId = status?.owner_user_id ?? null;
            const isEditingThis = editingNextStep === recipient.id;

            return (
              <TableRow key={recipient.id}>
                <TableCell className="font-medium">{recipient.company_name}</TableCell>
                <TableCell>
                  <div>
                    <div>{recipient.contact_name}</div>
                    <div className="text-xs text-muted-foreground">{recipient.email}</div>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Switch
                    checked={replied}
                    onCheckedChange={() => handleRepliedToggle(recipient.id, replied)}
                    disabled={!isActiveBatch}
                  />
                </TableCell>
                <TableCell>
                  {isActiveBatch ? (
                    <Input
                      type="date"
                      value={replyDate || ""}
                      onChange={(e) => handleReplyDateChange(recipient.id, e.target.value)}
                      className="h-8 text-sm"
                    />
                  ) : (
                    <span className="text-sm">
                      {replyDate ? format(new Date(replyDate), "MMM d, yyyy") : "—"}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {isActiveBatch ? (
                    isEditingThis ? (
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
                    )
                  ) : (
                    <span className="text-sm">{nextStep || "—"}</span>
                  )}
                </TableCell>
                <TableCell>
                  {isActiveBatch ? (
                    <Select
                      value={ownerId || "none"}
                      onValueChange={(value) => handleOwnerChange(recipient.id, value)}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Assign..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Unassigned</SelectItem>
                        {appUsers.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.full_name || user.email || "Unknown"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-sm">{getUserDisplayName(ownerId) || "—"}</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => onEditRecipient(recipient)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDeleteRecipient(recipient.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
