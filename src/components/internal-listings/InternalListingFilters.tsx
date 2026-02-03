import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Filter, X, Search } from 'lucide-react';
import {
  INTERNAL_LISTING_STATUSES,
  PROPERTY_TYPES,
  DEAL_TYPES,
} from '@/hooks/useInternalListings';
import { useAgents } from '@/hooks/useAgents';

export interface ListingFilters {
  search: string;
  status: string;
  propertyType: string;
  dealType: string;
  agentId: string;
  city: string;
  minSize: number | undefined;
  maxSize: number | undefined;
}

interface InternalListingFiltersProps {
  filters: ListingFilters;
  onFiltersChange: (filters: ListingFilters) => void;
}

export function InternalListingFilters({
  filters,
  onFiltersChange,
}: InternalListingFiltersProps) {
  const { data: agents = [] } = useAgents();
  const [isOpen, setIsOpen] = useState(false);

  const activeFilterCount = [
    filters.status,
    filters.propertyType,
    filters.dealType,
    filters.agentId,
    filters.city,
    filters.minSize,
    filters.maxSize,
  ].filter(Boolean).length;

  const clearFilters = () => {
    onFiltersChange({
      search: filters.search,
      status: '',
      propertyType: '',
      dealType: '',
      agentId: '',
      city: '',
      minSize: undefined,
      maxSize: undefined,
    });
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search address, city..."
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="pl-9"
        />
      </div>

      {/* Quick Status Filter */}
      <Select
        value={filters.status}
        onValueChange={(value) => onFiltersChange({ ...filters, status: value })}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="All Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All Status</SelectItem>
          {INTERNAL_LISTING_STATUSES.map((status) => (
            <SelectItem key={status} value={status}>
              {status}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Advanced Filters Popover */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Filters</h4>
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-auto py-1 px-2 text-xs"
                >
                  Clear all
                </Button>
              )}
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Property Type</Label>
                <Select
                  value={filters.propertyType}
                  onValueChange={(value) =>
                    onFiltersChange({ ...filters, propertyType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any type</SelectItem>
                    {PROPERTY_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Deal Type</Label>
                <Select
                  value={filters.dealType}
                  onValueChange={(value) =>
                    onFiltersChange({ ...filters, dealType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any deal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any deal</SelectItem>
                    {DEAL_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Assigned Agent</Label>
                <Select
                  value={filters.agentId}
                  onValueChange={(value) =>
                    onFiltersChange({ ...filters, agentId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any agent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any agent</SelectItem>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">City</Label>
                <Input
                  placeholder="Filter by city"
                  value={filters.city}
                  onChange={(e) =>
                    onFiltersChange({ ...filters, city: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Size Range (SF)</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={filters.minSize || ''}
                    onChange={(e) =>
                      onFiltersChange({
                        ...filters,
                        minSize: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    value={filters.maxSize || ''}
                    onChange={(e) =>
                      onFiltersChange({
                        ...filters,
                        maxSize: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Active filter badges */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-1.5 items-center">
          {filters.propertyType && (
            <Badge variant="secondary" className="gap-1">
              {filters.propertyType}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onFiltersChange({ ...filters, propertyType: '' })}
              />
            </Badge>
          )}
          {filters.dealType && (
            <Badge variant="secondary" className="gap-1">
              {filters.dealType}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onFiltersChange({ ...filters, dealType: '' })}
              />
            </Badge>
          )}
          {filters.agentId && (
            <Badge variant="secondary" className="gap-1">
              {agents.find((a) => a.id === filters.agentId)?.name || 'Agent'}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onFiltersChange({ ...filters, agentId: '' })}
              />
            </Badge>
          )}
          {filters.city && (
            <Badge variant="secondary" className="gap-1">
              {filters.city}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => onFiltersChange({ ...filters, city: '' })}
              />
            </Badge>
          )}
          {(filters.minSize || filters.maxSize) && (
            <Badge variant="secondary" className="gap-1">
              {filters.minSize ? `${filters.minSize.toLocaleString()}+` : ''}
              {filters.minSize && filters.maxSize ? ' - ' : ''}
              {filters.maxSize ? `${filters.maxSize.toLocaleString()} SF` : ' SF'}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() =>
                  onFiltersChange({ ...filters, minSize: undefined, maxSize: undefined })
                }
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
