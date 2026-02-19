import { useState, useMemo } from 'react';
import { Listing } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, CheckSquare, Square, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatSubmarket } from '@/lib/formatters';

interface SelectListingsStepProps {
  listings: Listing[];
  selectedIds: string[];
  sizeThreshold: number;
  onSelectionChange: (ids: string[]) => void;
  landlordFilter: string;
  onLandlordFilterChange: (landlord: string) => void;
}

export function SelectListingsStep({ 
  listings, 
  selectedIds, 
  sizeThreshold,
  onSelectionChange,
  landlordFilter,
  onLandlordFilterChange,
}: SelectListingsStepProps) {
  const [search, setSearch] = useState('');

  // Filter eligible listings (Active status, meets threshold)
  const eligibleListings = useMemo(() => {
    return listings.filter(l => 
      l.status === 'Active' && 
      l.size_sf >= sizeThreshold
    );
  }, [listings, sizeThreshold]);

  // Unique landlords for filter dropdown
  const uniqueLandlords = useMemo(() => {
    const set = new Set<string>();
    eligibleListings.forEach(l => {
      if (l.landlord?.trim()) set.add(l.landlord.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [eligibleListings]);

  // Apply search + landlord filter
  const filteredListings = useMemo(() => {
    let result = eligibleListings;
    if (landlordFilter) {
      result = result.filter(l => l.landlord?.trim() === landlordFilter);
    }
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(l =>
        l.property_name?.toLowerCase().includes(searchLower) ||
        l.address.toLowerCase().includes(searchLower) ||
        l.submarket.toLowerCase().includes(searchLower) ||
        l.landlord?.toLowerCase().includes(searchLower)
      );
    }
    return result;
  }, [eligibleListings, search, landlordFilter]);

  const isSelected = (id: string) => selectedIds.includes(id);

  const toggleSelection = (id: string) => {
    if (isSelected(id)) {
      onSelectionChange(selectedIds.filter(i => i !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const selectAll = () => {
    onSelectionChange(filteredListings.map(l => l.id));
  };

  const deselectAll = () => {
    onSelectionChange([]);
  };

  const filteredIds = new Set(filteredListings.map(l => l.id));
  const hiddenSelectedCount = selectedIds.filter(id => !filteredIds.has(id)).length;

  const deselectHidden = () => {
    onSelectionChange(selectedIds.filter(id => filteredIds.has(id)));
  };

  const selectIncludeMarked = () => {
    const marked = filteredListings.filter(l => l.include_in_issue).map(l => l.id);
    onSelectionChange(marked);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-display font-semibold mb-1">Select Listings</h2>
        <p className="text-muted-foreground text-sm">
          Choose which properties to include in this issue
        </p>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/50 rounded-lg">
        <div>
          <span className="text-2xl font-display font-bold">{selectedIds.length}</span>
          <span className="text-muted-foreground ml-1">selected</span>
        </div>
        <div className="text-muted-foreground">|</div>
        <div>
          <span className="text-lg font-semibold">{eligibleListings.length}</span>
          <span className="text-muted-foreground ml-1">eligible (≥{sizeThreshold.toLocaleString()} SF, Active)</span>
        </div>
        {hiddenSelectedCount > 0 && (
          <>
            <div className="text-muted-foreground">|</div>
            <div className="flex items-center gap-2">
              <Badge variant="destructive" className="text-xs">
                {hiddenSelectedCount} selected but hidden by filter
              </Badge>
              <Button variant="outline" size="sm" onClick={deselectHidden} className="h-7 text-xs">
                Deselect Hidden
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search listings..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={landlordFilter || "__all__"}
          onValueChange={(v) => onLandlordFilterChange(v === "__all__" ? "" : v)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Landlords" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Landlords</SelectItem>
            {uniqueLandlords.map((ll) => (
              <SelectItem key={ll} value={ll}>{ll}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={selectIncludeMarked}>
            <Filter className="w-4 h-4 mr-2" />
            Auto-select (Marked)
          </Button>
          <Button variant="outline" size="sm" onClick={selectAll}>
            <CheckSquare className="w-4 h-4 mr-2" />
            Select All
          </Button>
          <Button variant="ghost" size="sm" onClick={deselectAll}>
            <Square className="w-4 h-4 mr-2" />
            Clear
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-12"></TableHead>
              <TableHead>Property</TableHead>
              <TableHead>Submarket</TableHead>
              <TableHead className="text-right">Size</TableHead>
              <TableHead>Availability</TableHead>
              <TableHead className="text-center">Sheet Marked</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredListings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No eligible listings found
                </TableCell>
              </TableRow>
            ) : (
              filteredListings.map(listing => (
                <TableRow 
                  key={listing.id}
                  className={cn(
                    "cursor-pointer hover:bg-muted/30",
                    isSelected(listing.id) && "bg-primary/5"
                  )}
                  onClick={() => toggleSelection(listing.id)}
                >
                  <TableCell>
                    <Checkbox
                      checked={isSelected(listing.id)}
                      onCheckedChange={() => toggleSelection(listing.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">
                        {listing.property_name || listing.address}
                      </p>
                      {listing.property_name && (
                        <p className="text-xs text-muted-foreground">{listing.address}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{formatSubmarket(listing.submarket)}</TableCell>
                  <TableCell className="text-right font-medium text-sm">
                    {listing.size_sf.toLocaleString()} SF
                  </TableCell>
                  <TableCell className="text-sm">
                    {listing.availability_date || 'TBD'}
                  </TableCell>
                  <TableCell className="text-center">
                    {listing.include_in_issue ? (
                      <Badge className="bg-success/10 text-success border-0">Yes</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">No</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
