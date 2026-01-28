import { useState, useMemo } from 'react';
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
import { useQuery } from '@tanstack/react-query';

interface PositionComboboxProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function PositionCombobox({ value, onChange, className }: PositionComboboxProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [localPositions, setLocalPositions] = useState<string[]>([]);

  // Fetch unique positions from database
  const { data: dbPositions = [] } = useQuery({
    queryKey: ['recipient_positions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('distribution_recipients')
        .select('title')
        .not('title', 'is', null)
        .not('title', 'eq', '');

      if (error) throw error;
      
      // Get unique values and sort alphabetically
      const unique = [...new Set(data?.map(d => d.title).filter(Boolean) as string[])];
      unique.sort((a, b) => a.localeCompare(b));
      return unique;
    },
  });

  // Combine database positions with locally added ones
  const positions = useMemo(() => {
    const combined = [...new Set([...dbPositions, ...localPositions])];
    combined.sort((a, b) => a.localeCompare(b));
    return combined;
  }, [dbPositions, localPositions]);

  // Check if input value is a new entry
  const isNewEntry = useMemo(() => {
    if (!inputValue.trim()) return false;
    return !positions.some(p => p.toLowerCase() === inputValue.toLowerCase());
  }, [inputValue, positions]);

  // Filter positions based on input
  const filteredPositions = useMemo(() => {
    if (!inputValue.trim()) return positions;
    return positions.filter(p => 
      p.toLowerCase().includes(inputValue.toLowerCase())
    );
  }, [positions, inputValue]);

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setOpen(false);
    setInputValue('');
  };

  const handleAddNew = () => {
    const newValue = inputValue.trim();
    if (newValue) {
      setLocalPositions(prev => [...prev, newValue]);
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
          {value || <span className="text-muted-foreground/50">e.g., Vice President</span>}
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
            placeholder="Search or add position..." 
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList
            className="max-h-[240px] overflow-y-auto"
            onWheelCapture={(e) => e.stopPropagation()}
          >
            <CommandEmpty className="py-2 px-4 text-sm text-muted-foreground">
              No positions found.
            </CommandEmpty>
            {filteredPositions.length > 0 && (
              <CommandGroup heading="Positions">
                {filteredPositions.map((position) => (
                  <CommandItem
                    key={position}
                    value={position}
                    onSelect={() => handleSelect(position)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === position ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {position}
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
