import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { addMonths, parseISO, differenceInMonths } from 'date-fns';

export interface TenantExpiry {
  id: string;
  tenantName: string;
  propertyId: string | null;
  propertyName: string | null;
  propertyAddress: string | null;
  propertyCity: string | null;
  unitNumber: string | null;
  sizeSf: number | null;
  commencementDate: string | null;
  expiryDate: string;
  source: 'manual' | 'transaction';
  leaseCompId?: string;
}

export type ExpiryStatus = 'expired' | 'urgent' | 'warning' | 'upcoming' | 'future';

export const getExpiryStatus = (expiryDate: string): ExpiryStatus => {
  const today = new Date();
  const expiry = new Date(expiryDate);
  const monthsUntil = differenceInMonths(expiry, today);

  if (monthsUntil < 0) return 'expired';
  if (monthsUntil <= 6) return 'urgent';
  if (monthsUntil <= 9) return 'warning';
  if (monthsUntil <= 12) return 'upcoming';
  return 'future';
};

export function useTenantExpiries() {
  return useQuery({
    queryKey: ['tenant-expiries'],
    queryFn: async (): Promise<TenantExpiry[]> => {
      // Fetch manual tenants with a set expiry date
      const { data: manualTenants, error: manualError } = await supabase
        .from('property_tenants')
        .select('*, properties(name, address, city)')
        .not('lease_expiry', 'is', null);

      if (manualError) throw manualError;

      // Fetch tracked lease comps with enough data to compute expiry
      const { data: leaseComps, error: lcError } = await supabase
        .from('lease_comps')
        .select('*, properties(name, address, city)')
        .eq('is_tracked', true)
        .not('tenant_name', 'is', null)
        .not('commencement_date', 'is', null)
        .not('term_months', 'is', null);

      if (lcError) throw lcError;

      // Transform manual tenants
      const manualExpiries: TenantExpiry[] = (manualTenants || []).map((tenant) => ({
        id: tenant.id,
        tenantName: tenant.tenant_name,
        propertyId: tenant.property_id,
        propertyName: tenant.properties?.name || null,
        propertyAddress: tenant.properties?.address || null,
        propertyCity: tenant.properties?.city || null,
        unitNumber: tenant.unit_number,
        sizeSf: tenant.size_sf,
        commencementDate: null,
        expiryDate: tenant.lease_expiry!,
        source: 'manual' as const,
      }));

      // Transform lease-comp-derived expiries
      const leaseCompExpiries: TenantExpiry[] = (leaseComps || [])
        .filter((lc) => lc.tenant_name && lc.commencement_date && lc.term_months)
        .map((lc) => {
          const expiryDate = addMonths(parseISO(lc.commencement_date!), lc.term_months!);
          return {
            id: `lc-${lc.id}`,
            tenantName: lc.tenant_name!,
            propertyId: lc.property_id,
            propertyName: lc.properties?.name || null,
            propertyAddress: lc.properties?.address || lc.address || null,
            propertyCity: lc.properties?.city || null,
            unitNumber: null,
            sizeSf: lc.size_sf,
            commencementDate: lc.commencement_date,
            expiryDate: expiryDate.toISOString().split('T')[0],
            source: 'transaction' as const,
            leaseCompId: lc.id,
          };
        });

      const combined = [...manualExpiries, ...leaseCompExpiries];
      combined.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

      return combined;
    },
  });
}
