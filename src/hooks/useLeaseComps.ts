import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrg } from '@/hooks/useOrg';
import { toast } from 'sonner';

export interface LeaseComp {
  id: string;
  org_id: string | null;
  address: string;
  property_id: string | null;
  submarket: string | null;
  size_sf: number | null;
  net_rate_psf: number | null;
  op_costs_psf: number | null;
  term_months: number | null;
  commencement_date: string | null;
  fixturing_months: number | null;
  tenant_name: string | null;
  landlord_name: string | null;
  source: string | null;
  is_tracked: boolean;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeaseCompInput {
  address: string;
  property_id?: string | null;
  submarket?: string | null;
  size_sf?: number | null;
  net_rate_psf?: number | null;
  op_costs_psf?: number | null;
  term_months?: number | null;
  commencement_date?: string | null;
  fixturing_months?: number | null;
  tenant_name?: string | null;
  landlord_name?: string | null;
  source?: string | null;
  is_tracked?: boolean;
  notes?: string | null;
}

export function useLeaseComps() {
  const { user } = useAuth();
  const { orgId } = useOrg();
  const [leaseComps, setLeaseComps] = useState<LeaseComp[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLeaseComps = useCallback(async () => {
    if (!user || !orgId) {
      setLeaseComps([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('lease_comps')
        .select('*')
        .eq('org_id', orgId)
        .order('commencement_date', { ascending: false });

      if (error) throw error;
      setLeaseComps((data ?? []) as LeaseComp[]);
    } catch (err) {
      console.error('Error fetching lease comps:', err);
      toast.error('Failed to load lease comps');
    } finally {
      setIsLoading(false);
    }
  }, [user, orgId]);

  useEffect(() => {
    fetchLeaseComps();
  }, [fetchLeaseComps]);

  const createLeaseComp = async (input: LeaseCompInput): Promise<LeaseComp | null> => {
    if (!user || !orgId) {
      toast.error('You must be logged in');
      return null;
    }
    try {
      const { data, error } = await supabase
        .from('lease_comps')
        .insert({ ...input, org_id: orgId, created_by: user.id })
        .select()
        .single();

      if (error) throw error;
      toast.success('Lease comp added');
      void fetchLeaseComps();
      return data as LeaseComp;
    } catch (err) {
      console.error('Error creating lease comp:', err);
      toast.error('Failed to save lease comp');
      return null;
    }
  };

  const updateLeaseComp = async (id: string, input: Partial<LeaseCompInput>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('lease_comps')
        .update(input)
        .eq('id', id);

      if (error) throw error;
      toast.success('Lease comp updated');
      await fetchLeaseComps();
      return true;
    } catch (err) {
      console.error('Error updating lease comp:', err);
      toast.error('Failed to update lease comp');
      return false;
    }
  };

  const deleteLeaseComp = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('lease_comps')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Lease comp deleted');
      await fetchLeaseComps();
      return true;
    } catch (err) {
      console.error('Error deleting lease comp:', err);
      toast.error('Failed to delete lease comp');
      return false;
    }
  };

  const getLeaseComp = useCallback(async (id: string): Promise<LeaseComp | null> => {
    try {
      const { data, error } = await supabase
        .from('lease_comps')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as LeaseComp;
    } catch (err) {
      console.error('Error fetching lease comp:', err);
      return null;
    }
  }, []);

  return {
    leaseComps,
    isLoading,
    fetchLeaseComps,
    createLeaseComp,
    updateLeaseComp,
    deleteLeaseComp,
    getLeaseComp,
  };
}
