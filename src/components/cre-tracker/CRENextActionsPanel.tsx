import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, ArrowRight, Calendar, ChevronRight, Filter } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { differenceInCalendarDays, format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { DealImportantDate } from '@/hooks/useAllDealImportantDates';
import type { Prospect } from '@/types/prospect';

type TimeFilter = 'overdue' | '7days' | '30days';
type SourceFilter = 'all' | 'follow-ups' | 'deal-dates';

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

/**
 * Get "today" in America/Edmonton timezone as a plain Date at midnight local.
 * This prevents UTC-boundary off-by-one errors for Mountain Time users.
 */
function getTodayEdmonton(): Date {
  const edmontonStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Edmonton' });
  // edmontonStr is "YYYY-MM-DD"; parse as local date at midnight
  const [y, m, d] = edmontonStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Parse a date-only string "YYYY-MM-DD" as a local date (no timezone shift).
 */
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Produce a human-readable date label.
 * - Overdue: "Overdue by X days" (or "Overdue by 1 day")
 * - Today:  "Due today"
 * - Tomorrow: "Due tomorrow"
 * - Otherwise: "MMM d, yyyy"
 */
function dateLabel(itemDate: Date, today: Date): { text: string; isOverdue: boolean } {
  const diff = differenceInCalendarDays(itemDate, today);
  if (diff < 0) {
    const absDiff = Math.abs(diff);
    return { text: `Overdue by ${absDiff} day${absDiff === 1 ? '' : 's'}`, isOverdue: true };
  }
  if (diff === 0) return { text: 'Due today', isOverdue: false };
  if (diff === 1) return { text: 'Due tomorrow', isOverdue: false };
  return { text: format(itemDate, 'MMM d, yyyy'), isOverdue: false };
}

interface CRENextActionsPanelProps {
  prospects: Prospect[] | undefined;
  dealDates: DealImportantDate[];
  isLoading: boolean;
}

export function CRENextActionsPanel({ prospects, dealDates, isLoading }: CRENextActionsPanelProps) {
  const [timeFilter, setTimeFilter] = React.useState<TimeFilter>('overdue');
  const [sourceFilter, setSourceFilter] = React.useState<SourceFilter>('all');
  const navigate = useNavigate();

  const today = React.useMemo(() => getTodayEdmonton(), []);

  const items = React.useMemo(() => {
    // Inclusive end boundaries: today + 7 days and today + 30 days
    const end7 = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 8);   // < end7 means <= today+7
    const end30 = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 31); // < end30 means <= today+30
    const result: ActionItem[] = [];

    // --- Prospect follow-ups ---
    if (sourceFilter !== 'deal-dates') {
      prospects?.forEach((p) => {
        if (!p.follow_up_date || p.status === 'Closed' || p.status === 'Lost') return;
        const d = parseLocalDate(p.follow_up_date);
        const isOverdue = d < today;
        const inWindow7 = !isOverdue && d < end7;
        const inWindow30 = !isOverdue && d < end30;

        if (
          (timeFilter === 'overdue' && isOverdue) ||
          (timeFilter === '7days' && inWindow7) ||
          (timeFilter === '30days' && inWindow30)
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
    }

    // --- Deal important dates ---
    if (sourceFilter !== 'follow-ups') {
      dealDates.forEach((dd) => {
        const d = parseLocalDate(dd.date);
        const isOverdue = d < today;
        const inWindow7 = !isOverdue && d < end7;
        const inWindow30 = !isOverdue && d < end30;

        if (
          (timeFilter === 'overdue' && isOverdue) ||
          (timeFilter === '7days' && inWindow7) ||
          (timeFilter === '30days' && inWindow30)
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
    }

    /**
     * Sorting rules:
     * - Overdue tab: most overdue first (oldest date first, i.e. ascending by date
     *   so items with the largest "overdue by X days" appear at the top).
     * - Next 7 / Next 30: soonest date first (ascending).
     * Both use ascending sort; for Overdue this naturally surfaces the most stale items.
     */
    result.sort((a, b) => a.date.getTime() - b.date.getTime());
    return result;
  }, [prospects, dealDates, timeFilter, sourceFilter, today]);

  const overdueCount = React.useMemo(() => {
    let count = 0;
    prospects?.forEach((p) => {
      if (p.follow_up_date && p.status !== 'Closed' && p.status !== 'Lost' && parseLocalDate(p.follow_up_date) < today) count++;
    });
    dealDates.forEach((dd) => {
      if (parseLocalDate(dd.date) < today) count++;
    });
    return count;
  }, [prospects, dealDates, today]);

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 space-y-0 pb-3">
        <div className="flex items-center gap-3">
          <CardTitle className="text-lg font-bold">My Next Actions</CardTitle>
          {/* Source filter — compact dropdown */}
          <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as SourceFilter)}>
            <SelectTrigger className="h-7 w-auto gap-1 text-xs border-foreground/30 px-2 [&>svg]:h-3 [&>svg]:w-3">
              <Filter className="h-3 w-3 shrink-0" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="follow-ups">Follow-ups</SelectItem>
              <SelectItem value="deal-dates">Deal Dates</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <ToggleGroup
          type="single"
          value={timeFilter}
          onValueChange={(v) => v && setTimeFilter(v as TimeFilter)}
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
            <p>No {timeFilter === 'overdue' ? 'overdue' : 'upcoming'} action items</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item) => {
              const label = dateLabel(item.date, today);
              return (
                <li
                  key={item.id}
                  className="flex items-center gap-3 py-2.5 px-1 cursor-pointer hover:bg-muted/50 rounded-md transition-colors group"
                  onClick={() => navigate(item.linkPath)}
                >
                  {label.isOverdue && <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />}
                  <Badge variant={TYPE_VARIANT[item.type]} className="shrink-0 text-[10px] py-0.5 px-2">
                    {TYPE_LABEL[item.type]}
                  </Badge>
                  <span className={cn('flex-1 text-sm font-medium truncate', label.isOverdue && 'text-destructive')}>
                    {item.title}
                  </span>
                  <span className={cn(
                    'text-xs whitespace-nowrap',
                    label.isOverdue
                      ? 'text-destructive font-semibold'
                      : label.text === 'Due today'
                        ? 'text-amber-600 dark:text-amber-400 font-semibold'
                        : 'text-muted-foreground'
                  )}>
                    {label.text}
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
