import { useState, useCallback } from 'react';
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
      const { data, error } = await supabase
        .from('property_tenants')
        .select('*')
        .eq('property_id', targetId)
        .order('tracked_at', { ascending: false });

      if (error) throw error;
      setTenants(data || []);
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
