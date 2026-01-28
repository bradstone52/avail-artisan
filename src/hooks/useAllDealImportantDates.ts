import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrg } from '@/hooks/useOrg';
import { addDays, isBefore, isAfter, parseISO } from 'date-fns';

export interface DealImportantDate {
  id: string;
  dealId: string;
  dealAddress: string;
  date: string;
  time?: string | null;
  type: 'deposit' | 'condition' | 'action' | 'closing';
  label: string;
  description?: string;
}

export function useAllDealImportantDates(days: number = 60) {
  const { user } = useAuth();
  const { org } = useOrg();

  return useQuery({
    queryKey: ['all_deal_important_dates', org?.id, days],
    queryFn: async () => {
      if (!org?.id) return [];

      const today = new Date();
      const endDate = addDays(today, days);
      const dates: DealImportantDate[] = [];

      // Fetch deals with closing dates
      const { data: deals } = await supabase
        .from('deals')
        .select('id, address, close_date, status')
        .eq('org_id', org.id)
        .not('close_date', 'is', null)
        .neq('status', 'Closed')
        .neq('status', 'Lost');

      deals?.forEach(deal => {
        if (deal.close_date) {
          const closeDate = parseISO(deal.close_date);
          if (isAfter(closeDate, today) && isBefore(closeDate, endDate)) {
            dates.push({
              id: `close-${deal.id}`,
              dealId: deal.id,
              dealAddress: deal.address,
              date: deal.close_date,
              type: 'closing',
              label: `Closing: ${deal.address}`,
            });
          }
        }
      });

      // Fetch deposits with due dates
      const { data: deposits } = await supabase
        .from('deal_deposits')
        .select('id, deal_id, amount, due_date, due_time, received, held_by, deals!inner(address, org_id, status)')
        .eq('deals.org_id', org.id)
        .eq('received', false)
        .not('due_date', 'is', null)
        .neq('deals.status', 'Closed')
        .neq('deals.status', 'Lost');

      deposits?.forEach(deposit => {
        if (deposit.due_date) {
          const dueDate = parseISO(deposit.due_date);
          if (isAfter(dueDate, today) && isBefore(dueDate, endDate)) {
            const dealData = deposit.deals as unknown as { address: string };
            dates.push({
              id: `deposit-${deposit.id}`,
              dealId: deposit.deal_id,
              dealAddress: dealData.address,
              date: deposit.due_date,
              time: deposit.due_time,
              type: 'deposit',
              label: `Deposit: $${deposit.amount.toLocaleString()}`,
              description: deposit.held_by ? `Held by: ${deposit.held_by}` : undefined,
            });
          }
        }
      });

      // Fetch conditions with due dates
      const { data: conditions } = await supabase
        .from('deal_conditions')
        .select('id, deal_id, description, due_date, is_satisfied, deals!inner(address, org_id, status)')
        .eq('deals.org_id', org.id)
        .eq('is_satisfied', false)
        .not('due_date', 'is', null)
        .neq('deals.status', 'Closed')
        .neq('deals.status', 'Lost');

      conditions?.forEach(condition => {
        if (condition.due_date) {
          const dueDate = parseISO(condition.due_date);
          if (isAfter(dueDate, today) && isBefore(dueDate, endDate)) {
            const dealData = condition.deals as unknown as { address: string };
            dates.push({
              id: `condition-${condition.id}`,
              dealId: condition.deal_id,
              dealAddress: dealData.address,
              date: condition.due_date,
              type: 'condition',
              label: `Condition: ${condition.description}`,
            });
          }
        }
      });

      // Fetch actions with due dates
      const { data: actions } = await supabase
        .from('deal_summary_actions')
        .select('id, deal_id, description, due_date, due_time, date_met, acting_party, deals!inner(address, org_id, status)')
        .eq('deals.org_id', org.id)
        .is('date_met', null)
        .not('due_date', 'is', null)
        .neq('deals.status', 'Closed')
        .neq('deals.status', 'Lost');

      actions?.forEach(action => {
        if (action.due_date) {
          const dueDate = parseISO(action.due_date);
          if (isAfter(dueDate, today) && isBefore(dueDate, endDate)) {
            const dealData = action.deals as unknown as { address: string };
            dates.push({
              id: `action-${action.id}`,
              dealId: action.deal_id,
              dealAddress: dealData.address,
              date: action.due_date,
              time: action.due_time,
              type: 'action',
              label: `Action: ${action.description}`,
              description: action.acting_party ? `Party: ${action.acting_party}` : undefined,
            });
          }
        }
      });

      // Sort by date
      dates.sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());

      return dates;
    },
    enabled: !!user && !!org?.id,
  });
}
