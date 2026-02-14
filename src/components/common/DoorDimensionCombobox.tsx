import { useState, useMemo, useEffect } from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';

interface DoorDimensionComboboxProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

export function DoorDimensionCombobox({
  value,
  onChange,
  className,
  placeholder = "12' x 14'",
}: DoorDimensionComboboxProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [existingDimensions, setExistingDimensions] = useState<string[]>([]);

  // Fetch all previously used dimensions from all three tables on mount
  useEffect(() => {
    async function fetchDimensions() {
      const dimensions = new Set<string>();

      // Query all three tables in parallel
      const [marketRes, propertyRes, internalRes] = await Promise.all([
        supabase
          .from('market_listings')
          .select('drive_in_door_dimensions')
          .not('drive_in_door_dimensions', 'is', null),
        supabase
          .from('properties')
          .select('drive_in_door_dimensions')
          .not('drive_in_door_dimensions', 'is', null),
        supabase
          .from('internal_listings')
          .select('drive_in_door_dimensions')
          .not('drive_in_door_dimensions', 'is', null),
      ]);

      const extractDims = (data: any[] | null) => {
        if (!data) return;
        for (const row of data) {
          const dims = row.drive_in_door_dimensions;
          if (Array.isArray(dims)) {
            for (const d of dims) {
              if (typeof d === 'string' && d.trim()) {
                dimensions.add(d.trim());
              }
            }
          }
        }
      };

      extractDims(marketRes.data);
      extractDims(propertyRes.data);
      extractDims(internalRes.data);

      setExistingDimensions(
        Array.from(dimensions).sort((a, b) => a.localeCompare(b))
      );
    }

    fetchDimensions();
  }, []);

  // Combine existing + local additions
  const [localAdditions, setLocalAdditions] = useState<string[]>([]);
  const allDimensions = useMemo(() => {
    const combined = new Set([...existingDimensions, ...localAdditions]);
    return Array.from(combined).sort((a, b) => a.localeCompare(b));
  }, [existingDimensions, localAdditions]);

  const isNewEntry = useMemo(() => {
    if (!inputValue.trim()) return false;
    return !allDimensions.some(
      (d) => d.toLowerCase() === inputValue.trim().toLowerCase()
    );
  }, [inputValue, allDimensions]);

  const filteredDimensions = useMemo(() => {
    if (!inputValue.trim()) return allDimensions;
    return allDimensions.filter((d) =>
      d.toLowerCase().includes(inputValue.toLowerCase())
    );
  }, [allDimensions, inputValue]);

  const handleSelect = (selected: string) => {
    onChange(selected);
    setOpen(false);
    setInputValue('');
  };

  const handleAddNew = () => {
    const newValue = inputValue.trim();
    if (newValue) {
      setLocalAdditions((prev) => [...prev, newValue]);
      onChange(newValue);
      setOpen(false);
      setInputValue('');
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between font-normal text-sm h-9',
            value ? 'input-filled' : '',
            className
          )}
        >
          {value || (
            <span className="text-muted-foreground/50">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[200px] p-0 z-50 bg-popover"
        align="start"
        onWheelCapture={(e) => e.stopPropagation()}
        onTouchMoveCapture={(e) => e.stopPropagation()}
      >
        <Command
          shouldFilter={false}
          onWheelCapture={(e) => e.stopPropagation()}
        >
          <CommandInput
            placeholder="Search or add..."
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList
            className="max-h-[200px] overflow-y-auto"
            onWheelCapture={(e) => e.stopPropagation()}
          >
            <CommandEmpty className="py-2 px-4 text-sm text-muted-foreground">
              No dimensions found.
            </CommandEmpty>
            {filteredDimensions.length > 0 && (
              <CommandGroup heading="Previous">
                {filteredDimensions.map((dim) => (
                  <CommandItem
                    key={dim}
                    value={dim}
                    onSelect={() => handleSelect(dim)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === dim ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    {dim}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {isNewEntry && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem onSelect={handleAddNew} className="text-primary">
                    <Plus className="mr-2 h-4 w-4" />
                    Add "{inputValue.trim()}"
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
