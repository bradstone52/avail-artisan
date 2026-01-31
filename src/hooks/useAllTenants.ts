import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TenantWithProperty {
  id: string;
  tenantName: string;
  propertyId: string;
  propertyName: string | null;
  propertyAddress: string | null;
  propertyCity: string | null;
  unitNumber: string | null;
  sizeSf: number | null;
  leaseExpiry: string | null;
  trackedAt: string;
}

export function useAllTenants() {
  return useQuery({
    queryKey: ['all-tenants'],
    queryFn: async (): Promise<TenantWithProperty[]> => {
      const { data, error } = await supabase
        .from('property_tenants')
        .select('*, properties(name, address, city)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((tenant) => ({
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
      }));
    },
  });
}
