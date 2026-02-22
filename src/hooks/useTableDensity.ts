import { useState, useCallback } from 'react';

export type TableDensity = 'compact' | 'comfortable';

export function useTableDensity(tableKey: string, defaultDensity: TableDensity = 'comfortable') {
  const storageKey = `table-density-${tableKey}`;

  const [density, setDensity] = useState<TableDensity>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw === 'compact' || raw === 'comfortable') return raw;
    } catch {}
    return defaultDensity;
  });

  const toggle = useCallback(() => {
    setDensity(prev => {
      const next = prev === 'compact' ? 'comfortable' : 'compact';
      localStorage.setItem(storageKey, next);
      return next;
    });
  }, [storageKey]);

  return { density, toggle, isCompact: density === 'compact' };
}
