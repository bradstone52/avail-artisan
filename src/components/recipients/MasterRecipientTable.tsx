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
import { Pencil, Trash2, Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Recipient } from "@/hooks/useRecipients";
import { cn } from "@/lib/utils";
interface MasterRecipientTableProps {
  recipients: Recipient[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onEditRecipient: (recipient: Recipient) => void;
  onDeleteRecipient: (id: string) => void;
}

type SortField = "company_name" | "scale" | null;
type SortDirection = "asc" | "desc";

// Helper function to parse scale values for numeric sorting
function getScaleNumericValue(scale: string | null): number {
  if (!scale) return -1;
  
  const scaleMap: Record<string, number> = {
    "< 10,000": 1,
    "10,000 - 20,000": 2,
    "20,000 - 50,000": 3,
    "50,000 - 100,000": 4,
    "> 100,000": 5,
  };
  
  return scaleMap[scale] ?? 0;
}

export function MasterRecipientTable({
  recipients,
  selectedIds,
  onSelectionChange,
  onEditRecipient,
  onDeleteRecipient,
}: MasterRecipientTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Handle sort toggle
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction or clear sort
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortField(null);
        setSortDirection("asc");
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Filter and sort recipients
  const filteredRecipients = useMemo(() => {
    let result = recipients;
    
    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(r => 
        r.company_name.toLowerCase().includes(query) ||
        r.contact_name.toLowerCase().includes(query) ||
        r.email.toLowerCase().includes(query)
      );
    }
    
    // Sort
    if (sortField) {
      result = [...result].sort((a, b) => {
        let comparison = 0;
        
        if (sortField === "company_name") {
          comparison = a.company_name.localeCompare(b.company_name);
        } else if (sortField === "scale") {
          const aVal = getScaleNumericValue(a.scale);
          const bVal = getScaleNumericValue(b.scale);
          comparison = aVal - bVal;
        }
        
        return sortDirection === "asc" ? comparison : -comparison;
      });
    }
    
    return result;
  }, [recipients, searchQuery, sortField, sortDirection]);

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

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />;
    }
    return sortDirection === "asc" 
      ? <ArrowUp className="ml-1 h-3 w-3" /> 
      : <ArrowDown className="ml-1 h-3 w-3" />;
  };

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
      <div>
        <Table stickyHeader>
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
              <TableHead className="w-[160px]">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-auto p-0 font-medium hover:bg-transparent"
                  onClick={() => handleSort("company_name")}
                >
                  Company
                  {getSortIcon("company_name")}
                </Button>
              </TableHead>
              <TableHead className="w-[130px]">Contact Name</TableHead>
              <TableHead className="w-[120px]">Position</TableHead>
              <TableHead className="w-[100px]">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-auto p-0 font-medium hover:bg-transparent"
                  onClick={() => handleSort("scale")}
                >
                  Scale
                  {getSortIcon("scale")}
                </Button>
              </TableHead>
              <TableHead className="w-[180px]">Email</TableHead>
              <TableHead className="w-[130px]">Phone</TableHead>
              <TableHead className="w-[200px]">Notes</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRecipients.map((recipient) => (
              <TableRow
                key={recipient.id}
                className={cn(
                  "cursor-pointer !border-b-2 !border-foreground",
                  selectedIds.has(recipient.id)
                    ? "!bg-secondary outline outline-2 outline-amber-600"
                    : "hover:!bg-pink-200 hover:outline hover:outline-2 hover:outline-pink-500"
                )}
              >
                <TableCell>
                  <Checkbox
                    checked={selectedIds.has(recipient.id)}
                    onCheckedChange={(checked) => handleSelectOne(recipient.id, !!checked)}
                    aria-label={`Select ${recipient.contact_name}`}
                  />
                </TableCell>
                <TableCell className="font-medium">{recipient.company_name}</TableCell>
                <TableCell>{recipient.contact_name}</TableCell>
                <TableCell className="text-muted-foreground">{recipient.title || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{recipient.scale || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{recipient.email}</TableCell>
                <TableCell className="text-muted-foreground">{recipient.phone || "—"}</TableCell>
                <TableCell className="text-muted-foreground truncate max-w-[200px]">{recipient.notes || "—"}
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
