import { useState, useEffect } from 'react';
import { getOverdueTemplate } from '@/lib/prefs';

/**
 * Returns the current overdue label template and re-renders whenever it changes
 * (same tab via CustomEvent, other tabs via storage event).
 */
export function useOverdueTemplate(): string {
  const [template, setTemplate] = useState<string>(() => getOverdueTemplate());

  useEffect(() => {
    const handleChange = () => setTemplate(getOverdueTemplate());

    window.addEventListener('overdueLabelChange', handleChange);
    window.addEventListener('storage', handleChange);

    return () => {
      window.removeEventListener('overdueLabelChange', handleChange);
      window.removeEventListener('storage', handleChange);
    };
  }, []);

  return template;
}
