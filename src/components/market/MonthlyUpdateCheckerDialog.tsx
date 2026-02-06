import { useMemo } from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useBrokerageUpdateChecks } from '@/hooks/useBrokerageUpdateChecks';
import type { MarketListing } from '@/hooks/useMarketListings';

interface MonthlyUpdateCheckerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listings: MarketListing[];
}

export function MonthlyUpdateCheckerDialog({ open, onOpenChange, listings }: MonthlyUpdateCheckerDialogProps) {
  // Get unique brokerage names from broker_source field
  const brokerageNames = useMemo(() => {
    const names = new Set<string>();
    for (const l of listings) {
      if (l.broker_source && l.broker_source.trim()) {
        names.add(l.broker_source.trim());
      }
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [listings]);

  const { checkMap, isLoading, toggleCheck, currentMonth, currentYear } = useBrokerageUpdateChecks(brokerageNames);

  const checkedCount = brokerageNames.filter(n => checkMap.get(n)).length;
  const monthLabel = format(new Date(currentYear, currentMonth - 1), 'MMMM yyyy');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Monthly Update Checker
          </DialogTitle>
          <DialogDescription className="flex items-center justify-between">
            <span>{monthLabel}</span>
            <Badge variant={checkedCount === brokerageNames.length ? 'default' : 'secondary'}>
              {checkedCount} / {brokerageNames.length}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {isLoading ? (
            <p className="text-sm text-muted-foreground p-4">Loading...</p>
          ) : brokerageNames.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4">No brokerages found in listings.</p>
          ) : (
            <div className="space-y-1 p-1">
              {brokerageNames.map((name) => {
                const isChecked = checkMap.get(name) ?? false;
                return (
                  <label
                    key={name}
                    className="flex items-center gap-3 px-3 py-2 rounded-sm hover:bg-muted cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={(checked) => {
                        toggleCheck.mutate({ brokerageName: name, checked: !!checked });
                      }}
                      disabled={toggleCheck.isPending}
                    />
                    <span className={`text-sm ${isChecked ? 'line-through text-muted-foreground' : ''}`}>
                      {name}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
