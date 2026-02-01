import { useState, useCallback } from 'react';
import { addMonths } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface PropertyTenant {
  id: string;
  property_id: string;
  tenant_name: string;
  unit_number: string | null;
  size_sf: number | null;
  lease_expiry: string | null;
  notes: string | null;
  tracked_at: string;
  tracked_by: string | null;
  created_at: string;
  source?: 'manual' | 'transaction';
  transactionId?: string;
}

export interface CreateTenantData {
  property_id: string;
  tenant_name: string;
  unit_number?: string | null;
  size_sf?: number | null;
  lease_expiry?: string | null;
  notes?: string | null;
}

export interface UpdateTenantData {
  tenant_name?: string;
  unit_number?: string | null;
  size_sf?: number | null;
  lease_expiry?: string | null;
  notes?: string | null;
}

export function usePropertyTenants(propertyId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tenants, setTenants] = useState<PropertyTenant[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTenants = useCallback(async (propId?: string) => {
    const targetId = propId || propertyId;
    if (!targetId) return;

    setLoading(true);
    try {
      // Fetch manual tenants from property_tenants
      const { data: manualTenants, error: manualError } = await supabase
        .from('property_tenants')
        .select('*')
        .eq('property_id', targetId)
        .order('tracked_at', { ascending: false });

      if (manualError) throw manualError;

      // Fetch transaction-derived tenants (leases linked to this property)
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('property_id', targetId)
        .eq('transaction_type', 'Lease')
        .not('buyer_tenant_company', 'is', null);

      if (txError) throw txError;

      // Transform manual tenants
      const manual: PropertyTenant[] = (manualTenants || []).map((t) => ({
        ...t,
        source: 'manual' as const,
      }));

      // Transform transaction tenants
      const fromTransactions: PropertyTenant[] = (transactions || []).map((tx) => {
        let leaseExpiry: string | null = null;
        if (tx.closing_date && tx.lease_term_months) {
          const expiry = addMonths(new Date(tx.closing_date), tx.lease_term_months);
          leaseExpiry = expiry.toISOString().split('T')[0];
        }

        return {
          id: `tx-${tx.id}`,
          property_id: targetId,
          tenant_name: tx.buyer_tenant_company || tx.buyer_tenant_name || 'Unknown',
          unit_number: null,
          size_sf: tx.size_sf,
          lease_expiry: leaseExpiry,
          notes: tx.notes,
          tracked_at: tx.created_at,
          tracked_by: tx.created_by,
          created_at: tx.created_at,
          source: 'transaction' as const,
          transactionId: tx.id,
        };
      });

      // Combine and sort by tracked_at
      const combined = [...manual, ...fromTransactions];
      combined.sort((a, b) => new Date(b.tracked_at).getTime() - new Date(a.tracked_at).getTime());

      setTenants(combined);
    } catch (error: any) {
      console.error('Error fetching tenants:', error);
      toast({
        title: 'Error loading tenants',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [propertyId, toast]);

  const createTenant = useCallback(async (data: CreateTenantData) => {
    if (!user) {
      toast({
        title: 'Not authenticated',
        description: 'Please log in to add tenants',
        variant: 'destructive',
      });
      return null;
    }

    try {
      const { data: created, error } = await supabase
        .from('property_tenants')
        .insert({
          property_id: data.property_id,
          tenant_name: data.tenant_name,
          unit_number: data.unit_number || null,
          size_sf: data.size_sf || null,
          lease_expiry: data.lease_expiry || null,
          notes: data.notes || null,
          tracked_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      setTenants(prev => [created, ...prev]);
      toast({ title: 'Tenant added successfully' });
      return created;
    } catch (error: any) {
      console.error('Error creating tenant:', error);
      toast({
        title: 'Error adding tenant',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
  }, [user, toast]);

  const updateTenant = useCallback(async (tenantId: string, data: UpdateTenantData) => {
    try {
      const { data: updated, error } = await supabase
        .from('property_tenants')
        .update({
          tenant_name: data.tenant_name,
          unit_number: data.unit_number,
          size_sf: data.size_sf,
          lease_expiry: data.lease_expiry,
          notes: data.notes,
        })
        .eq('id', tenantId)
        .select()
        .single();

      if (error) throw error;

      setTenants(prev => prev.map(t => t.id === tenantId ? updated : t));
      toast({ title: 'Tenant updated successfully' });
      return updated;
    } catch (error: any) {
      console.error('Error updating tenant:', error);
      toast({
        title: 'Error updating tenant',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
  }, [toast]);

  const deleteTenant = useCallback(async (tenantId: string) => {
    try {
      const { error } = await supabase
        .from('property_tenants')
        .delete()
        .eq('id', tenantId);

      if (error) throw error;

      setTenants(prev => prev.filter(t => t.id !== tenantId));
      toast({ title: 'Tenant removed' });
      return true;
    } catch (error: any) {
      console.error('Error deleting tenant:', error);
      toast({
        title: 'Error removing tenant',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  return {
    tenants,
    loading,
    fetchTenants,
    createTenant,
    updateTenant,
    deleteTenant,
  };
}
