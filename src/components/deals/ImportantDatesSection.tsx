import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, AlertCircle } from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/format';
import { differenceInDays, parseISO, isPast } from 'date-fns';
import type { Deal } from '@/types/database';

interface ImportantDatesSectionProps {
  deal: Deal;
}

interface ImportantDate {
  label: string;
  date: string;
  value?: number;
  isPast: boolean;
  daysUntil: number;
}

export function ImportantDatesSection({ deal }: ImportantDatesSectionProps) {
  const today = new Date();
  
  const dates: ImportantDate[] = [];

  if (deal.close_date) {
    const closeDate = parseISO(deal.close_date);
    dates.push({
      label: 'Close Date',
      date: deal.close_date,
      isPast: isPast(closeDate),
      daysUntil: differenceInDays(closeDate, today),
    });
  }

  if (deal.deposit_due_date) {
    const depositDate = parseISO(deal.deposit_due_date);
    dates.push({
      label: 'Deposit Due',
      date: deal.deposit_due_date,
      value: deal.deposit_amount ?? undefined,
      isPast: isPast(depositDate),
      daysUntil: differenceInDays(depositDate, today),
    });
  }

  if (dates.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Important Dates
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {dates.map((item, index) => (
            <div
              key={index}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                item.isPast && deal.status !== 'Closed' 
                  ? 'bg-destructive/10 border-destructive/30' 
                  : item.daysUntil <= 7 
                    ? 'bg-yellow-50 border-yellow-200' 
                    : 'bg-muted/50'
              }`}
            >
              <div className="flex items-center gap-3">
                {item.isPast && deal.status !== 'Closed' && (
                  <AlertCircle className="w-4 h-4 text-destructive" />
                )}
                <div>
                  <p className="font-medium">{item.label}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(item.date)}
                    {item.value && ` • ${formatCurrency(item.value)}`}
                  </p>
                </div>
              </div>
              <Badge variant={item.isPast ? 'destructive' : item.daysUntil <= 7 ? 'secondary' : 'outline'}>
                {item.isPast 
                  ? 'Overdue' 
                  : item.daysUntil === 0 
                    ? 'Today' 
                    : `${item.daysUntil} days`
                }
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
