import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useRecipients } from "@/hooks/useRecipients";

const DEFAULT_SCALE_OPTIONS = [
  "< 10,000",
  "10,000 - 20,000",
  "20,000 - 50,000",
  "50,000 - 100,000",
  "> 100,000",
];

interface ScaleComboboxProps {
  value: string;
  onChange: (value: string) => void;
}

export function ScaleCombobox({ value, onChange }: ScaleComboboxProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const { recipients } = useRecipients();

  // Get all scale values (defaults + any custom ones from existing recipients)
  const allScaleOptions = useMemo(() => {
    const options = new Set<string>(DEFAULT_SCALE_OPTIONS);
    recipients.forEach((r) => {
      if (r.scale && !options.has(r.scale)) {
        options.add(r.scale);
      }
    });
    return Array.from(options);
  }, [recipients]);

  const showAddOption = inputValue && 
    !allScaleOptions.some(s => s.toLowerCase() === inputValue.toLowerCase());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-medium h-11"
        >
          {value || "Select scale..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[--radix-popover-trigger-width] p-0 bg-popover z-50" 
        align="start"
        onWheelCapture={(e) => e.stopPropagation()}
      >
        <Command>
          <CommandInput 
            placeholder="Search or add scale..." 
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            <CommandEmpty>
              {inputValue ? "No scale found." : "Type to search or add."}
            </CommandEmpty>
            
            {showAddOption && (
              <CommandGroup>
                <CommandItem
                  value={`add-${inputValue}`}
                  onSelect={() => {
                    onChange(inputValue);
                    setInputValue("");
                    setOpen(false);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add "{inputValue}"
                </CommandItem>
              </CommandGroup>
            )}
            
            <CommandGroup heading="Scale Options">
              {allScaleOptions.map((scale) => (
                <CommandItem
                  key={scale}
                  value={scale}
                  onSelect={() => {
                    onChange(scale);
                    setInputValue("");
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === scale ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {scale}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
