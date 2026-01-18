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
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil, Trash2, Search } from "lucide-react";
import { Recipient } from "@/hooks/useRecipients";
import { format } from "date-fns";

interface MasterRecipientTableProps {
  recipients: Recipient[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onEditRecipient: (recipient: Recipient) => void;
  onDeleteRecipient: (id: string) => void;
}

export function MasterRecipientTable({
  recipients,
  selectedIds,
  onSelectionChange,
  onEditRecipient,
  onDeleteRecipient,
}: MasterRecipientTableProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter recipients based on search
  const filteredRecipients = useMemo(() => {
    if (!searchQuery.trim()) return recipients;
    
    const query = searchQuery.toLowerCase();
    return recipients.filter(r => 
      r.company_name.toLowerCase().includes(query) ||
      r.contact_name.toLowerCase().includes(query) ||
      r.email.toLowerCase().includes(query)
    );
  }, [recipients, searchQuery]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(new Set(filteredRecipients.map(r => r.id)));
    } else {
      onSelectionChange(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    onSelectionChange(newSelected);
  };

  const allFilteredSelected = filteredRecipients.length > 0 && 
    filteredRecipients.every(r => selectedIds.has(r.id));
  const someFilteredSelected = filteredRecipients.some(r => selectedIds.has(r.id));

  if (recipients.length === 0) {
    return (
      <div className="border rounded-lg p-8 text-center text-muted-foreground">
        No recipients yet. Add your first recipient to get started.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search company, contact, or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Selection info */}
      {selectedIds.size > 0 && (
        <div className="text-sm text-muted-foreground">
          {selectedIds.size} recipient{selectedIds.size !== 1 ? "s" : ""} selected
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={allFilteredSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all filtered recipients"
                  className={someFilteredSelected && !allFilteredSelected ? "opacity-50" : ""}
                />
              </TableHead>
              <TableHead className="w-[180px]">Company</TableHead>
              <TableHead className="w-[150px]">Contact Name</TableHead>
              <TableHead className="w-[200px]">Email</TableHead>
              <TableHead className="w-[120px]">Default Owner</TableHead>
              <TableHead className="w-[100px]">Notes</TableHead>
              <TableHead className="w-[110px]">Created</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRecipients.map((recipient) => (
              <TableRow key={recipient.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedIds.has(recipient.id)}
                    onCheckedChange={(checked) => handleSelectOne(recipient.id, !!checked)}
                    aria-label={`Select ${recipient.contact_name}`}
                  />
                </TableCell>
                <TableCell className="font-medium">{recipient.company_name}</TableCell>
                <TableCell>{recipient.contact_name}</TableCell>
                <TableCell className="text-muted-foreground">{recipient.email}</TableCell>
                <TableCell>{recipient.default_owner}</TableCell>
                <TableCell className="text-muted-foreground truncate max-w-[100px]">
                  {recipient.notes || "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(new Date(recipient.created_at), "MMM d, yyyy")}
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
            ))}
          </TableBody>
        </Table>
      </div>

      {filteredRecipients.length === 0 && searchQuery && (
        <div className="text-center text-muted-foreground py-4">
          No recipients match your search.
        </div>
      )}
    </div>
  );
}