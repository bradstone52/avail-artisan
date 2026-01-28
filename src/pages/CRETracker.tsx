import * as React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, UserSearch, Users, ArrowRight, Calendar, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDeals } from '@/hooks/useDeals';
import { useAllDealImportantDates } from '@/hooks/useAllDealImportantDates';
import { useUpcomingFollowUps } from '@/hooks/useUpcomingFollowUps';
import { formatCurrency } from '@/lib/format';
import { format, parseISO, isSameDay, addDays } from 'date-fns';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

export default function CRETracker() {
  const { data: deals = [] } = useDeals();
  // Fetch 365 days for calendar display, but filter list to 30 days
  const { data: dealDates = [] } = useAllDealImportantDates(365);
  const upcomingFollowUps = useUpcomingFollowUps(365);

  // Calculate deal stats
  const activeDeals = deals.filter(d => d.status === 'Conditional' || d.status === 'Firm');
  const closedDeals = deals.filter(d => d.status === 'Closed');
  
  // Calculate deal stats by status and type
  const calculateStats = (status: string, dealType: string) => {
    const filtered = deals.filter(d => d.status === status && d.deal_type === dealType);
    const totalSF = filtered.reduce((sum, deal) => sum + (deal.size_sf || 0), 0);
    const totalCommission = filtered.reduce((sum, deal) => {
      const dealValue = deal.deal_value || deal.lease_value || 0;
      const commissionPercent = deal.commission_percent || 0;
      return sum + (dealValue * commissionPercent / 100);
    }, 0);
    return { count: filtered.length, totalSF, totalCommission };
  };

  const dealBreakdown = {
    conditional: {
      sale: calculateStats('Conditional', 'Sale'),
      lease: calculateStats('Conditional', 'Lease'),
    },
    firm: {
      sale: calculateStats('Firm', 'Sale'),
      lease: calculateStats('Firm', 'Lease'),
    },
    closed: {
      sale: calculateStats('Closed', 'Sale'),
      lease: calculateStats('Closed', 'Lease'),
    },
  };

  // Collect all important dates for calendar
  const calendarDates = [
    // Deal dates (deposits, conditions, actions, closing)
    ...dealDates.map(d => ({
      date: parseISO(d.date),
      type: d.type as 'deposit' | 'condition' | 'action' | 'closing',
      label: d.label,
      sublabel: d.time ? `at ${d.time}` : d.description,
      id: d.dealId,
      linkPath: `/deals/${d.dealId}`,
    })),
    // Prospect follow-ups
    ...upcomingFollowUps
      .filter(item => item.type === 'prospect')
      .map(item => ({
        date: parseISO(item.date),
        type: 'prospect' as const,
        label: `Follow-up: ${item.name}`,
        sublabel: item.notes,
        id: item.id,
        linkPath: `/prospects/${item.id}`,
      })),
  ];

  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(undefined);
  
  // Filter for upcoming list (30 days only)
  const today = new Date();
  const thirtyDaysFromNow = addDays(today, 30);
  const upcomingEvents = calendarDates
    .filter(d => d.date >= today && d.date <= thirtyDaysFromNow)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const eventsOnSelectedDate = selectedDate
    ? calendarDates.filter(d => isSameDay(d.date, selectedDate))
    : [];

  // Group calendar dates by type for color-coded modifiers
  const closingDates = calendarDates.filter(d => d.type === 'closing').map(d => d.date);
  const depositDates = calendarDates.filter(d => d.type === 'deposit').map(d => d.date);
  const conditionDates = calendarDates.filter(d => d.type === 'condition').map(d => d.date);
  const actionDates = calendarDates.filter(d => d.type === 'action').map(d => d.date);
  const prospectDates = calendarDates.filter(d => d.type === 'prospect').map(d => d.date);

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
      hasDealBreakdown: true,
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

  const getEventColor = (type: string) => {
    switch (type) {
      case 'closing': return 'bg-primary';
      case 'deposit': return 'bg-yellow-500';
      case 'condition': return 'bg-orange-500';
      case 'action': return 'bg-blue-500';
      case 'prospect': return 'bg-accent';
      default: return 'bg-secondary';
    }
  };

  const StatRow = ({ label, stats }: { label: string; stats: { count: number; totalSF: number; totalCommission: number } }) => (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="grid grid-cols-3 gap-2 text-sm">
        <span>{stats.count} deals</span>
        <span>{stats.totalSF.toLocaleString()} SF</span>
        <span>{formatCurrency(stats.totalCommission)}</span>
      </div>
    </div>
  );

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
                    <div className="space-y-3">
                      <div className="flex gap-4">
                        {section.stats.map((stat) => (
                          <div key={stat.label} className="flex-1">
                            <p className="text-2xl font-black">{stat.value}</p>
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">{stat.label}</p>
                          </div>
                        ))}
                      </div>
                      {'hasDealBreakdown' in section && section.hasDealBreakdown && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full gap-2 border-2 border-foreground/20 hover:border-foreground"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                            >
                              <BarChart3 className="w-4 h-4" />
                              View Deal Breakdown
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 border-2 border-foreground" align="start">
                            <div className="space-y-4">
                              <h4 className="font-bold text-sm uppercase tracking-wide">Deal Breakdown</h4>
                              
                              {/* Conditional */}
                              <div className="space-y-2 pb-3 border-b border-foreground/10">
                                <p className="font-bold text-sm text-yellow-600">Conditional</p>
                                <div className="pl-2 space-y-2">
                                  <StatRow label="Sale" stats={dealBreakdown.conditional.sale} />
                                  <StatRow label="Lease" stats={dealBreakdown.conditional.lease} />
                                </div>
                              </div>
                              
                              {/* Firm */}
                              <div className="space-y-2 pb-3 border-b border-foreground/10">
                                <p className="font-bold text-sm text-orange-600">Firm</p>
                                <div className="pl-2 space-y-2">
                                  <StatRow label="Sale" stats={dealBreakdown.firm.sale} />
                                  <StatRow label="Lease" stats={dealBreakdown.firm.lease} />
                                </div>
                              </div>
                              
                              {/* Closed */}
                              <div className="space-y-2">
                                <p className="font-bold text-sm text-primary">Closed</p>
                                <div className="pl-2 space-y-2">
                                  <StatRow label="Sale" stats={dealBreakdown.closed.sale} />
                                  <StatRow label="Lease" stats={dealBreakdown.closed.lease} />
                                </div>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
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
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold">
                    {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Upcoming (30 days)'}
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
                  {eventsOnSelectedDate.map((event, i) => (
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
                  ))}
                </div>
                {!selectedDate && (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {upcomingEvents.map((event, i) => (
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
                    {upcomingEvents.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">No upcoming dates in the next 30 days</p>
                    )}
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