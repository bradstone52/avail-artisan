import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { addMonths, differenceInMonths } from 'date-fns';

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
  transactionId?: string;
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
      // Fetch manual tenants with property join
      const { data: manualTenants, error: manualError } = await supabase
        .from('property_tenants')
        .select('*, properties(name, address, city)')
        .not('lease_expiry', 'is', null);

      if (manualError) throw manualError;

      // Fetch lease transactions with term data
      const { data: leaseTransactions, error: transactionError } = await supabase
        .from('transactions')
        .select('*, properties(name, address, city)')
        .eq('transaction_type', 'Lease')
        .not('closing_date', 'is', null)
        .not('lease_term_months', 'is', null);

      if (transactionError) throw transactionError;

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

      // Transform transaction-derived tenants
      const transactionExpiries: TenantExpiry[] = (leaseTransactions || [])
        .filter((tx) => (tx.buyer_tenant_name || tx.buyer_tenant_company) && tx.closing_date && tx.lease_term_months)
        .map((tx) => {
          const commencementDate = new Date(tx.closing_date!);
          const expiryDate = addMonths(commencementDate, tx.lease_term_months!);
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
            commencementDate: tx.closing_date,
            expiryDate: expiryDate.toISOString().split('T')[0],
            source: 'transaction' as const,
            transactionId: tx.id,
          };
        });

      // Combine and sort by expiry date (ascending)
      const combined = [...manualExpiries, ...transactionExpiries];
      combined.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

      return combined;
    },
  });
}
