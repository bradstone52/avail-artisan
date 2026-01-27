import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface NotificationSettings {
  id: string;
  user_id: string;
  email_notifications: boolean;
  deal_reminders: boolean;
  prospect_follow_ups: boolean;
  daily_digest: boolean;
  created_at: string;
  updated_at: string;
}

const defaultSettings: Omit<NotificationSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  email_notifications: true,
  deal_reminders: true,
  prospect_follow_ups: true,
  daily_digest: false,
};

export function useNotificationSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['notification-settings', user?.id],
    queryFn: async () => {
      if (!user?.id) return defaultSettings;
      
      // For now, return default settings since table doesn't exist yet
      // This is a placeholder for future implementation
      return defaultSettings;
    },
    enabled: !!user,
  });

  const updateSettings = useMutation({
    mutationFn: async (settings: Partial<typeof defaultSettings>) => {
      // Placeholder for future implementation
      toast.info('Notification settings coming soon');
      return { ...defaultSettings, ...settings };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
      toast.success('Settings updated');
    },
  });

  return {
    settings: query.data || defaultSettings,
    isLoading: query.isLoading,
    updateSettings: updateSettings.mutate,
    isUpdating: updateSettings.isPending,
  };
}
