import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useMarketListings, MarketListing } from '@/hooks/useMarketListings';

interface ListingComboboxProps {
  value: string | null;
  onChange: (listing: MarketListing | null) => void;
  className?: string;
}

export function ListingCombobox({ value, onChange, className }: ListingComboboxProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const { listings, loading } = useMarketListings();

  // Filter to active and under contract listings
  const activeListings = useMemo(() => {
    return listings.filter(l => l.status === 'Active' || l.status === 'Under Contract');
  }, [listings]);

  // Find selected listing
  const selectedListing = useMemo(() => {
    if (!value) return null;
    return activeListings.find(l => l.id === value) || null;
  }, [value, activeListings]);

  // Filter listings based on input
  const filteredListings = useMemo(() => {
    if (!inputValue.trim()) return activeListings;
    const search = inputValue.toLowerCase();
    return activeListings.filter(l => 
      l.address.toLowerCase().includes(search) ||
      l.city.toLowerCase().includes(search) ||
      l.submarket.toLowerCase().includes(search) ||
      l.listing_id.toLowerCase().includes(search)
    );
  }, [activeListings, inputValue]);

  const handleSelect = (listingId: string) => {
    const listing = activeListings.find(l => l.id === listingId) || null;
    onChange(listing);
    setOpen(false);
    setInputValue('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  const displayValue = selectedListing 
    ? `${selectedListing.address}, ${selectedListing.city}`
    : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal",
            selectedListing ? "input-filled" : "",
            className
          )}
        >
          <span className={cn("truncate", !displayValue && "text-muted-foreground/50")}>
            {displayValue || "Select a listing..."}
          </span>
          <div className="flex items-center gap-1 ml-2">
            {selectedListing && (
              <X 
                className="h-4 w-4 opacity-50 hover:opacity-100" 
                onClick={handleClear}
              />
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[400px] p-0 z-50 bg-popover"
        align="start"
        onWheelCapture={(e) => e.stopPropagation()}
        onTouchMoveCapture={(e) => e.stopPropagation()}
      >
        <Command shouldFilter={false} onWheelCapture={(e) => e.stopPropagation()}>
          <CommandInput 
            placeholder="Search by address, city, or submarket..." 
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList
            className="max-h-[300px] overflow-y-auto"
            onWheelCapture={(e) => e.stopPropagation()}
          >
            {loading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Loading listings...
              </div>
            ) : (
              <>
                <CommandEmpty className="py-2 px-4 text-sm text-muted-foreground">
                  No active or under contract listings found.
                </CommandEmpty>
                {filteredListings.length > 0 && (
                  <CommandGroup heading="Active & Under Contract Listings">
                    {filteredListings.map((listing) => (
                      <CommandItem
                        key={listing.id}
                        value={listing.id}
                        onSelect={() => handleSelect(listing.id)}
                        className="flex flex-col items-start py-2"
                      >
                        <div className="flex items-center w-full">
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4 shrink-0",
                              value === listing.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{listing.address}</div>
                            <div className="text-xs text-muted-foreground">
                              {listing.city} • {listing.submarket} • {listing.size_sf.toLocaleString()} SF
                            </div>
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
