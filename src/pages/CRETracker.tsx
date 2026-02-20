import * as React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Briefcase, UserSearch, Users, ArrowRight, Calendar, BarChart3, Building2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useDeals } from '@/hooks/useDeals';
import { useAllDealImportantDates } from '@/hooks/useAllDealImportantDates';
import { useUpcomingFollowUps } from '@/hooks/useUpcomingFollowUps';
import { formatCurrency } from '@/lib/format';
import { format, parseISO, isSameDay, addDays } from 'date-fns';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { BrokeragesAndAgentsTab } from '@/components/settings/BrokeragesAndAgentsTab';
import { DealsTable } from '@/components/deals/DealsTable';
import { DealFormDialog } from '@/components/deals/DealFormDialog';
import { ProspectsTable } from '@/components/prospects/ProspectsTable';
import { ProspectFormDialog } from '@/components/prospects/ProspectFormDialog';
import { InternalListingsTable } from '@/components/internal-listings/InternalListingsTable';
import { InternalListingEditDialog } from '@/components/internal-listings/InternalListingEditDialog';
import { InternalListingFilters, ListingFilters } from '@/components/internal-listings/InternalListingFilters';
import { useProspects } from '@/hooks/useProspects';
import { useInternalListings, InternalListing, InternalListingFormData } from '@/hooks/useInternalListings';
import type { Deal } from '@/types/database';
import type { Prospect } from '@/types/prospect';
import { Plus } from 'lucide-react';

// --- Inline Tab Components ---

function DealsTabInline({ deals }: { deals: Deal[] }) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingDeal, setEditingDeal] = React.useState<Deal | null>(null);
  const handleEdit = (deal: Deal) => { setEditingDeal(deal); setDialogOpen(true); };
  const handleClose = () => { setDialogOpen(false); setEditingDeal(null); };
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 mr-2" />New Deal</Button>
      </div>
      <DealsTable deals={deals} onEdit={handleEdit} />
      <DealFormDialog open={dialogOpen} onOpenChange={handleClose} deal={editingDeal} />
    </div>
  );
}

function ProspectsTabInline() {
  const { data: prospects, isLoading } = useProspects();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingProspect, setEditingProspect] = React.useState<Prospect | null>(null);
  const handleEdit = (prospect: Prospect) => { setEditingProspect(prospect); setDialogOpen(true); };
  const handleClose = () => { setDialogOpen(false); setEditingProspect(null); };
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 mr-2" />New Prospect</Button>
      </div>
      <ProspectsTable prospects={prospects || []} isLoading={isLoading} onEdit={handleEdit} />
      <ProspectFormDialog open={dialogOpen} onOpenChange={handleClose} prospect={editingProspect} />
    </div>
  );
}

function InternalListingsTabInline() {
  const { listings, isLoading, createListing, updateListing, deleteListing } = useInternalListings();
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [selectedListing, setSelectedListing] = React.useState<InternalListing | null>(null);
  const [filters, setFilters] = React.useState<ListingFilters>({
    search: '', status: '', propertyType: '', dealType: '', agentId: '', city: '', minSize: undefined, maxSize: undefined,
  });

  const filteredListings = React.useMemo(() => {
    return listings.filter((listing) => {
      if (filters.search) {
        const s = filters.search.toLowerCase();
        if (!(listing.address.toLowerCase().includes(s) || listing.display_address?.toLowerCase().includes(s) || listing.city.toLowerCase().includes(s) || listing.listing_number?.toLowerCase().includes(s))) return false;
      }
      if (filters.status && listing.status !== filters.status) return false;
      if (filters.propertyType && listing.property_type !== filters.propertyType) return false;
      if (filters.dealType && listing.deal_type !== filters.dealType) return false;
      if (filters.agentId && listing.assigned_agent_id !== filters.agentId) return false;
      if (filters.city && !listing.city.toLowerCase().includes(filters.city.toLowerCase())) return false;
      if (filters.minSize && (listing.size_sf ?? 0) < filters.minSize) return false;
      if (filters.maxSize && (listing.size_sf ?? 0) > filters.maxSize) return false;
      return true;
    });
  }, [listings, filters]);

  const handleCreate = () => { setSelectedListing(null); setEditDialogOpen(true); };
  const handleEdit = (listing: InternalListing) => { setSelectedListing(listing); setEditDialogOpen(true); };
  const handleSubmit = (data: InternalListingFormData) => {
    if (selectedListing) {
      updateListing.mutate({ id: selectedListing.id, ...data }, { onSuccess: () => setEditDialogOpen(false) });
    } else {
      createListing.mutate(data, { onSuccess: () => setEditDialogOpen(false) });
    }
  };
  const handleDelete = (id: string) => { deleteListing.mutate(id); };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleCreate}><Plus className="w-4 h-4 mr-2" />New Listing</Button>
      </div>
      <InternalListingFilters filters={filters} onFiltersChange={setFilters} />
      <InternalListingsTable listings={filteredListings} onEdit={handleEdit} onDelete={handleDelete} isDeleting={deleteListing.isPending} />
      <InternalListingEditDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} listing={selectedListing} onSubmit={handleSubmit} isSubmitting={createListing.isPending || updateListing.isPending} />
    </div>
  );
}

export default function CRETracker() {
  const navigate = useNavigate();
  const { data: deals = [] } = useDeals();
  const { data: dealDates = [] } = useAllDealImportantDates(365);
  const upcomingFollowUps = useUpcomingFollowUps(365);

  // Deal stats
  const activeDeals = deals.filter(d => d.status === 'Conditional' || d.status === 'Firm');
  const closedDeals = deals.filter(d => d.status === 'Closed');

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
    conditional: { sale: calculateStats('Conditional', 'Sale'), lease: calculateStats('Conditional', 'Lease') },
    firm: { sale: calculateStats('Firm', 'Sale'), lease: calculateStats('Firm', 'Lease') },
    closed: { sale: calculateStats('Closed', 'Sale'), lease: calculateStats('Closed', 'Lease') },
  };

  // Calendar dates
  const calendarDates = [
    ...dealDates.map(d => ({
      date: parseISO(d.date),
      type: d.type as 'deposit' | 'condition' | 'action' | 'closing',
      label: d.label,
      sublabel: d.time ? `at ${d.time}` : d.description,
      id: d.dealId,
      linkPath: `/deals/${d.dealId}`,
    })),
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

  // Quick nav sections for the top cards
  const quickNav = [
    { title: 'Overview', icon: Calendar, tab: 'overview', color: 'bg-muted' },
    { title: 'Deals', icon: Briefcase, tab: 'deals', stat: `${activeDeals.length} active`, color: 'bg-primary' },
    { title: 'Prospects', icon: UserSearch, tab: 'prospects', color: 'bg-secondary' },
    { title: 'Internal Listings', icon: Building2, tab: 'listings', color: 'bg-accent' },
    { title: 'BrokerageDB', icon: Users, tab: 'contacts', color: 'bg-muted' },
  ];

  const [activeTab, setActiveTab] = React.useState('overview');

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-6">
        <PageHeader title="CRE Tracker" icon={Briefcase} />

        {/* Quick Nav Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {quickNav.map((item) => (
            <button
              key={item.title}
              onClick={() => setActiveTab(item.tab)}
              className={`flex items-center gap-3 p-3 border-2 transition-all text-left ${
                activeTab === item.tab
                  ? 'border-foreground shadow-[4px_4px_0_hsl(var(--foreground))] bg-card'
                  : 'border-foreground/20 hover:border-foreground hover:bg-muted/50'
              }`}
              style={{ borderRadius: 'var(--radius)' }}
            >
              <div className={`p-2 ${item.color} border-2 border-foreground`} style={{ borderRadius: 'var(--radius)' }}>
                <item.icon className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold truncate">{item.title}</p>
                {item.stat && <p className="text-xs text-muted-foreground">{item.stat}</p>}
              </div>
            </button>
          ))}
        </div>

        {/* Tabbed Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 mt-4">
            {/* Deal Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-2 border-foreground">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Active Deals</p>
                      <p className="text-3xl font-black">{activeDeals.length}</p>
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-1 border-2 border-foreground/20 hover:border-foreground">
                          <BarChart3 className="w-3 h-3" />
                          Details
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 border-2 border-foreground" align="start">
                        <div className="space-y-4">
                          <h4 className="font-bold text-sm uppercase tracking-wide">Deal Breakdown</h4>
                          <div className="space-y-2 pb-3 border-b border-foreground/10">
                            <p className="font-bold text-sm">Conditional</p>
                            <div className="pl-2 space-y-2">
                              <StatRow label="Sale" stats={dealBreakdown.conditional.sale} />
                              <StatRow label="Lease" stats={dealBreakdown.conditional.lease} />
                            </div>
                          </div>
                          <div className="space-y-2 pb-3 border-b border-foreground/10">
                            <p className="font-bold text-sm">Firm</p>
                            <div className="pl-2 space-y-2">
                              <StatRow label="Sale" stats={dealBreakdown.firm.sale} />
                              <StatRow label="Lease" stats={dealBreakdown.firm.lease} />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <p className="font-bold text-sm">Closed</p>
                            <div className="pl-2 space-y-2">
                              <StatRow label="Sale" stats={dealBreakdown.closed.sale} />
                              <StatRow label="Lease" stats={dealBreakdown.closed.lease} />
                            </div>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-2 border-foreground">
                <CardContent className="pt-4 pb-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Closed Deals</p>
                  <p className="text-3xl font-black">{closedDeals.length}</p>
                </CardContent>
              </Card>
              <Card className="border-2 border-foreground">
                <CardContent className="pt-4 pb-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Upcoming Events</p>
                  <p className="text-3xl font-black">{next30DaysEvents.length}</p>
                  <p className="text-xs text-muted-foreground">next 30 days</p>
                </CardContent>
              </Card>
            </div>

            {/* Calendar */}
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
                      month={displayedMonth}
                      onMonthChange={setDisplayedMonth}
                    />
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
          </TabsContent>

          {/* Deals Tab */}
          <TabsContent value="deals" className="mt-4">
            <DealsTabInline deals={deals} />
          </TabsContent>

          {/* Prospects Tab */}
          <TabsContent value="prospects" className="mt-4">
            <ProspectsTabInline />
          </TabsContent>

          {/* Internal Listings Tab */}
          <TabsContent value="listings" className="mt-4">
            <InternalListingsTabInline />
          </TabsContent>

          {/* BrokerageDB Tab */}
          <TabsContent value="contacts" className="mt-4">
            <BrokeragesAndAgentsTab />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
