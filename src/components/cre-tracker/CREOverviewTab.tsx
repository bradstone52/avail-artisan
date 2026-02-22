import { CREStatsCards } from './CREStatsCards';
import { CRECalendarSection, CalendarEvent } from './CRECalendarSection';
import { CRENextActionsPanel } from './CRENextActionsPanel';
import type { Deal } from '@/types/database';
import type { DealImportantDate } from '@/hooks/useAllDealImportantDates';
import type { Prospect } from '@/types/prospect';

interface DealStats {
  count: number;
  totalSF: number;
  totalCommission: number;
}

interface DealBreakdown {
  conditional: { sale: DealStats; lease: DealStats };
  firm: { sale: DealStats; lease: DealStats };
  closed: { sale: DealStats; lease: DealStats };
}

interface CREOverviewTabProps {
  activeDealsCount: number;
  closedDealsCount: number;
  upcomingEventsCount: number;
  dealBreakdown: DealBreakdown;
  calendarDates: CalendarEvent[];
  prospects: Prospect[] | undefined;
  prospectsLoading: boolean;
  dealDates: DealImportantDate[];
  dealDatesLoading: boolean;
}

export function CREOverviewTab({
  activeDealsCount,
  closedDealsCount,
  upcomingEventsCount,
  dealBreakdown,
  calendarDates,
  prospects,
  prospectsLoading,
  dealDates,
  dealDatesLoading,
}: CREOverviewTabProps) {
  return (
    <div className="space-y-6">
      <CRENextActionsPanel
        prospects={prospects}
        dealDates={dealDates}
        isLoading={prospectsLoading || dealDatesLoading}
      />
      <CREStatsCards
        activeDealsCount={activeDealsCount}
        closedDealsCount={closedDealsCount}
        upcomingEventsCount={upcomingEventsCount}
        dealBreakdown={dealBreakdown}
      />
      <CRECalendarSection calendarDates={calendarDates} />
    </div>
  );
}
