import { useQuery } from '@tanstack/react-query';
import { useProspects } from './useProspects';
import { useDeals } from './useDeals';
import { addDays, isBefore, isAfter, parseISO } from 'date-fns';

interface FollowUp {
  id: string;
  type: 'prospect' | 'deal';
  name: string;
  date: string;
  status: string;
  notes?: string;
}

export function useUpcomingFollowUps(days: number = 7) {
  const { data: prospects } = useProspects();
  const { data: deals } = useDeals();

  const today = new Date();
  const endDate = addDays(today, days);

  const followUps: FollowUp[] = [];

  // Add prospect follow-ups
  prospects?.forEach(prospect => {
    if (prospect.follow_up_date) {
      const date = parseISO(prospect.follow_up_date);
      if (isAfter(date, today) && isBefore(date, endDate)) {
        followUps.push({
          id: prospect.id,
          type: 'prospect',
          name: prospect.name,
          date: prospect.follow_up_date,
          status: prospect.status,
          notes: prospect.notes || undefined,
        });
      }
    }
  });

  // Add deal close dates as follow-ups
  deals?.forEach(deal => {
    if (deal.close_date && deal.status !== 'Closed' && deal.status !== 'Lost') {
      const date = parseISO(deal.close_date);
      if (isAfter(date, today) && isBefore(date, endDate)) {
        followUps.push({
          id: deal.id,
          type: 'deal',
          name: deal.address,
          date: deal.close_date,
          status: deal.status,
          notes: deal.notes || undefined,
        });
      }
    }
  });

  // Sort by date
  followUps.sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());

  return followUps;
}
