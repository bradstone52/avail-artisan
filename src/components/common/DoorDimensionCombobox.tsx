import { useState, useMemo, useEffect, createContext, useContext, useCallback } from 'react';
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

// --- Shared context so sibling comboboxes see newly-added dimensions ---

interface DoorDimensionContextValue {
  allDimensions: string[];
  addDimension: (dim: string) => void;
}

const DoorDimensionContext = createContext<DoorDimensionContextValue | null>(null);

export function DoorDimensionProvider({ children }: { children: React.ReactNode }) {
  const [dbDimensions, setDbDimensions] = useState<string[]>([]);
  const [localAdditions, setLocalAdditions] = useState<string[]>([]);

  useEffect(() => {
    async function fetchDimensions() {
      const dimensions = new Set<string>();

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

      setDbDimensions(Array.from(dimensions).sort((a, b) => a.localeCompare(b)));
    }

    fetchDimensions();
  }, []);

  const allDimensions = useMemo(() => {
    const combined = new Set([...dbDimensions, ...localAdditions]);
    return Array.from(combined).sort((a, b) => a.localeCompare(b));
  }, [dbDimensions, localAdditions]);

  const addDimension = useCallback((dim: string) => {
    setLocalAdditions((prev) => {
      if (prev.some((d) => d.toLowerCase() === dim.toLowerCase())) return prev;
      return [...prev, dim];
    });
  }, []);

  return (
    <DoorDimensionContext.Provider value={{ allDimensions, addDimension }}>
      {children}
    </DoorDimensionContext.Provider>
  );
}

// --- Individual combobox (uses shared context if available, falls back to standalone) ---

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
  const ctx = useContext(DoorDimensionContext);
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');

  // Standalone fallback if no provider
  const [standaloneDims, setStandaloneDims] = useState<string[]>([]);
  const [standaloneLocal, setStandaloneLocal] = useState<string[]>([]);

  useEffect(() => {
    if (ctx) return; // skip if using provider
    async function fetchDimensions() {
      const dimensions = new Set<string>();
      const [marketRes, propertyRes, internalRes] = await Promise.all([
        supabase.from('market_listings').select('drive_in_door_dimensions').not('drive_in_door_dimensions', 'is', null),
        supabase.from('properties').select('drive_in_door_dimensions').not('drive_in_door_dimensions', 'is', null),
        supabase.from('internal_listings').select('drive_in_door_dimensions').not('drive_in_door_dimensions', 'is', null),
      ]);
      const extractDims = (data: any[] | null) => {
        if (!data) return;
        for (const row of data) {
          const dims = row.drive_in_door_dimensions;
          if (Array.isArray(dims)) {
            for (const d of dims) {
              if (typeof d === 'string' && d.trim()) dimensions.add(d.trim());
            }
          }
        }
      };
      extractDims(marketRes.data);
      extractDims(propertyRes.data);
      extractDims(internalRes.data);
      setStandaloneDims(Array.from(dimensions).sort((a, b) => a.localeCompare(b)));
    }
    fetchDimensions();
  }, [ctx]);

  const allDimensions = ctx
    ? ctx.allDimensions
    : [...new Set([...standaloneDims, ...standaloneLocal])].sort((a, b) => a.localeCompare(b));

  const addDimension = ctx
    ? ctx.addDimension
    : (dim: string) => setStandaloneLocal((prev) => [...prev, dim]);

  const isNewEntry = useMemo(() => {
    if (!inputValue.trim()) return false;
    return !allDimensions.some((d) => d.toLowerCase() === inputValue.trim().toLowerCase());
  }, [inputValue, allDimensions]);

  const filteredDimensions = useMemo(() => {
    if (!inputValue.trim()) return allDimensions;
    return allDimensions.filter((d) => d.toLowerCase().includes(inputValue.toLowerCase()));
  }, [allDimensions, inputValue]);

  const handleSelect = (selected: string) => {
    onChange(selected);
    setOpen(false);
    setInputValue('');
  };

  const handleAddNew = () => {
    const newValue = inputValue.trim();
    if (newValue) {
      addDimension(newValue);
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
          {value || <span className="text-muted-foreground/50">{placeholder}</span>}
          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[200px] p-0 z-50 bg-popover"
        align="start"
        onWheelCapture={(e) => e.stopPropagation()}
        onTouchMoveCapture={(e) => e.stopPropagation()}
      >
        <Command shouldFilter={false} onWheelCapture={(e) => e.stopPropagation()}>
          <CommandInput placeholder="Search or add..." value={inputValue} onValueChange={setInputValue} />
          <CommandList className="max-h-[200px] overflow-y-auto" onWheelCapture={(e) => e.stopPropagation()}>
            <CommandEmpty className="py-2 px-4 text-sm text-muted-foreground">No dimensions found.</CommandEmpty>
            {filteredDimensions.length > 0 && (
              <CommandGroup heading="Previous">
                {filteredDimensions.map((dim) => (
                  <CommandItem key={dim} value={dim} onSelect={() => handleSelect(dim)}>
                    <Check className={cn('mr-2 h-4 w-4', value === dim ? 'opacity-100' : 'opacity-0')} />
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