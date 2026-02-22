import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, ArrowRight, Calendar, ChevronRight } from 'lucide-react';
import { useProspects } from '@/hooks/useProspects';
import { useAllDealImportantDates } from '@/hooks/useAllDealImportantDates';
import { parseISO, isBefore, isAfter, addDays, format, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';

type TimeFilter = 'overdue' | '7days' | '30days';

interface ActionItem {
  id: string;
  entityId: string;
  source: 'prospect' | 'deal';
  type: 'follow-up' | 'closing' | 'condition' | 'deposit' | 'action';
  title: string;
  date: Date;
  dateStr: string;
  linkPath: string;
}

const TYPE_VARIANT: Record<ActionItem['type'], 'default' | 'secondary' | 'warning' | 'destructive' | 'outline'> = {
  'follow-up': 'secondary',
  closing: 'destructive',
  condition: 'warning',
  deposit: 'default',
  action: 'outline',
};

const TYPE_LABEL: Record<ActionItem['type'], string> = {
  'follow-up': 'Follow-up',
  closing: 'Closing',
  condition: 'Condition',
  deposit: 'Deposit',
  action: 'Action',
};

export function CRENextActionsPanel() {
  const [filter, setFilter] = React.useState<TimeFilter>('overdue');
  const navigate = useNavigate();

  const { data: prospects, isLoading: prospectsLoading } = useProspects();
  const { data: dealDates = [], isLoading: datesLoading } = useAllDealImportantDates(365);

  const isLoading = prospectsLoading || datesLoading;

  const items = React.useMemo(() => {
    const today = startOfDay(new Date());
    const end7 = addDays(today, 7);
    const end30 = addDays(today, 30);
    const result: ActionItem[] = [];

    // Prospect follow-ups
    prospects?.forEach((p) => {
      if (!p.follow_up_date || p.status === 'Closed' || p.status === 'Lost') return;
      const d = parseISO(p.follow_up_date);
      const isOverdue = isBefore(d, today);
      const inNext7 = !isOverdue && isBefore(d, end7);
      const inNext30 = !isOverdue && isBefore(d, end30);

      if (
        (filter === 'overdue' && isOverdue) ||
        (filter === '7days' && (isOverdue || inNext7)) ||
        (filter === '30days' && (isOverdue || inNext30))
      ) {
        result.push({
          id: `prospect-${p.id}`,
          entityId: p.id,
          source: 'prospect',
          type: 'follow-up',
          title: p.name,
          date: d,
          dateStr: p.follow_up_date,
          linkPath: `/prospects/${p.id}`,
        });
      }
    });

    // Deal important dates
    dealDates.forEach((dd) => {
      const d = parseISO(dd.date);
      const isOverdue = isBefore(d, today);
      const inNext7 = !isOverdue && isBefore(d, end7);
      const inNext30 = !isOverdue && isBefore(d, end30);

      if (
        (filter === 'overdue' && isOverdue) ||
        (filter === '7days' && (isOverdue || inNext7)) ||
        (filter === '30days' && (isOverdue || inNext30))
      ) {
        result.push({
          id: dd.id,
          entityId: dd.dealId,
          source: 'deal',
          type: dd.type,
          title: dd.dealAddress,
          date: d,
          dateStr: dd.date,
          linkPath: `/deals/${dd.dealId}`,
        });
      }
    });

    // Sort: overdue (oldest first), then upcoming (soonest first)
    result.sort((a, b) => a.date.getTime() - b.date.getTime());
    return result;
  }, [prospects, dealDates, filter]);

  const overdueCount = React.useMemo(() => {
    const today = startOfDay(new Date());
    let count = 0;
    prospects?.forEach((p) => {
      if (p.follow_up_date && p.status !== 'Closed' && p.status !== 'Lost' && isBefore(parseISO(p.follow_up_date), today)) count++;
    });
    dealDates.forEach((dd) => {
      if (isBefore(parseISO(dd.date), today)) count++;
    });
    return count;
  }, [prospects, dealDates]);

  const today = startOfDay(new Date());

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-3">
        <CardTitle className="text-lg font-bold">My Next Actions</CardTitle>
        <ToggleGroup
          type="single"
          value={filter}
          onValueChange={(v) => v && setFilter(v as TimeFilter)}
          size="sm"
        >
          <ToggleGroupItem value="overdue" className="text-xs gap-1">
            Overdue
            {overdueCount > 0 && (
              <span className="ml-1 inline-flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold h-5 min-w-5 px-1">
                {overdueCount}
              </span>
            )}
          </ToggleGroupItem>
          <ToggleGroupItem value="7days" className="text-xs">Next 7 days</ToggleGroupItem>
          <ToggleGroupItem value="30days" className="text-xs">Next 30 days</ToggleGroupItem>
        </ToggleGroup>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-sm">
            <Calendar className="h-8 w-8 mb-2 opacity-50" />
            <p>No {filter === 'overdue' ? 'overdue' : 'upcoming'} action items</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item) => {
              const isOverdue = isBefore(item.date, today);
              return (
                <li
                  key={item.id}
                  className="flex items-center gap-3 py-2.5 px-1 cursor-pointer hover:bg-muted/50 rounded-md transition-colors group"
                  onClick={() => navigate(item.linkPath)}
                >
                  {isOverdue && <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />}
                  <Badge variant={TYPE_VARIANT[item.type]} className="shrink-0 text-[10px] py-0.5 px-2">
                    {TYPE_LABEL[item.type]}
                  </Badge>
                  <span className={cn('flex-1 text-sm font-medium truncate', isOverdue && 'text-destructive')}>
                    {item.title}
                  </span>
                  <span className={cn('text-xs text-muted-foreground whitespace-nowrap', isOverdue && 'text-destructive font-semibold')}>
                    {format(item.date, 'MMM d, yyyy')}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
          <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => navigate('/prospects')}>
            View all prospects <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
          <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => navigate('/cre-tracker?tab=deals')}>
            View all deals <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
