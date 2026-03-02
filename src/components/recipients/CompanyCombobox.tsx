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

interface CompanyComboboxProps {
  value: string;
  onChange: (value: string) => void;
}

export function CompanyCombobox({ value, onChange }: CompanyComboboxProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const { recipients } = useRecipients();

  // Get unique company names from existing recipients
  const existingCompanies = useMemo(() => {
    const companies = new Set<string>();
    recipients.forEach((r) => {
      if (r.company_name) {
        companies.add(r.company_name);
      }
    });
    return Array.from(companies).sort((a, b) => 
      a.toLowerCase().localeCompare(b.toLowerCase())
    );
  }, [recipients]);

  const showAddOption = inputValue && 
    !existingCompanies.some(c => c.toLowerCase() === inputValue.toLowerCase());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-medium h-11", value && "bg-primary/10")}
        >
          {value || "Select company..."}
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
            placeholder="Search or add company..." 
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            <CommandEmpty>
              {inputValue ? "No company found." : "Type to search or add."}
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
            
            <CommandGroup heading="Companies">
              {existingCompanies.map((company) => (
                <CommandItem
                  key={company}
                  value={company}
                  onSelect={() => {
                    onChange(company);
                    setInputValue("");
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === company ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {company}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
