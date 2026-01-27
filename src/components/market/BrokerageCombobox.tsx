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

interface BrokerageComboboxProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function BrokerageCombobox({ value, onChange, className }: BrokerageComboboxProps) {
  const [open, setOpen] = useState(false);
  const [brokerages, setBrokerages] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');

  // Fetch unique brokerages from database
  useEffect(() => {
    const fetchBrokerages = async () => {
      const { data, error } = await supabase
        .from('market_listings')
        .select('broker_source')
        .not('broker_source', 'is', null)
        .not('broker_source', 'eq', '');

      if (!error && data) {
        // Get unique values and sort alphabetically
        const unique = [...new Set(data.map(d => d.broker_source).filter(Boolean))] as string[];
        unique.sort((a, b) => a.localeCompare(b));
        setBrokerages(unique);
      }
    };

    fetchBrokerages();
  }, []);

  // Check if input value is a new entry (not in existing list)
  const isNewEntry = useMemo(() => {
    if (!inputValue.trim()) return false;
    return !brokerages.some(b => b.toLowerCase() === inputValue.toLowerCase());
  }, [inputValue, brokerages]);

  // Filter brokerages based on input
  const filteredBrokerages = useMemo(() => {
    if (!inputValue.trim()) return brokerages;
    return brokerages.filter(b => 
      b.toLowerCase().includes(inputValue.toLowerCase())
    );
  }, [brokerages, inputValue]);

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setOpen(false);
    setInputValue('');
  };

  const handleAddNew = () => {
    const newValue = inputValue.trim();
    if (newValue) {
      // Add to local list for immediate display
      setBrokerages(prev => {
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
          {value || <span className="text-muted-foreground/50">e.g., CBRE</span>}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 z-50 bg-popover" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Search or add brokerage..." 
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            <CommandEmpty className="py-2 px-4 text-sm text-muted-foreground">
              No brokerages found.
            </CommandEmpty>
            {filteredBrokerages.length > 0 && (
              <CommandGroup heading="Brokerages">
                {filteredBrokerages.map((brokerage) => (
                  <CommandItem
                    key={brokerage}
                    value={brokerage}
                    onSelect={() => handleSelect(brokerage)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === brokerage ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {brokerage}
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
