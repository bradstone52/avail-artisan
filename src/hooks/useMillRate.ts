import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MillRateSettings {
  rate: number;
  year: string;
  loading: boolean;
}

export function useMillRate(): MillRateSettings {
  const [rate, setRate] = useState(0.02182860);
  const [year, setYear] = useState('2025');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMillRate = async () => {
      try {
        const { data, error } = await supabase
          .from('workspace_settings')
          .select('key, value')
          .in('key', ['mill_rate', 'mill_rate_year']);

        if (error) throw error;

        for (const setting of data || []) {
          if (setting.key === 'mill_rate' && setting.value) {
            setRate(parseFloat(String(setting.value)));
          }
          if (setting.key === 'mill_rate_year' && setting.value) {
            setYear(String(setting.value));
          }
        }
      } catch (err) {
        console.error('Error fetching mill rate:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMillRate();
  }, []);

  return { rate, year, loading };
}
