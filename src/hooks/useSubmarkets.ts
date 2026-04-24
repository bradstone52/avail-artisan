import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrg } from '@/hooks/useOrg';
import { formatSubmarket } from '@/lib/formatters';

export function useSubmarkets(): string[] {
  const { orgId } = useOrg();
  const [submarkets, setSubmarkets] = useState<string[]>([]);

  useEffect(() => {
    if (!orgId) return;

    async function fetch() {
      const [{ data: mlData }, { data: lcData }] = await Promise.all([
        supabase
          .from('market_listings')
          .select('submarket')
          .eq('org_id', orgId)
          .not('submarket', 'is', null),
        supabase
          .from('lease_comps')
          .select('submarket')
          .eq('org_id', orgId)
          .not('submarket', 'is', null),
      ]);

      const seen = new Set<string>();
      const formatted: string[] = [];

      for (const row of [...(mlData ?? []), ...(lcData ?? [])]) {
        const raw = row.submarket?.trim();
        if (!raw) continue;
        const display = formatSubmarket(raw);
        if (!seen.has(display)) {
          seen.add(display);
          formatted.push(display);
        }
      }

      setSubmarkets(formatted.sort());
    }

    fetch();
  }, [orgId]);

  return submarkets;
}
