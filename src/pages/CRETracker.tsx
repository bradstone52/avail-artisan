import * as React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, UserSearch, Users, ArrowRight, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDeals, useDealsClosingInNext30Days } from '@/hooks/useDeals';
import { useUpcomingFollowUps } from '@/hooks/useUpcomingFollowUps';
import { format, parseISO, isSameDay } from 'date-fns';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';

export default function CRETracker() {
  const { data: deals = [] } = useDeals();
  const closingDeals = useDealsClosingInNext30Days();
  const upcomingFollowUps = useUpcomingFollowUps(30);

  // Calculate deal stats
  const activeDeals = deals.filter(d => d.status === 'Conditional' || d.status === 'Firm');
  const closedDeals = deals.filter(d => d.status === 'Closed');

  // Collect all important dates for calendar
  const calendarDates = [
    ...closingDeals.map(deal => ({
      date: parseISO(deal.close_date!),
      type: 'deal-close' as const,
      label: `Close: ${deal.address}`,
      id: deal.id,
    })),
    ...upcomingFollowUps.map(item => ({
      date: parseISO(item.date),
      type: item.type as 'deal' | 'prospect',
      label: `Follow-up: ${item.name}`,
      id: item.id,
    })),
  ];

  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(undefined);
  
  const eventsOnSelectedDate = selectedDate
    ? calendarDates.filter(d => isSameDay(d.date, selectedDate))
    : [];

  const sections = [
    {
      title: 'Deals',
      description: 'Track and manage your real estate transactions',
      icon: Briefcase,
      href: '/deals',
      stats: [
        { label: 'Active', value: activeDeals.length },
        { label: 'Closed', value: closedDeals.length },
      ],
      color: 'bg-primary',
    },
    {
      title: 'Prospects',
      description: 'Manage potential clients and opportunities',
      icon: UserSearch,
      href: '/prospects',
      color: 'bg-secondary',
    },
    {
      title: 'BrokerageDB',
      description: 'Directory of brokerages and agents',
      icon: Users,
      href: '/contacts',
      color: 'bg-accent',
    },
  ];

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-8">
        <PageHeader title="CRE Tracker" icon={Briefcase} />

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {sections.map((section) => (
            <Link key={section.title} to={section.href}>
              <Card className="h-full hover:shadow-[6px_6px_0_hsl(var(--foreground))] transition-shadow cursor-pointer border-2 border-foreground">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className={`p-2 ${section.color} border-2 border-foreground`} style={{ borderRadius: 'var(--radius)' }}>
                      <section.icon className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-lg font-bold mt-2">{section.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">{section.description}</p>
                </CardHeader>
                <CardContent>
                  {'stats' in section && section.stats ? (
                    <div className="flex gap-4">
                      {section.stats.map((stat) => (
                        <div key={stat.label} className="flex-1">
                          <p className="text-2xl font-black">{stat.value}</p>
                          <p className="text-xs text-muted-foreground uppercase tracking-wide">{stat.label}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Click to view</p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Calendar Section */}
        <Card className="border-2 border-foreground">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Important Dates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex justify-center">
                <CalendarComponent
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  modifiers={{
                    hasEvent: calendarDates.map(d => d.date),
                  }}
                  modifiersClassNames={{
                    hasEvent: 'bg-primary/20 font-bold',
                  }}
                />
              </div>
              <div>
                <h4 className="font-bold mb-3">
                  {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Select a date'}
                </h4>
                {selectedDate && eventsOnSelectedDate.length === 0 && (
                  <p className="text-sm text-muted-foreground">No events on this date</p>
                )}
                <div className="space-y-2">
                  {eventsOnSelectedDate.map((event, i) => {
                    const linkPath = event.type === 'deal-close' || event.type === 'deal' 
                      ? `/deals/${event.id}` 
                      : `/prospects/${event.id}`;
                    return (
                      <Link
                        key={i}
                        to={linkPath}
                        className="flex items-center gap-2 p-2 border-2 border-foreground/20 hover:border-foreground hover:bg-muted/50 transition-all"
                        style={{ borderRadius: 'var(--radius)' }}
                      >
                        <div className={`w-2 h-2 rounded-full ${
                          event.type === 'deal-close' ? 'bg-primary' :
                          event.type === 'deal' ? 'bg-secondary' : 'bg-accent'
                        }`} />
                        <span className="text-sm">{event.label}</span>
                      </Link>
                    );
                  })}
                </div>
                {!selectedDate && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground mb-2">Upcoming events:</p>
                    {calendarDates
                      .filter(d => d.date >= new Date())
                      .sort((a, b) => a.date.getTime() - b.date.getTime())
                      .slice(0, 5)
                      .map((event, i) => {
                        const linkPath = event.type === 'deal-close' || event.type === 'deal' 
                          ? `/deals/${event.id}` 
                          : `/prospects/${event.id}`;
                        return (
                          <Link
                            key={i}
                            to={linkPath}
                            className="flex items-center justify-between p-2 border-2 border-foreground/20 hover:border-foreground hover:bg-muted/50 transition-all"
                            style={{ borderRadius: 'var(--radius)' }}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${
                                event.type === 'deal-close' ? 'bg-primary' :
                                event.type === 'deal' ? 'bg-secondary' : 'bg-accent'
                              }`} />
                              <span className="text-sm">{event.label}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {format(event.date, 'MMM d')}
                            </span>
                          </Link>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </AppLayout>
  );
}
