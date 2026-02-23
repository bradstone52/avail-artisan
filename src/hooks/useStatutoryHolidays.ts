import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useStatutoryHolidays() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['statutory_holidays'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('statutory_holidays')
        .select('holiday_date')
        .order('holiday_date', { ascending: true });

      if (error) throw error;
      // Return as a Set of date strings for O(1) lookup
      return new Set((data || []).map((h: any) => h.holiday_date));
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });

  const addBusinessDays = (startDate: Date, days: number): Date => {
    const holidays = query.data || new Set<string>();
    let current = new Date(startDate);
    let added = 0;
    while (added < days) {
      current.setDate(current.getDate() + 1);
      const dow = current.getDay();
      // Skip weekends
      if (dow === 0 || dow === 6) continue;
      // Skip statutory holidays - format as yyyy-MM-dd
      const y = current.getFullYear();
      const m = String(current.getMonth() + 1).padStart(2, '0');
      const d = String(current.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;
      if (holidays.has(dateStr)) continue;
      added++;
    }
    return current;
  };

  return {
    holidays: query.data || new Set<string>(),
    isLoading: query.isLoading,
    addBusinessDays,
  };
}
