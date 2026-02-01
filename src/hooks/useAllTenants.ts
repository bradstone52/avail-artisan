import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { addMonths } from 'date-fns';

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
  transactionId?: string;
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

      // Fetch lease transactions with tenant identifiers (name OR company)
      const { data: leaseTransactions, error: transactionError } = await supabase
        .from('transactions')
        .select('*, properties(name, address, city)')
        .eq('transaction_type', 'Lease')
        .or('buyer_tenant_name.not.is.null,buyer_tenant_company.not.is.null')
        .order('created_at', { ascending: false });

      if (transactionError) throw transactionError;

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

      // Transform transaction-derived tenants
      const transactionEntries: TenantWithProperty[] = (leaseTransactions || [])
        .filter((tx) => tx.buyer_tenant_name || tx.buyer_tenant_company)
        .map((tx) => {
          // Calculate lease expiry if we have closing_date and lease_term_months
          let leaseExpiry: string | null = null;
          if (tx.closing_date && tx.lease_term_months) {
            const commencementDate = new Date(tx.closing_date);
            const expiryDate = addMonths(commencementDate, tx.lease_term_months);
            leaseExpiry = expiryDate.toISOString().split('T')[0];
          }

          const tenantName = tx.buyer_tenant_name || tx.buyer_tenant_company;

          return {
            id: `tx-${tx.id}`,
            tenantName: tenantName!,
            propertyId: tx.property_id,
            propertyName: tx.properties?.name || null,
            propertyAddress: tx.properties?.address || tx.address || null,
            propertyCity: tx.properties?.city || tx.city || null,
            unitNumber: null,
            sizeSf: tx.size_sf,
            leaseExpiry,
            trackedAt: tx.created_at,
            source: 'transaction' as const,
            transactionId: tx.id,
          };
        });

      // Combine and sort by trackedAt (most recent first)
      const combined = [...manualEntries, ...transactionEntries];
      combined.sort((a, b) => new Date(b.trackedAt).getTime() - new Date(a.trackedAt).getTime());

      return combined;
    },
  });
}
