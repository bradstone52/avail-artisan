import * as React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { Briefcase } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useDeals } from '@/hooks/useDeals';
import { useAllDealImportantDates } from '@/hooks/useAllDealImportantDates';
import { useUpcomingFollowUps } from '@/hooks/useUpcomingFollowUps';
import { useProspects } from '@/hooks/useProspects';
import { useInternalListings } from '@/hooks/useInternalListings';
import { parseISO, addDays } from 'date-fns';
import { BrokeragesAndAgentsTab } from '@/components/settings/BrokeragesAndAgentsTab';
import { CREQuickNav } from '@/components/cre-tracker/CREQuickNav';
import { CREOverviewTab } from '@/components/cre-tracker/CREOverviewTab';
import { CREDealsTab } from '@/components/cre-tracker/CREDealsTab';
import { CREProspectsTab } from '@/components/cre-tracker/CREProspectsTab';
import { CREListingsTab } from '@/components/cre-tracker/CREListingsTab';
import type { CalendarEvent } from '@/components/cre-tracker/CRECalendarSection';

const VALID_TABS = ['overview', 'deals', 'prospects', 'listings', 'contacts'] as const;
type CRETab = typeof VALID_TABS[number];
const DEFAULT_TAB: CRETab = 'overview';
function parseTab(value: string | null): CRETab {
  return VALID_TABS.includes(value as CRETab) ? (value as CRETab) : DEFAULT_TAB;
}

export default function CRETracker() {
  const { data: deals = [] } = useDeals();
  const { data: dealDates = [], isLoading: dealDatesLoading } = useAllDealImportantDates(365);
  const upcomingFollowUps = useUpcomingFollowUps(365);
  const { data: prospects, isLoading: prospectsLoading } = useProspects();
  const { listings, isLoading: listingsLoading } = useInternalListings();

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

  const calendarDates: CalendarEvent[] = [
    ...dealDates.map(d => ({
      date: parseISO(d.date),
      type: d.type as CalendarEvent['type'],
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

  const today = new Date();
  const next30DaysEvents = calendarDates.filter(d => d.date >= today && d.date <= addDays(today, 30));

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = parseTab(searchParams.get('tab'));
  const setActiveTab = React.useCallback((tab: string) => {
    setSearchParams({ tab }, { replace: false });
  }, [setSearchParams]);

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-6">
        <PageHeader title="CRE Tracker" icon={Briefcase} />
        <CREQuickNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          activeDealsCount={activeDeals.length}
          prospectsCount={prospectsLoading ? undefined : (prospects?.length ?? 0)}
          listingsCount={listingsLoading ? undefined : listings.length}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsContent value="overview" className="space-y-6 mt-4">
            <CREOverviewTab
              activeDealsCount={activeDeals.length}
              closedDealsCount={closedDeals.length}
              upcomingEventsCount={next30DaysEvents.length}
              dealBreakdown={dealBreakdown}
              calendarDates={calendarDates}
              prospects={prospects}
              prospectsLoading={prospectsLoading}
              dealDates={dealDates}
              dealDatesLoading={dealDatesLoading}
            />
          </TabsContent>
          <TabsContent value="deals" className="mt-4">
            <CREDealsTab deals={deals} />
          </TabsContent>
          <TabsContent value="prospects" className="mt-4">
            <CREProspectsTab />
          </TabsContent>
          <TabsContent value="listings" className="mt-4">
            <CREListingsTab />
          </TabsContent>
          <TabsContent value="contacts" className="mt-4">
            <BrokeragesAndAgentsTab />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
