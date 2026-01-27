import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDealsClosingInNext30Days } from '@/hooks/useDeals';
import { useUpcomingFollowUps } from '@/hooks/useUpcomingFollowUps';
import { formatDate } from '@/lib/format';
import { differenceInDays, parseISO } from 'date-fns';

export function CRMImportantDatesSection() {
  const navigate = useNavigate();
  const closingDeals = useDealsClosingInNext30Days();
  const followUps = useUpcomingFollowUps(7);

  const allDates = [
    ...closingDeals.map(deal => ({
      id: deal.id,
      type: 'deal' as const,
      label: 'Close Date',
      name: deal.address,
      date: deal.close_date!,
      status: deal.status,
    })),
    ...followUps.map(item => ({
      id: item.id,
      type: item.type,
      label: item.type === 'deal' ? 'Deal Follow-up' : 'Prospect Follow-up',
      name: item.name,
      date: item.date,
      status: item.status,
    })),
  ].sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());

  const today = new Date();

  if (allDates.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Upcoming Dates
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {allDates.slice(0, 5).map((item) => {
            const daysUntil = differenceInDays(parseISO(item.date), today);
            const isUrgent = daysUntil <= 3;

            return (
              <div
                key={`${item.type}-${item.id}`}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted ${
                  isUrgent ? 'bg-yellow-50 border-yellow-200' : 'bg-muted/50'
                }`}
                onClick={() => navigate(`/${item.type}s/${item.id}`)}
              >
                <div className="flex items-center gap-3">
                  {isUrgent && <AlertCircle className="w-4 h-4 text-yellow-600" />}
                  <div>
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.label} • {formatDate(item.date)}
                    </p>
                  </div>
                </div>
                <Badge variant={isUrgent ? 'secondary' : 'outline'}>
                  {daysUntil === 0 ? 'Today' : `${daysUntil} days`}
                </Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
