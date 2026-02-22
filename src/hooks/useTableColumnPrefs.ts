import { useState, useCallback } from 'react';

export interface ColumnDef {
  id: string;
  label: string;
  defaultVisible: boolean;
}

export function useTableColumnPrefs(tableKey: string, columns: ColumnDef[]) {
  const storageKey = `table-cols-${tableKey}`;
  const allowedIds = columns.map(c => c.id);
  const defaultVisible = columns.filter(c => c.defaultVisible).map(c => c.id);

  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed: string[] = JSON.parse(raw);
        const valid = parsed.filter(id => allowedIds.includes(id));
        return valid.length > 0 ? valid : defaultVisible;
      }
    } catch {}
    return defaultVisible;
  });

  const toggle = useCallback((id: string) => {
    setVisibleColumns(prev => {
      let next: string[];
      if (prev.includes(id)) {
        next = prev.filter(c => c !== id);
        if (next.length === 0) return prev; // keep at least 1
      } else {
        next = [...prev, id];
      }
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  }, [storageKey]);

  const reset = useCallback(() => {
    localStorage.removeItem(storageKey);
    setVisibleColumns(defaultVisible);
  }, [storageKey, defaultVisible]);

  const isVisible = useCallback((id: string) => visibleColumns.includes(id), [visibleColumns]);

  return { visibleColumns, toggle, reset, isVisible, columns };
}
