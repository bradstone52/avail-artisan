import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, AlertCircle } from 'lucide-react';
import { format, isAfter, isBefore, addDays } from 'date-fns';
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

  // Add condition removal dates
  conditions.forEach((c, index) => {
    if (c.due_date && !c.is_satisfied) {
      const date = new Date(c.due_date);
      importantDates.push({
        date,
        label: `Condition ${index + 1}: ${c.description.slice(0, 50)}${c.description.length > 50 ? '...' : ''}`,
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

  // Upcoming dates (next 30 days)
  const thirtyDaysFromNow = addDays(today, 30);
  const upcomingDates = importantDates.filter(d => 
    isAfter(d.date, today) && isBefore(d.date, thirtyDaysFromNow)
  );

  if (importantDates.length === 0) {
    return null;
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
        {upcomingDates.length > 0 && (
          <div className="mb-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
            <h4 className="font-semibold text-sm flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4" />
              Coming Up (Next 30 Days)
            </h4>
            <div className="space-y-2">
              {upcomingDates.map((d, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span>{d.label}</span>
                  <span className="font-medium">{format(d.date, 'MMM d, yyyy')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          {importantDates.map((d, i) => (
            <div 
              key={i} 
              className={`flex items-center justify-between text-sm p-2 rounded ${
                d.isPast ? 'bg-destructive/10 text-destructive' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                {d.isPast && <AlertCircle className="w-4 h-4" />}
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  d.type === 'condition' ? 'bg-blue-100 text-blue-700' :
                  d.type === 'deposit' ? 'bg-green-100 text-green-700' :
                  'bg-purple-100 text-purple-700'
                }`}>
                  {d.type === 'condition' ? 'Condition' : d.type === 'deposit' ? 'Deposit' : 'Closing'}
                </span>
                <span>{d.label}</span>
              </div>
              <span className="font-medium">{format(d.date, 'MMM d, yyyy')}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
