import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrg } from '@/hooks/useOrg';

interface BrokerageUpdateCheck {
  id: string;
  org_id: string;
  brokerage_name: string;
  check_month: number;
  check_year: number;
  checked: boolean;
  checked_at: string | null;
  checked_by: string | null;
  created_at: string;
  check_type: string;
}

export function useBrokerageUpdateChecks(brokerageNames: string[]) {
  const { user } = useAuth();
  const { orgId } = useOrg();
  const queryClient = useQueryClient();

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const queryKey = ['brokerage-update-checks', orgId, currentMonth, currentYear];

  const { data: checks = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('brokerage_update_checks')
        .select('*')
        .eq('org_id', orgId)
        .eq('check_month', currentMonth)
        .eq('check_year', currentYear);

      if (error) throw error;
      return (data || []) as BrokerageUpdateCheck[];
    },
    enabled: !!user && !!orgId,
  });

  const toggleCheck = useMutation({
    mutationFn: async ({ brokerageName, checked, checkType = 'brokerage' }: { brokerageName: string; checked: boolean; checkType?: string }) => {
      if (!orgId || !user) throw new Error('Not authenticated');

      if (checked) {
        const { error } = await supabase
          .from('brokerage_update_checks')
          .upsert({
            org_id: orgId,
            brokerage_name: brokerageName,
            check_month: currentMonth,
            check_year: currentYear,
            checked: true,
            checked_at: new Date().toISOString(),
            checked_by: user.id,
            check_type: checkType,
          }, { onConflict: 'org_id,brokerage_name,check_month,check_year,check_type' });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('brokerage_update_checks')
          .delete()
          .eq('org_id', orgId)
          .eq('brokerage_name', brokerageName)
          .eq('check_month', currentMonth)
          .eq('check_year', currentYear)
          .eq('check_type', checkType);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Build maps for brokerage and landlord checks
  const brokerageCheckMap = new Map(
    checks.filter(c => (c.check_type || 'brokerage') === 'brokerage').map(c => [c.brokerage_name, c.checked])
  );
  const landlordCheckMap = new Map(
    checks.filter(c => c.check_type === 'landlord').map(c => [c.brokerage_name, c.checked])
  );

  // Keep backward compat
  const checkMap = brokerageCheckMap;

  return {
    checks,
    checkMap,
    brokerageCheckMap,
    landlordCheckMap,
    isLoading,
    toggleCheck,
    currentMonth,
    currentYear,
  };
}
