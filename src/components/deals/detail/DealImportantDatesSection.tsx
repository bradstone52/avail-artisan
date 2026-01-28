import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, AlertCircle } from 'lucide-react';
import { format, isBefore } from 'date-fns';
import type { Deal } from '@/types/database';
import type { DealCondition } from '@/hooks/useDealConditions';
import type { DealDeposit } from '@/hooks/useDealDeposits';

interface DealImportantDatesSectionProps {
  deal: Deal;
  conditions: DealCondition[];
  deposits: DealDeposit[];
}

export function DealImportantDatesSection({ deal, conditions, deposits }: DealImportantDatesSectionProps) {
  const today = new Date();
  
  // Gather all important dates
  const importantDates: { date: Date; label: string; type: 'condition' | 'deposit' | 'closing'; isPast: boolean }[] = [];

  // Add condition removal dates with new format: "Condition 1 - description - date"
  conditions.forEach((c, index) => {
    if (c.due_date && !c.is_satisfied) {
      const date = new Date(c.due_date);
      importantDates.push({
        date,
        label: `Condition ${index + 1} - ${c.description}`,
        type: 'condition',
        isPast: isBefore(date, today),
      });
    }
  });

  // Add deposit due dates
  deposits.forEach((d) => {
    if (d.due_date && !d.received) {
      const date = new Date(d.due_date);
      importantDates.push({
        date,
        label: `Deposit: $${d.amount.toLocaleString()} ${d.held_by ? `(${d.held_by})` : ''}`,
        type: 'deposit',
        isPast: isBefore(date, today),
      });
    }
  });

  // Add closing date
  if (deal.close_date) {
    const date = new Date(deal.close_date);
    importantDates.push({
      date,
      label: 'Closing Date',
      type: 'closing',
      isPast: isBefore(date, today),
    });
  }

  // Sort by date
  importantDates.sort((a, b) => a.date.getTime() - b.date.getTime());

  if (importantDates.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Important Dates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No important dates. Add conditions or deposits to track important deadlines.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Important Dates
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {importantDates.map((d, i) => (
            <div 
              key={i} 
              className={`flex items-center text-sm p-2 rounded ${
                d.isPast ? 'bg-destructive/10 text-destructive' : ''
              }`}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {d.isPast && <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                <span className="truncate flex-1">{d.label}</span>
                <span className="text-muted-foreground mx-2 flex-shrink-0">—</span>
                <span className="font-medium flex-shrink-0">{format(d.date, 'MMM d, yyyy')}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
