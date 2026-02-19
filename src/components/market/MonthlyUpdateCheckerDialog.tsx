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

const PRIORITY_BROKERAGES = new Set([
  'avison young', 'barclay street', 'cbre', 'cdn global', 'colliers',
  'clearview', 'cushman & wakefield', 'jll', 'lee & associates', 'nai',
]);

const PRIORITY_LANDLORDS = new Set([
  'anthem', 'bentall green oak', 'charger logistics', 'gwl realty advisors',
  'hopewell', 'pannatoni', 'quadreal', 'remington',
]);

const isPriority = (name: string, set: Set<string>) => {
  const lower = name.toLowerCase();
  return Array.from(set).some(p => lower.includes(p) || p.includes(lower));
};

export function MonthlyUpdateCheckerDialog({ open, onOpenChange, listings }: MonthlyUpdateCheckerDialogProps) {
  const brokerageNames = useMemo(() => {
    const names = new Set<string>();
    for (const l of listings) {
      if (l.broker_source && l.broker_source.trim()) {
        names.add(l.broker_source.trim());
      }
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [listings]);

  const landlordNames = useMemo(() => {
    const names = new Set<string>();
    for (const l of listings) {
      if (l.landlord && l.landlord.trim()) {
        names.add(l.landlord.trim());
      }
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  }, [listings]);

  const allNames = useMemo(() => [...brokerageNames, ...landlordNames], [brokerageNames, landlordNames]);

  const { brokerageCheckMap, landlordCheckMap, isLoading, toggleCheck, currentMonth, currentYear } = useBrokerageUpdateChecks(allNames);

  const brokerageCheckedCount = brokerageNames.filter(n => brokerageCheckMap.get(n)).length;
  const landlordCheckedCount = landlordNames.filter(n => landlordCheckMap.get(n)).length;
  const monthLabel = format(new Date(currentYear, currentMonth - 1), 'MMMM yyyy');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Monthly Update Checker</DialogTitle>
          <DialogDescription>{monthLabel}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {isLoading ? (
            <p className="text-sm text-muted-foreground p-4">Loading...</p>
          ) : (
            <div className="grid grid-cols-2 gap-6 p-1">
              {/* Brokerages Column */}
              <div>
                <div className="flex items-center justify-between mb-2 px-1">
                  <h3 className="text-sm font-bold uppercase tracking-wider">Brokerages</h3>
                  <Badge variant={brokerageCheckedCount === brokerageNames.length && brokerageNames.length > 0 ? 'default' : 'secondary'} className="text-xs">
                    {brokerageCheckedCount} / {brokerageNames.length}
                  </Badge>
                </div>
                {brokerageNames.length === 0 ? (
                  <p className="text-sm text-muted-foreground px-3">No brokerages found.</p>
                ) : (
                  <div className="space-y-1">
                    {brokerageNames.map((name) => {
                      const isChecked = brokerageCheckMap.get(name) ?? false;
                      return (
                        <label
                          key={name}
                          className="flex items-center gap-3 px-3 py-2 rounded-sm hover:bg-muted cursor-pointer transition-colors"
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={(checked) => {
                              toggleCheck.mutate({ brokerageName: name, checked: !!checked, checkType: 'brokerage' });
                            }}
                            disabled={toggleCheck.isPending}
                          />
                          <span className={`text-sm ${isChecked ? 'line-through text-muted-foreground' : ''} ${isPriority(name, PRIORITY_BROKERAGES) ? 'font-semibold text-primary' : ''}`}>
                            {name}
                            {isPriority(name, PRIORITY_BROKERAGES) && !isChecked && (
                              <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wider text-primary/70">★</span>
                            )}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Landlords Column */}
              <div>
                <div className="flex items-center justify-between mb-2 px-1">
                  <h3 className="text-sm font-bold uppercase tracking-wider">Landlords</h3>
                  <Badge variant={landlordCheckedCount === landlordNames.length && landlordNames.length > 0 ? 'default' : 'secondary'} className="text-xs">
                    {landlordCheckedCount} / {landlordNames.length}
                  </Badge>
                </div>
                {landlordNames.length === 0 ? (
                  <p className="text-sm text-muted-foreground px-3">No landlords found.</p>
                ) : (
                  <div className="space-y-1">
                    {landlordNames.map((name) => {
                      const isChecked = landlordCheckMap.get(name) ?? false;
                      return (
                        <label
                          key={name}
                          className="flex items-center gap-3 px-3 py-2 rounded-sm hover:bg-muted cursor-pointer transition-colors"
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={(checked) => {
                              toggleCheck.mutate({ brokerageName: name, checked: !!checked, checkType: 'landlord' });
                            }}
                            disabled={toggleCheck.isPending}
                          />
                          <span className={`text-sm ${isChecked ? 'line-through text-muted-foreground' : ''} ${isPriority(name, PRIORITY_LANDLORDS) ? 'font-semibold text-primary' : ''}`}>
                            {name}
                            {isPriority(name, PRIORITY_LANDLORDS) && !isChecked && (
                              <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wider text-primary/70">★</span>
                            )}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
