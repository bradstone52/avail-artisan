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

// Default city options
const DEFAULT_CITIES = [
  'Calgary',
  'Rocky View County',
  'Foothills County',
  'Wheatland County',
];

interface CityComboboxProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function CityCombobox({ 
  value, 
  onChange, 
  className, 
  placeholder = 'Select city',
  disabled = false,
}: CityComboboxProps) {
  const [open, setOpen] = useState(false);
  const [cities, setCities] = useState<string[]>(DEFAULT_CITIES);
  const [inputValue, setInputValue] = useState('');

  // Check if input value is a new entry (not in existing list)
  const isNewEntry = useMemo(() => {
    if (!inputValue.trim()) return false;
    return !cities.some(c => c.toLowerCase() === inputValue.toLowerCase());
  }, [inputValue, cities]);

  // Filter cities based on input
  const filteredCities = useMemo(() => {
    if (!inputValue.trim()) return cities;
    return cities.filter(c => 
      c.toLowerCase().includes(inputValue.toLowerCase())
    );
  }, [cities, inputValue]);

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setOpen(false);
    setInputValue('');
  };

  const handleAddNew = () => {
    const newValue = inputValue.trim();
    if (newValue) {
      // Add to local list for immediate display
      setCities(prev => {
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
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            value ? "input-filled" : "",
            className
          )}
        >
          {value || <span className="text-muted-foreground/50">{placeholder}</span>}
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
            placeholder="Search or add city..." 
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList
            className="max-h-[240px] overflow-y-auto"
            onWheelCapture={(e) => e.stopPropagation()}
          >
            <CommandEmpty className="py-2 px-4 text-sm text-muted-foreground">
              No cities found.
            </CommandEmpty>
            {filteredCities.length > 0 && (
              <CommandGroup heading="Cities">
                {filteredCities.map((city) => (
                  <CommandItem
                    key={city}
                    value={city}
                    onSelect={() => handleSelect(city)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === city ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {city}
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
