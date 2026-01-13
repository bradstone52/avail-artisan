import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface SyncSettings {
  id: string;
  scheduled_sync_enabled: boolean;
  morning_sync_time: string;
  evening_sync_time: string;
  timezone: string;
  last_scheduled_run_at: string | null;
  last_scheduled_run_status: string | null;
  google_credentials_expired: boolean;
  updated_at: string;
}

export interface SyncLog {
  id: string;
  run_type: 'manual' | 'scheduled';
  triggered_by: string | null;
  started_at: string;
  completed_at: string | null;
  status: 'running' | 'success' | 'failed';
  rows_read: number;
  rows_imported: number;
  rows_skipped: number;
  skipped_breakdown: {
    inactive?: number;
    not_distribution?: number;
    missing_fields?: number;
    duplicate_listing_id?: number;
  };
  error_message: string | null;
  created_at: string;
}

export function useSyncSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SyncSettings | null>(null);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('sync_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching sync settings:', error);
      } else {
        setSettings(data as SyncSettings | null);
      }
    } catch (err) {
      console.error('Error fetching sync settings:', err);
    }
  }, [user]);

  const fetchLogs = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('sync_logs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching sync logs:', error);
      } else {
        setLogs(data as SyncLog[] || []);
      }
    } catch (err) {
      console.error('Error fetching sync logs:', err);
    }
  }, [user]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchSettings(), fetchLogs()]);
      setLoading(false);
    };

    if (user) {
      init();
    }
  }, [user, fetchSettings, fetchLogs]);

  const updateSettings = async (updates: Partial<SyncSettings>) => {
    if (!settings) return;

    try {
      const { error } = await supabase
        .from('sync_settings')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
          updated_by: user?.id,
        })
        .eq('id', settings.id);

      if (error) throw error;

      setSettings({ ...settings, ...updates });
      toast.success('Sync settings updated');
    } catch (err) {
      console.error('Error updating sync settings:', err);
      toast.error('Failed to update sync settings');
    }
  };

  const getNextScheduledRun = (): Date | null => {
    if (!settings || !settings.scheduled_sync_enabled) return null;

    const now = new Date();
    const timezone = settings.timezone || 'America/Edmonton';
    
    // Parse times
    const [morningHour, morningMin] = settings.morning_sync_time.split(':').map(Number);
    const [eveningHour, eveningMin] = settings.evening_sync_time.split(':').map(Number);

    // Get current time in the specified timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const currentHour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
    const currentMin = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
    const currentMinutes = currentHour * 60 + currentMin;

    const morningMinutes = morningHour * 60 + morningMin;
    const eveningMinutes = eveningHour * 60 + eveningMin;

    // Find next run
    let nextRunMinutes: number;
    let daysToAdd = 0;

    if (currentMinutes < morningMinutes) {
      nextRunMinutes = morningMinutes;
    } else if (currentMinutes < eveningMinutes) {
      nextRunMinutes = eveningMinutes;
    } else {
      nextRunMinutes = morningMinutes;
      daysToAdd = 1;
    }

    const nextRun = new Date(now);
    nextRun.setDate(nextRun.getDate() + daysToAdd);
    nextRun.setHours(Math.floor(nextRunMinutes / 60), nextRunMinutes % 60, 0, 0);

    return nextRun;
  };

  return {
    settings,
    logs,
    loading,
    fetchSettings,
    fetchLogs,
    updateSettings,
    getNextScheduledRun,
  };
}
