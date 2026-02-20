import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Link } from 'react-router-dom';
import { format, isSameDay, addDays, parseISO } from 'date-fns';

export interface CalendarEvent {
  date: Date;
  type: 'closing' | 'deposit' | 'condition' | 'action' | 'prospect';
  label: string;
  sublabel?: string | null;
  id: string;
  linkPath: string;
}

interface CRECalendarSectionProps {
  calendarDates: CalendarEvent[];
}

function getEventColor(type: string) {
  switch (type) {
    case 'closing': return 'bg-primary';
    case 'deposit': return 'bg-yellow-500';
    case 'condition': return 'bg-orange-500';
    case 'action': return 'bg-blue-500';
    case 'prospect': return 'bg-accent';
    default: return 'bg-secondary';
  }
}

export function CRECalendarSection({ calendarDates }: CRECalendarSectionProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(undefined);
  const [displayedMonth, setDisplayedMonth] = React.useState<Date>(new Date());

  const today = new Date();
  const thirtyDaysFromNow = addDays(today, 30);
  const isCurrentMonth = displayedMonth.getMonth() === today.getMonth() && displayedMonth.getFullYear() === today.getFullYear();

  const displayedMonthEvents = calendarDates
    .filter(d => d.date.getMonth() === displayedMonth.getMonth() && d.date.getFullYear() === displayedMonth.getFullYear())
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const next30DaysEvents = calendarDates
    .filter(d => d.date >= today && d.date <= thirtyDaysFromNow)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const nextUpcomingEvent = next30DaysEvents.length === 0
    ? calendarDates.filter(d => d.date >= today).sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 1)
    : [];

  const upcomingEvents = isCurrentMonth
    ? (next30DaysEvents.length > 0 ? next30DaysEvents : nextUpcomingEvent)
    : displayedMonthEvents;

  const eventsOnSelectedDate = selectedDate
    ? calendarDates.filter(d => isSameDay(d.date, selectedDate))
    : [];

  const closingDates = calendarDates.filter(d => d.type === 'closing').map(d => d.date);
  const depositDates = calendarDates.filter(d => d.type === 'deposit').map(d => d.date);
  const conditionDates = calendarDates.filter(d => d.type === 'condition').map(d => d.date);
  const actionDates = calendarDates.filter(d => d.type === 'action').map(d => d.date);
  const prospectDates = calendarDates.filter(d => d.type === 'prospect').map(d => d.date);

  return (
    <Card className="border-2 border-foreground">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5" />
          Important Dates
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex justify-center">
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={(date) => setSelectedDate(date === selectedDate ? undefined : date)}
              modifiers={{
                closing: closingDates,
                deposit: depositDates,
                condition: conditionDates,
                action: actionDates,
                prospect: prospectDates,
              }}
              modifiersClassNames={{
                closing: 'bg-primary text-primary-foreground font-bold',
                deposit: 'bg-yellow-500 text-white font-bold',
                condition: 'bg-orange-500 text-white font-bold',
                action: 'bg-blue-500 text-white font-bold',
                prospect: 'bg-accent text-accent-foreground font-bold',
              }}
              className="pointer-events-auto"
              month={displayedMonth}
              onMonthChange={setDisplayedMonth}
            />
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-3">
              {([
                { type: 'closing', label: 'Closing' },
                { type: 'deposit', label: 'Deposit' },
                { type: 'condition', label: 'Condition' },
                { type: 'action', label: 'Action' },
                { type: 'prospect', label: 'Follow-up' },
              ] as const).map(item => (
                <div key={item.type} className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${getEventColor(item.type)}`} />
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold">
                {selectedDate
                  ? format(selectedDate, 'MMMM d, yyyy')
                  : isCurrentMonth
                    ? (next30DaysEvents.length > 0 ? 'Upcoming (30 days)' : 'Next Upcoming')
                    : format(displayedMonth, 'MMMM yyyy')}
              </h4>
              {selectedDate && (
                <button
                  onClick={() => setSelectedDate(undefined)}
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                >
                  View all
                </button>
              )}
            </div>
            {selectedDate && eventsOnSelectedDate.length === 0 && (
              <p className="text-sm text-muted-foreground">No events on this date</p>
            )}
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {selectedDate
                ? eventsOnSelectedDate.map((event, i) => (
                    <Link
                      key={i}
                      to={event.linkPath}
                      className="flex items-start gap-2 p-2 border-2 border-foreground/20 hover:border-foreground hover:bg-muted/50 transition-all"
                      style={{ borderRadius: 'var(--radius)' }}
                    >
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${getEventColor(event.type)}`} />
                      <div className="min-w-0 flex-1">
                        <span className="text-sm block truncate">{event.label}</span>
                        {event.sublabel && (
                          <span className="text-xs text-muted-foreground block truncate">{event.sublabel}</span>
                        )}
                      </div>
                    </Link>
                  ))
                : upcomingEvents.map((event, i) => (
                    <Link
                      key={i}
                      to={event.linkPath}
                      className="flex items-start justify-between p-2 border-2 border-foreground/20 hover:border-foreground hover:bg-muted/50 transition-all"
                      style={{ borderRadius: 'var(--radius)' }}
                    >
                      <div className="flex items-start gap-2 min-w-0 flex-1">
                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${getEventColor(event.type)}`} />
                        <div className="min-w-0 flex-1">
                          <span className="text-sm block truncate">{event.label}</span>
                          {event.sublabel && (
                            <span className="text-xs text-muted-foreground block truncate">{event.sublabel}</span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                        {format(event.date, 'MMM d')}
                      </span>
                    </Link>
                  ))}
              {!selectedDate && upcomingEvents.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {isCurrentMonth ? 'No upcoming dates' : `No dates in ${format(displayedMonth, 'MMMM yyyy')}`}
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
