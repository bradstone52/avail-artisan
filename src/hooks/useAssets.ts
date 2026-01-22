import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Asset {
  id: string;
  name: string;
  address: string;
  display_address: string | null;
  city: string;
  submarket: string;
  property_type: string | null;
  size_sf: number | null;
  land_acres: number | null;
  year_built: number | null;
  zoning: string | null;
  building_class: string | null;
  clear_height_ft: number | null;
  dock_doors: number | null;
  drive_in_doors: number | null;
  owner_name: string | null;
  owner_company: string | null;
  owner_email: string | null;
  owner_phone: string | null;
  purchase_date: string | null;
  purchase_price: number | null;
  assessed_value: number | null;
  property_tax_annual: number | null;
  photo_url: string | null;
  notes: string | null;
  internal_notes: string | null;
  latitude: number | null;
  longitude: number | null;
  geocoded_at: string | null;
  geocode_source: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface AssetListingLink {
  id: string;
  asset_id: string;
  market_listing_id: string;
  link_type: string;
  created_at: string;
  created_by: string | null;
}

export interface AssetWithLinks extends Asset {
  linked_listings?: {
    id: string;
    listing_id: string;
    address: string;
    status: string;
    size_sf: number;
    link_type: string;
  }[];
  active_listing_count?: number;
}

export function useAssets() {
  const [assets, setAssets] = useState<AssetWithLinks[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAssets = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch assets
      const { data: assetsData, error: assetsError } = await supabase
        .from('assets')
        .select('*')
        .order('name', { ascending: true });

      if (assetsError) throw assetsError;

      // Fetch all links with market listing info
      const { data: linksData, error: linksError } = await supabase
        .from('asset_listing_links')
        .select('*');

      if (linksError) throw linksError;

      // Fetch market listings for the linked ones
      const linkedListingIds = linksData?.map(l => l.market_listing_id) || [];
      let marketListingsMap: Record<string, any> = {};
      
      if (linkedListingIds.length > 0) {
        const { data: marketListings } = await supabase
          .from('market_listings')
          .select('id, listing_id, address, status, size_sf')
          .in('id', linkedListingIds);
        
        marketListingsMap = (marketListings || []).reduce((acc, ml) => {
          acc[ml.id] = ml;
          return acc;
        }, {} as Record<string, any>);
      }

      // Also find auto-matches by address
      const { data: allMarketListings } = await supabase
        .from('market_listings')
        .select('id, listing_id, address, status, size_sf');

      // Build assets with their linked listings
      const assetsWithLinks: AssetWithLinks[] = (assetsData || []).map(asset => {
        // Get manual links
        const manualLinks = (linksData || [])
          .filter(link => link.asset_id === asset.id)
          .map(link => {
            const ml = marketListingsMap[link.market_listing_id];
            return ml ? {
              id: ml.id,
              listing_id: ml.listing_id,
              address: ml.address,
              status: ml.status,
              size_sf: ml.size_sf,
              link_type: link.link_type
            } : null;
          })
          .filter(Boolean);

        // Find auto-matches by address (case-insensitive, trimmed)
        const normalizedAssetAddress = asset.address?.toLowerCase().trim();
        const autoMatches = (allMarketListings || [])
          .filter(ml => {
            const normalizedListingAddress = ml.address?.toLowerCase().trim();
            return normalizedAssetAddress && normalizedListingAddress === normalizedAssetAddress;
          })
          .filter(ml => !manualLinks.some(link => link?.id === ml.id))
          .map(ml => ({
            id: ml.id,
            listing_id: ml.listing_id,
            address: ml.address,
            status: ml.status,
            size_sf: ml.size_sf,
            link_type: 'auto'
          }));

        const allLinked = [...manualLinks, ...autoMatches].filter(Boolean) as AssetWithLinks['linked_listings'];
        const activeCount = allLinked?.filter(l => l.status === 'Active' || l.status === 'Under Contract').length || 0;

        return {
          ...asset,
          linked_listings: allLinked,
          active_listing_count: activeCount
        };
      });

      setAssets(assetsWithLinks);
    } catch (error: any) {
      console.error('Error fetching assets:', error);
      toast({
        title: 'Error loading assets',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const createAsset = async (asset: Partial<Asset>): Promise<Asset | null> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('assets')
        .insert({
          name: asset.name || '',
          address: asset.address!,
          display_address: asset.display_address,
          city: asset.city || '',
          submarket: asset.submarket || '',
          property_type: asset.property_type,
          size_sf: asset.size_sf,
          land_acres: asset.land_acres,
          year_built: asset.year_built,
          zoning: asset.zoning,
          building_class: asset.building_class,
          clear_height_ft: asset.clear_height_ft,
          dock_doors: asset.dock_doors,
          drive_in_doors: asset.drive_in_doors,
          owner_name: asset.owner_name,
          owner_company: asset.owner_company,
          owner_email: asset.owner_email,
          owner_phone: asset.owner_phone,
          purchase_date: asset.purchase_date,
          purchase_price: asset.purchase_price,
          assessed_value: asset.assessed_value,
          property_tax_annual: asset.property_tax_annual,
          photo_url: asset.photo_url,
          notes: asset.notes,
          internal_notes: asset.internal_notes,
          created_by: userData.user?.id
        })
        .select()
        .single();

      if (error) throw error;

      toast({ title: 'Asset created successfully' });
      await fetchAssets();
      return data as Asset;
    } catch (error: any) {
      console.error('Error creating asset:', error);
      toast({
        title: 'Error creating asset',
        description: error.message,
        variant: 'destructive'
      });
      return null;
    }
  };

  const updateAsset = async (id: string, updates: Partial<Asset>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('assets')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Asset updated successfully' });
      await fetchAssets();
      return true;
    } catch (error: any) {
      console.error('Error updating asset:', error);
      toast({
        title: 'Error updating asset',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    }
  };

  const deleteAsset = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('assets')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Asset deleted successfully' });
      await fetchAssets();
      return true;
    } catch (error: any) {
      console.error('Error deleting asset:', error);
      toast({
        title: 'Error deleting asset',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    }
  };

  const linkListing = async (assetId: string, marketListingId: string): Promise<boolean> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('asset_listing_links')
        .insert({
          asset_id: assetId,
          market_listing_id: marketListingId,
          link_type: 'manual',
          created_by: userData.user?.id
        });

      if (error) throw error;

      toast({ title: 'Listing linked to asset' });
      await fetchAssets();
      return true;
    } catch (error: any) {
      console.error('Error linking listing:', error);
      toast({
        title: 'Error linking listing',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    }
  };

  const unlinkListing = async (assetId: string, marketListingId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('asset_listing_links')
        .delete()
        .eq('asset_id', assetId)
        .eq('market_listing_id', marketListingId);

      if (error) throw error;

      toast({ title: 'Listing unlinked from asset' });
      await fetchAssets();
      return true;
    } catch (error: any) {
      console.error('Error unlinking listing:', error);
      toast({
        title: 'Error unlinking listing',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    }
  };

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  return {
    assets,
    loading,
    fetchAssets,
    createAsset,
    updateAsset,
    deleteAsset,
    linkListing,
    unlinkListing
  };
}
