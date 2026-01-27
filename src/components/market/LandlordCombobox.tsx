import { useState, useEffect, useMemo } from 'react';
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

interface LandlordComboboxProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function LandlordCombobox({ value, onChange, className }: LandlordComboboxProps) {
  const [open, setOpen] = useState(false);
  const [landlords, setLandlords] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');

  // Fetch unique landlords from database
  useEffect(() => {
    const fetchLandlords = async () => {
      const { data, error } = await supabase
        .from('market_listings')
        .select('landlord')
        .not('landlord', 'is', null)
        .not('landlord', 'eq', '');

      if (!error && data) {
        // Get unique values and sort alphabetically
        const unique = [...new Set(data.map(d => d.landlord).filter(Boolean))] as string[];
        unique.sort((a, b) => a.localeCompare(b));
        setLandlords(unique);
      }
    };

    fetchLandlords();
  }, []);

  // Check if input value is a new entry (not in existing list)
  const isNewEntry = useMemo(() => {
    if (!inputValue.trim()) return false;
    return !landlords.some(l => l.toLowerCase() === inputValue.toLowerCase());
  }, [inputValue, landlords]);

  // Filter landlords based on input
  const filteredLandlords = useMemo(() => {
    if (!inputValue.trim()) return landlords;
    return landlords.filter(l => 
      l.toLowerCase().includes(inputValue.toLowerCase())
    );
  }, [landlords, inputValue]);

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setOpen(false);
    setInputValue('');
  };

  const handleAddNew = () => {
    const newValue = inputValue.trim();
    if (newValue) {
      // Add to local list for immediate display
      setLandlords(prev => {
        const updated = [...prev, newValue];
        updated.sort((a, b) => a.localeCompare(b));
        return updated;
      });
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
            "w-full justify-between font-normal",
            value ? "input-filled" : "",
            className
          )}
        >
          {value || <span className="text-muted-foreground/50">e.g., Morguard, Oxford</span>}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[300px] p-0 z-50 bg-popover"
        align="start"
        onWheelCapture={(e) => e.stopPropagation()}
        onTouchMoveCapture={(e) => e.stopPropagation()}
      >
        <Command shouldFilter={false} onWheelCapture={(e) => e.stopPropagation()}>
          <CommandInput 
            placeholder="Search or add landlord..." 
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList
            className="max-h-[240px] overflow-y-auto"
            onWheelCapture={(e) => e.stopPropagation()}
          >
            <CommandEmpty className="py-2 px-4 text-sm text-muted-foreground">
              No landlords found.
            </CommandEmpty>
            {filteredLandlords.length > 0 && (
              <CommandGroup heading="Landlords">
                {filteredLandlords.map((landlord) => (
                  <CommandItem
                    key={landlord}
                    value={landlord}
                    onSelect={() => handleSelect(landlord)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === landlord ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {landlord}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {isNewEntry && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={handleAddNew}
                    className="text-primary"
                  >
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
