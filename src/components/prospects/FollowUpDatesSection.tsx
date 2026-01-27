import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, AlertCircle } from 'lucide-react';
import { formatDate } from '@/lib/format';
import { differenceInDays, parseISO, isPast } from 'date-fns';
import type { Prospect } from '@/types/prospect';

interface FollowUpDatesSectionProps {
  prospect: Prospect;
}

export function FollowUpDatesSection({ prospect }: FollowUpDatesSectionProps) {
  if (!prospect.follow_up_date) {
    return null;
  }

  const today = new Date();
  const followUpDate = parseISO(prospect.follow_up_date);
  const isPastDate = isPast(followUpDate);
  const daysUntil = differenceInDays(followUpDate, today);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Follow-up Schedule
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className={`flex items-center justify-between p-3 rounded-lg border ${
            isPastDate 
              ? 'bg-destructive/10 border-destructive/30' 
              : daysUntil <= 3 
                ? 'bg-yellow-50 border-yellow-200' 
                : 'bg-muted/50'
          }`}
        >
          <div className="flex items-center gap-3">
            {isPastDate && (
              <AlertCircle className="w-4 h-4 text-destructive" />
            )}
            <div>
              <p className="font-medium">Follow-up Date</p>
              <p className="text-sm text-muted-foreground">
                {formatDate(prospect.follow_up_date)}
              </p>
            </div>
          </div>
          <Badge variant={isPastDate ? 'destructive' : daysUntil <= 3 ? 'secondary' : 'outline'}>
            {isPastDate 
              ? 'Overdue' 
              : daysUntil === 0 
                ? 'Today' 
                : `${daysUntil} days`
            }
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
