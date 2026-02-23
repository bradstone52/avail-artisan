import { useState, useMemo, useEffect } from 'react';
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
import { supabase } from '@/integrations/supabase/client';

interface PropertyOption {
  id: string;
  address: string;
  city: string;
  submarket: string;
  size_sf: number | null;
}

interface PropertyComboboxProps {
  value: string | null | undefined;
  onChange: (propertyId: string | null) => void;
  className?: string;
}

export function PropertyCombobox({ value, onChange, className }: PropertyComboboxProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchProperties = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('properties')
        .select('id, address, city, submarket, size_sf')
        .order('address', { ascending: true });
      setProperties(data || []);
      setLoading(false);
    };
    fetchProperties();
  }, []);

  const selectedProperty = useMemo(() => {
    if (!value) return null;
    return properties.find(p => p.id === value) || null;
  }, [value, properties]);

  const filteredProperties = useMemo(() => {
    if (!inputValue.trim()) return properties;
    const search = inputValue.toLowerCase();
    return properties.filter(p =>
      p.address.toLowerCase().includes(search) ||
      p.city.toLowerCase().includes(search) ||
      p.submarket.toLowerCase().includes(search)
    );
  }, [properties, inputValue]);

  const handleSelect = (propertyId: string) => {
    onChange(propertyId);
    setOpen(false);
    setInputValue('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  const displayValue = selectedProperty
    ? `${selectedProperty.address}, ${selectedProperty.city}`
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
            selectedProperty ? "input-filled" : "",
            className
          )}
        >
          <span className={cn("truncate", !displayValue && "text-muted-foreground/50")}>
            {displayValue || "Select a property..."}
          </span>
          <div className="flex items-center gap-1 ml-2">
            {selectedProperty && (
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
                Loading properties...
              </div>
            ) : (
              <>
                <CommandEmpty className="py-2 px-4 text-sm text-muted-foreground">
                  No properties found.
                </CommandEmpty>
                {filteredProperties.length > 0 && (
                  <CommandGroup heading="Properties">
                    {filteredProperties.map((property) => (
                      <CommandItem
                        key={property.id}
                        value={property.id}
                        onSelect={() => handleSelect(property.id)}
                        className="flex flex-col items-start py-2"
                      >
                        <div className="flex items-center w-full">
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4 shrink-0",
                              value === property.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{property.address}</div>
                            <div className="text-xs text-muted-foreground">
                              {property.city} • {property.submarket}
                              {property.size_sf ? ` • ${property.size_sf.toLocaleString()} SF` : ''}
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
