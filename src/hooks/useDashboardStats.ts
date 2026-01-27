import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrg } from '@/hooks/useOrg';

interface DashboardStats {
  totalListings: number;
  activeListings: number;
  underContractListings: number;
  totalSqFt: number;
}

export function useDashboardStats() {
  const { user } = useAuth();
  const { org } = useOrg();

  return useQuery({
    queryKey: ['dashboard-stats', org?.id],
    queryFn: async (): Promise<DashboardStats> => {
      if (!org?.id) {
        return {
          totalListings: 0,
          activeListings: 0,
          underContractListings: 0,
          totalSqFt: 0,
        };
      }
      
      const { data, error } = await supabase
        .from('market_listings')
        .select('id, status, size_sf')
        .eq('org_id', org.id);

      if (error) throw error;

      const listings = data || [];
      
      return {
        totalListings: listings.length,
        activeListings: listings.filter(l => l.status === 'Active').length,
        underContractListings: listings.filter(l => l.status === 'Under Contract').length,
        totalSqFt: listings.reduce((sum, l) => sum + (l.size_sf || 0), 0),
      };
    },
    enabled: !!user && !!org?.id,
  });
}
