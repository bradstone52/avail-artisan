import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AssetManagerContact {
  id: string;
  asset_manager_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  sort_order: number;
  created_at: string;
  created_by: string | null;
}

export interface AssetManager {
  id: string;
  company_name: string;
  created_at: string;
  created_by: string | null;
  contacts?: AssetManagerContact[];
  asset_count?: number;
}

export function useAssetManagers() {
  const [assetManagers, setAssetManagers] = useState<AssetManager[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAssetManagers = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch asset managers
      const { data: managersData, error: managersError } = await supabase
        .from('asset_managers')
        .select('*')
        .order('company_name', { ascending: true });

      if (managersError) throw managersError;

      // Fetch all contacts
      const { data: contactsData, error: contactsError } = await supabase
        .from('asset_manager_contacts')
        .select('*')
        .order('sort_order', { ascending: true });

      if (contactsError) throw contactsError;

      // Fetch asset links to get counts
      const { data: linksData, error: linksError } = await supabase
        .from('asset_to_asset_manager')
        .select('asset_manager_id');

      if (linksError) throw linksError;

      // Count assets per manager
      const assetCounts: Record<string, number> = {};
      (linksData || []).forEach(link => {
        assetCounts[link.asset_manager_id] = (assetCounts[link.asset_manager_id] || 0) + 1;
      });

      // Build managers with contacts and counts
      const managersWithContacts: AssetManager[] = (managersData || []).map(manager => ({
        ...manager,
        contacts: (contactsData || []).filter(c => c.asset_manager_id === manager.id),
        asset_count: assetCounts[manager.id] || 0
      }));

      setAssetManagers(managersWithContacts);
    } catch (error: any) {
      console.error('Error fetching asset managers:', error);
      toast({
        title: 'Error loading asset managers',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const createAssetManager = async (companyName: string, contacts: Array<{ name: string; email: string; phone: string }>): Promise<AssetManager | null> => {
    try {
      const { data: userData } = await supabase.auth.getUser();

      // Create the asset manager
      const { data: manager, error: managerError } = await supabase
        .from('asset_managers')
        .insert({
          company_name: companyName,
          created_by: userData.user?.id
        })
        .select()
        .single();

      if (managerError) throw managerError;

      // Create contacts if any
      if (contacts.length > 0) {
        const contactsToInsert = contacts.map((contact, index) => ({
          asset_manager_id: manager.id,
          name: contact.name,
          email: contact.email || null,
          phone: contact.phone || null,
          sort_order: index,
          created_by: userData.user?.id
        }));

        const { error: contactsError } = await supabase
          .from('asset_manager_contacts')
          .insert(contactsToInsert);

        if (contactsError) throw contactsError;
      }

      toast({ title: 'Asset manager created successfully' });
      await fetchAssetManagers();
      return manager;
    } catch (error: any) {
      console.error('Error creating asset manager:', error);
      toast({
        title: 'Error creating asset manager',
        description: error.message,
        variant: 'destructive'
      });
      return null;
    }
  };

  const updateAssetManager = async (
    id: string, 
    companyName: string, 
    contacts: Array<{ id?: string; name: string; email: string; phone: string }>
  ): Promise<boolean> => {
    try {
      const { data: userData } = await supabase.auth.getUser();

      // Update company name
      const { error: managerError } = await supabase
        .from('asset_managers')
        .update({ company_name: companyName })
        .eq('id', id);

      if (managerError) throw managerError;

      // Delete existing contacts and re-insert
      const { error: deleteError } = await supabase
        .from('asset_manager_contacts')
        .delete()
        .eq('asset_manager_id', id);

      if (deleteError) throw deleteError;

      // Insert new contacts
      if (contacts.length > 0) {
        const contactsToInsert = contacts.map((contact, index) => ({
          asset_manager_id: id,
          name: contact.name,
          email: contact.email || null,
          phone: contact.phone || null,
          sort_order: index,
          created_by: userData.user?.id
        }));

        const { error: contactsError } = await supabase
          .from('asset_manager_contacts')
          .insert(contactsToInsert);

        if (contactsError) throw contactsError;
      }

      toast({ title: 'Asset manager updated successfully' });
      await fetchAssetManagers();
      return true;
    } catch (error: any) {
      console.error('Error updating asset manager:', error);
      toast({
        title: 'Error updating asset manager',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    }
  };

  const deleteAssetManager = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('asset_managers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Asset manager deleted successfully' });
      await fetchAssetManagers();
      return true;
    } catch (error: any) {
      console.error('Error deleting asset manager:', error);
      toast({
        title: 'Error deleting asset manager',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    }
  };

  const linkAssetToManager = async (assetId: string, assetManagerId: string): Promise<boolean> => {
    try {
      const { data: userData } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('asset_to_asset_manager')
        .insert({
          asset_id: assetId,
          asset_manager_id: assetManagerId,
          created_by: userData.user?.id
        });

      if (error) throw error;

      toast({ title: 'Asset linked to manager' });
      await fetchAssetManagers();
      return true;
    } catch (error: any) {
      console.error('Error linking asset to manager:', error);
      toast({
        title: 'Error linking asset',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    }
  };

  const unlinkAssetFromManager = async (assetId: string, assetManagerId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('asset_to_asset_manager')
        .delete()
        .eq('asset_id', assetId)
        .eq('asset_manager_id', assetManagerId);

      if (error) throw error;

      toast({ title: 'Asset unlinked from manager' });
      await fetchAssetManagers();
      return true;
    } catch (error: any) {
      console.error('Error unlinking asset:', error);
      toast({
        title: 'Error unlinking asset',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    }
  };

  const getManagersForAsset = async (assetId: string): Promise<AssetManager[]> => {
    try {
      const { data: links, error: linksError } = await supabase
        .from('asset_to_asset_manager')
        .select('asset_manager_id')
        .eq('asset_id', assetId);

      if (linksError) throw linksError;

      const managerIds = (links || []).map(l => l.asset_manager_id);
      return assetManagers.filter(m => managerIds.includes(m.id));
    } catch (error: any) {
      console.error('Error getting managers for asset:', error);
      return [];
    }
  };

  useEffect(() => {
    fetchAssetManagers();
  }, [fetchAssetManagers]);

  return {
    assetManagers,
    loading,
    fetchAssetManagers,
    createAssetManager,
    updateAssetManager,
    deleteAssetManager,
    linkAssetToManager,
    unlinkAssetFromManager,
    getManagersForAsset
  };
}
