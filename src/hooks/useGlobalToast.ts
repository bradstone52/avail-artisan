import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface PendingToast {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
  timestamp: number;
}

const STORAGE_KEY = 'pendingGlobalToast';

/**
 * Stores a toast in localStorage to be shown globally
 */
export function queueGlobalToast(toast: Omit<PendingToast, 'timestamp'>) {
  const pendingToast: PendingToast = {
    ...toast,
    timestamp: Date.now(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pendingToast));
}

/**
 * Hook to consume and display any pending global toasts.
 * Should be used in a component that's always mounted (like AppLayout).
 */
export function useGlobalToast() {
  const { toast } = useToast();

  useEffect(() => {
    // Check for pending toast on mount and periodically
    const checkAndShowToast = () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const pendingToast: PendingToast = JSON.parse(stored);
          // Only show if less than 30 seconds old
          if (Date.now() - pendingToast.timestamp < 30000) {
            toast({
              title: pendingToast.title,
              description: pendingToast.description,
              variant: pendingToast.variant,
            });
          }
          // Clear it after showing (or if expired)
          localStorage.removeItem(STORAGE_KEY);
        } catch (e) {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    };

    // Check immediately
    checkAndShowToast();

    // Poll every 500ms to catch toasts queued while on this page
    const interval = setInterval(checkAndShowToast, 500);

    return () => clearInterval(interval);
  }, [toast]);
}
