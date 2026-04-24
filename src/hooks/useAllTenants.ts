import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { addMonths, parseISO } from 'date-fns';

export interface TenantWithProperty {
  id: string;
  tenantName: string;
  propertyId: string | null;
  propertyName: string | null;
  propertyAddress: string | null;
  propertyCity: string | null;
  unitNumber: string | null;
  sizeSf: number | null;
  leaseExpiry: string | null;
  trackedAt: string;
  source: 'manual' | 'transaction';
  leaseCompId?: string;
}

export function useAllTenants() {
  return useQuery({
    queryKey: ['all-tenants'],
    queryFn: async (): Promise<TenantWithProperty[]> => {
      // Fetch manual tenants from property_tenants
      const { data: manualTenants, error: manualError } = await supabase
        .from('property_tenants')
        .select('*, properties(name, address, city)')
        .order('created_at', { ascending: false });

      if (manualError) throw manualError;

      // Fetch tracked lease comps
      const { data: leaseComps, error: leaseCompsError } = await supabase
        .from('lease_comps')
        .select('*, properties(name, address, city)')
        .eq('is_tracked', true)
        .not('tenant_name', 'is', null)
        .order('created_at', { ascending: false });

      if (leaseCompsError) throw leaseCompsError;

      // Transform manual tenants
      const manualEntries: TenantWithProperty[] = (manualTenants || []).map((tenant) => ({
        id: tenant.id,
        tenantName: tenant.tenant_name,
        propertyId: tenant.property_id,
        propertyName: tenant.properties?.name || null,
        propertyAddress: tenant.properties?.address || null,
        propertyCity: tenant.properties?.city || null,
        unitNumber: tenant.unit_number,
        sizeSf: tenant.size_sf,
        leaseExpiry: tenant.lease_expiry,
        trackedAt: tenant.created_at,
        source: 'manual' as const,
      }));

      // Transform lease-comp-derived tenants
      const leaseCompEntries: TenantWithProperty[] = (leaseComps || []).map((lc) => {
        let leaseExpiry: string | null = null;
        if (lc.commencement_date && lc.term_months) {
          leaseExpiry = addMonths(parseISO(lc.commencement_date), lc.term_months)
            .toISOString()
            .split('T')[0];
        }

        return {
          id: `lc-${lc.id}`,
          tenantName: lc.tenant_name!,
          propertyId: lc.property_id,
          propertyName: lc.properties?.name || null,
          propertyAddress: lc.properties?.address || lc.address || null,
          propertyCity: lc.properties?.city || null,
          unitNumber: null,
          sizeSf: lc.size_sf,
          leaseExpiry,
          trackedAt: lc.created_at,
          source: 'transaction' as const,
          leaseCompId: lc.id,
        };
      });

      const combined = [...manualEntries, ...leaseCompEntries];
      combined.sort((a, b) => new Date(b.trackedAt).getTime() - new Date(a.trackedAt).getTime());

      return combined;
    },
  });
}
