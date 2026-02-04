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

interface DocumentNameComboboxProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

// Required and encouraged documents that should always appear as suggestions
const REQUIRED_DOCUMENT_NAMES = [
  'Listing Agreement',
  'Title',
  'Corporate Search',
  'Brochure',
  'Building Plans',
  'Real Property Report',
  'ESA Phase 1',
  'ESA Phase 2',
];

export function DocumentNameCombobox({ 
  value, 
  onChange, 
  className,
  placeholder = "Enter document name..."
}: DocumentNameComboboxProps) {
  const [open, setOpen] = useState(false);
  const [documentNames, setDocumentNames] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');

  // Fetch unique document names from all listings in the org
  useEffect(() => {
    const fetchDocumentNames = async () => {
      const { data, error } = await supabase
        .from('internal_listing_documents')
        .select('name')
        .not('name', 'is', null)
        .not('name', 'eq', '');

      if (!error && data) {
        // Get unique values, merge with required docs, and sort alphabetically
        const fromDb = data.map(d => d.name).filter(Boolean) as string[];
        const merged = [...new Set([...REQUIRED_DOCUMENT_NAMES, ...fromDb])];
        merged.sort((a, b) => a.localeCompare(b));
        setDocumentNames(merged);
      } else {
        // If no db data, still show required documents
        setDocumentNames([...REQUIRED_DOCUMENT_NAMES].sort((a, b) => a.localeCompare(b)));
      }
    };

    fetchDocumentNames();
  }, []);

  // Check if input value is a new entry (not in existing list)
  const isNewEntry = useMemo(() => {
    if (!inputValue.trim()) return false;
    return !documentNames.some(n => n.toLowerCase() === inputValue.toLowerCase());
  }, [inputValue, documentNames]);

  // Filter document names based on input, with required docs shown first
  const filteredNames = useMemo(() => {
    const filtered = inputValue.trim() 
      ? documentNames.filter(n => n.toLowerCase().includes(inputValue.toLowerCase()))
      : documentNames;
    
    // Sort with required docs first
    return filtered.sort((a, b) => {
      const aIsRequired = REQUIRED_DOCUMENT_NAMES.includes(a);
      const bIsRequired = REQUIRED_DOCUMENT_NAMES.includes(b);
      if (aIsRequired && !bIsRequired) return -1;
      if (!aIsRequired && bIsRequired) return 1;
      return a.localeCompare(b);
    });
  }, [documentNames, inputValue]);

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setOpen(false);
    setInputValue('');
  };

  const handleAddNew = () => {
    const newValue = inputValue.trim();
    if (newValue) {
      // Add to local list for immediate display
      setDocumentNames(prev => {
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
            "w-full justify-between font-normal h-10",
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
            placeholder="Search or add document type..." 
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList
            className="max-h-[240px] overflow-y-auto"
            onWheelCapture={(e) => e.stopPropagation()}
          >
            <CommandEmpty className="py-2 px-4 text-sm text-muted-foreground">
              No document names found.
            </CommandEmpty>
            {filteredNames.length > 0 && (
              <CommandGroup heading="Recent Document Names">
                {filteredNames.map((name) => (
                  <CommandItem
                    key={name}
                    value={name}
                    onSelect={() => handleSelect(name)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === name ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {name}
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
