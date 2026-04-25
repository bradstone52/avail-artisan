import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Property {
  id: string;
  name: string;
  address: string;
  display_address: string | null;
  city_lookup_address: string | null;
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
  drive_in_door_dimensions: string[] | null | any;
  assessed_value: number | null;
  property_tax_annual: number | null;
  photo_url: string | null;
  notes: string | null;
  internal_notes: string | null;
  latitude: number | null;
  longitude: number | null;
  geocoded_at: string | null;
  geocode_source: string | null;
  // City of Calgary data
  roll_number: string | null;
  assessed_land_value: number | null;
  assessed_improvement_value: number | null;
  tax_class: string | null;
  legal_description: string | null;
  land_use_designation: string | null;
  community_name: string | null;
  city_data_fetched_at: string | null;
  city_data_raw: unknown;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface PropertyListingLink {
  id: string;
  property_id: string;
  market_listing_id: string;
  link_type: string;
  created_at: string;
  created_by: string | null;
}

export interface PropertyPhoto {
  id: string;
  property_id: string;
  photo_url: string;
  caption: string | null;
  sort_order: number;
  created_at: string;
  created_by: string | null;
}

export interface PropertyBrochure {
  id: string;
  property_id: string;
  market_listing_id: string | null;
  listing_id: string | null;
  original_url: string;
  storage_path: string;
  file_size: number | null;
  downloaded_at: string;
  listing_snapshot: unknown;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  download_method: string | null;
}

export interface PropertyPermit {
  id: string;
  property_id: string;
  permit_number: string;
  permit_type: string;
  permit_class: string | null;
  description: string | null;
  status: string | null;
  applied_date: string | null;
  issued_date: string | null;
  completed_date: string | null;
  estimated_value: number | null;
  contractor_name: string | null;
  raw_data: unknown;
  fetched_at: string;
  created_at: string;
}

export interface LinkedListing {
  id: string;
  listing_id: string;
  address: string;
  status: string;
  size_sf: number;
  link_type: string;
  link?: string | null;
  brochure_link?: string | null;
}

export interface PropertyLeaseComp {
  id: string;
  commencement_date: string | null;
  size_sf: number | null;
  net_rate_psf: number | null;
  term_months: number | null;
  tenant_name: string | null;
  landlord_name: string | null;
  is_tracked: boolean;
  created_at: string;
}

export interface PropertyWithLinks extends Property {
  linked_listings?: LinkedListing[];
  active_listing_count?: number;
  photos?: PropertyPhoto[];
  brochures?: PropertyBrochure[];
  permits?: PropertyPermit[];
  leaseComps?: PropertyLeaseComp[];
}

export function useProperties() {
  const [properties, setProperties] = useState<PropertyWithLinks[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchProperties = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch properties
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('properties')
        .select('*')
        .order('name', { ascending: true });

      if (propertiesError) throw propertiesError;

      // Fetch all links with market listing info
      const { data: linksData, error: linksError } = await supabase
        .from('property_listing_links')
        .select('*');

      if (linksError) throw linksError;

      // Fetch all property photos
      const { data: photosData, error: photosError } = await supabase
        .from('property_photos')
        .select('*')
        .order('sort_order', { ascending: true });

      if (photosError) throw photosError;

      // Fetch market listings for the linked ones
      const linkedListingIds = linksData?.map(l => l.market_listing_id) || [];
      let marketListingsMap: Record<string, any> = {};
      
      if (linkedListingIds.length > 0) {
        const { data: marketListings } = await supabase
          .from('market_listings')
          .select('id, listing_id, address, status, size_sf, link, brochure_link')
          .in('id', linkedListingIds);
        
        marketListingsMap = (marketListings || []).reduce((acc, ml) => {
          acc[ml.id] = ml;
          return acc;
        }, {} as Record<string, any>);
      }

      // Also find auto-matches by address
      const { data: allMarketListings } = await supabase
        .from('market_listings')
        .select('id, listing_id, address, status, size_sf, link, brochure_link');

      // Build properties with their linked listings
      const propertiesWithLinks: PropertyWithLinks[] = (propertiesData || []).map(property => {
        // Get manual links
        const manualLinks = (linksData || [])
          .filter(link => link.property_id === property.id)
          .map(link => {
            const ml = marketListingsMap[link.market_listing_id];
            return ml ? {
              id: ml.id,
              listing_id: ml.listing_id,
              address: ml.address,
              status: ml.status,
              size_sf: ml.size_sf,
              link: ml.link,
              brochure_link: ml.brochure_link,
              link_type: link.link_type
            } : null;
          })
          .filter(Boolean);

        // Find auto-matches by address OR display_address (case-insensitive, trimmed)
        // This allows the main address to be used for City of Calgary lookups
        // while display_address maintains the market listing link
        const normalizedPropertyAddress = property.address?.toLowerCase().trim();
        const normalizedDisplayAddress = property.display_address?.toLowerCase().trim();
        const autoMatches = (allMarketListings || [])
          .filter(ml => {
            const normalizedListingAddress = ml.address?.toLowerCase().trim();
            // Match on either the main address OR the display address
            return normalizedListingAddress && (
              (normalizedPropertyAddress && normalizedListingAddress === normalizedPropertyAddress) ||
              (normalizedDisplayAddress && normalizedListingAddress === normalizedDisplayAddress)
            );
          })
          .filter(ml => !manualLinks.some(link => link?.id === ml.id))
          .map(ml => ({
            id: ml.id,
            listing_id: ml.listing_id,
            address: ml.address,
            status: ml.status,
            size_sf: ml.size_sf,
            link: ml.link,
            brochure_link: ml.brochure_link,
            link_type: 'auto'
          }));

        const allLinked = [...manualLinks, ...autoMatches].filter(Boolean) as PropertyWithLinks['linked_listings'];
        const activeCount = allLinked?.filter(l => l.status === 'Active' || l.status === 'Under Contract').length || 0;

        // Get photos for this property
        const propertyPhotos = (photosData || []).filter(p => p.property_id === property.id) as PropertyPhoto[];

        return {
          ...property,
          linked_listings: allLinked,
          active_listing_count: activeCount,
          photos: propertyPhotos
        };
      });

      setProperties(propertiesWithLinks);
    } catch (error: any) {
      console.error('Error fetching properties:', error);
      toast({
        title: 'Error loading properties',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const createProperty = async (property: Partial<Property>): Promise<Property | null> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('properties')
        .insert({
          name: property.name || '',
          address: property.address!,
          display_address: property.display_address,
          city_lookup_address: property.city_lookup_address,
          city: property.city || '',
          submarket: property.submarket || '',
          property_type: property.property_type,
          size_sf: property.size_sf,
          land_acres: property.land_acres,
          year_built: property.year_built,
          zoning: property.zoning,
          building_class: property.building_class,
          clear_height_ft: property.clear_height_ft,
          dock_doors: property.dock_doors,
          drive_in_doors: property.drive_in_doors,
          assessed_value: property.assessed_value,
          property_tax_annual: property.property_tax_annual,
          photo_url: property.photo_url,
          notes: property.notes,
          internal_notes: property.internal_notes,
          created_by: userData.user?.id
        })
        .select()
        .single();

      if (error) throw error;

      // For Calgary properties, auto-assign submarket via geocoding (fire and forget)
      if (data && property.city?.toLowerCase().includes('calgary')) {
        supabase.functions.invoke('geocode-property', {
          body: { 
            propertyId: data.id, 
            address: property.address, 
            city: property.city 
          }
        }).then(() => {
          // Refetch to get updated submarket
          fetchProperties();
        }).catch(err => {
          console.error('Error geocoding property:', err);
        });
      }

      toast({ title: 'Property created successfully' });
      await fetchProperties();
      return data as Property;
    } catch (error: any) {
      console.error('Error creating property:', error);
      toast({
        title: 'Error creating property',
        description: error.message,
        variant: 'destructive'
      });
      return null;
    }
  };

  const updateProperty = async (id: string, updates: Partial<Property>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('properties')
        .update(updates as any)
        .eq('id', id);

      if (error) throw error;

      // For Calgary properties, auto-assign submarket via geocoding if address changed
      // (fire and forget to not block the UI)
      if (updates.address && updates.city?.toLowerCase().includes('calgary')) {
        supabase.functions.invoke('geocode-property', {
          body: { 
            propertyId: id, 
            address: updates.address, 
            city: updates.city 
          }
        }).then(() => {
          // Refetch to get updated submarket
          fetchProperties();
        }).catch(err => {
          console.error('Error geocoding property:', err);
        });
      }

      toast({ title: 'Property updated successfully' });
      await fetchProperties();
      return true;
    } catch (error: any) {
      console.error('Error updating property:', error);
      toast({
        title: 'Error updating property',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    }
  };

  const deleteProperty = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Property deleted successfully' });
      await fetchProperties();
      return true;
    } catch (error: any) {
      console.error('Error deleting property:', error);
      toast({
        title: 'Error deleting property',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    }
  };

  const linkListing = async (propertyId: string, marketListingId: string): Promise<boolean> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('property_listing_links')
        .insert({
          property_id: propertyId,
          market_listing_id: marketListingId,
          link_type: 'manual',
          created_by: userData.user?.id
        });

      if (error) throw error;

      toast({ title: 'Listing linked to property' });
      await fetchProperties();
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

  const unlinkListing = async (propertyId: string, marketListingId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('property_listing_links')
        .delete()
        .eq('property_id', propertyId)
        .eq('market_listing_id', marketListingId);

      if (error) throw error;

      toast({ title: 'Listing unlinked from property' });
      await fetchProperties();
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
    fetchProperties();
  }, [fetchProperties]);

  const importFromMarketListings = async (): Promise<{ created: number; skipped: number }> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      // Fetch all market listings
      const { data: marketListings, error: mlError } = await supabase
        .from('market_listings')
        .select('address, city, submarket, size_sf, clear_height_ft, dock_doors, drive_in_doors, listing_type');

      if (mlError) throw mlError;

      // Fetch existing property addresses for comparison
      const { data: existingProperties, error: propError } = await supabase
        .from('properties')
        .select('address');

      if (propError) throw propError;

      // Normalize addresses for comparison
      const normalizeAddress = (addr: string) => addr?.toLowerCase().trim() || '';
      const existingAddresses = new Set(
        (existingProperties || []).map(p => normalizeAddress(p.address))
      );

      // Get unique addresses from market listings that don't exist in properties
      const uniqueListings = new Map<string, typeof marketListings[0]>();
      
      for (const listing of marketListings || []) {
        const normalized = normalizeAddress(listing.address);
        if (!normalized) continue;
        
        // Skip if already exists in properties
        if (existingAddresses.has(normalized)) continue;
        
        // Keep first occurrence (or one with more data)
        if (!uniqueListings.has(normalized)) {
          uniqueListings.set(normalized, listing);
        }
      }

      // Create properties from unique listings
      const toCreate = Array.from(uniqueListings.values());
      let created = 0;
      let skipped = 0;

      for (const listing of toCreate) {
        const { error } = await supabase
          .from('properties')
          .insert({
            name: listing.address, // Use address as name initially
            address: listing.address,
            city: listing.city || '',
            submarket: listing.submarket || '',
            size_sf: listing.size_sf || null,
            clear_height_ft: listing.clear_height_ft || null,
            dock_doors: listing.dock_doors || null,
            drive_in_doors: listing.drive_in_doors || null,
            property_type: listing.listing_type || null,
            created_by: userData.user?.id
          });

        if (error) {
          console.error('Error creating property:', error);
          skipped++;
        } else {
          created++;
        }
      }

      toast({ 
        title: 'Import complete',
        description: `Created ${created} properties, skipped ${skipped} (${existingAddresses.size} already existed)`
      });
      
      await fetchProperties();
      return { created, skipped };
    } catch (error: any) {
      console.error('Error importing from market listings:', error);
      toast({
        title: 'Error importing properties',
        description: error.message,
        variant: 'destructive'
      });
      return { created: 0, skipped: 0 };
    }
  };

  return {
    properties,
    loading,
    fetchProperties,
    createProperty,
    updateProperty,
    deleteProperty,
    linkListing,
    unlinkListing,
    importFromMarketListings
  };
}

// Hook for fetching a single property with all details
export function usePropertyDetail(propertyId: string | undefined) {
  const [property, setProperty] = useState<PropertyWithLinks | null>(null);
  const [brochures, setBrochures] = useState<PropertyBrochure[]>([]);
  const [permits, setPermits] = useState<PropertyPermit[]>([]);
  const [leaseComps, setLeaseComps] = useState<PropertyLeaseComp[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPropertyDetail = useCallback(async () => {
    if (!propertyId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch property
      const { data: propertyData, error: propertyError } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .single();

      if (propertyError) throw propertyError;

      // Fetch photos
      const { data: photosData } = await supabase
        .from('property_photos')
        .select('*')
        .eq('property_id', propertyId)
        .order('sort_order', { ascending: true });

      // Fetch brochures
      const { data: brochuresData } = await supabase
        .from('property_brochures')
        .select('*')
        .eq('property_id', propertyId)
        .order('downloaded_at', { ascending: false });

      // Fetch permits
      const { data: permitsData } = await supabase
        .from('property_permits')
        .select('*')
        .eq('property_id', propertyId)
        .order('issued_date', { ascending: false });

      // Fetch lease comps linked to this property
      const { data: leaseCompsData } = await supabase
        .from('lease_comps')
        .select('id, commencement_date, size_sf, net_rate_psf, term_months, tenant_name, landlord_name, is_tracked, created_at')
        .eq('property_id', propertyId)
        .order('commencement_date', { ascending: false });

      // Fetch linked listings
      const { data: linksData } = await supabase
        .from('property_listing_links')
        .select('*')
        .eq('property_id', propertyId);

      // Get market listings for manual links
      const linkedIds = linksData?.map(l => l.market_listing_id) || [];
      let linkedListings: LinkedListing[] = [];
      
      if (linkedIds.length > 0) {
        const { data: mlData } = await supabase
          .from('market_listings')
          .select('id, listing_id, address, status, size_sf, link, brochure_link')
          .in('id', linkedIds);
        
        linkedListings = (mlData || []).map(ml => {
          const link = linksData?.find(l => l.market_listing_id === ml.id);
          return {
            id: ml.id,
            listing_id: ml.listing_id,
            address: ml.address,
            status: ml.status,
            size_sf: ml.size_sf,
            link: ml.link,
            brochure_link: ml.brochure_link,
            link_type: link?.link_type || 'manual'
          };
        });
      }

      // Find auto-matches by address OR display_address
      const normalizedAddr = propertyData.address?.trim().toLowerCase();
      const normalizedDisplay = propertyData.display_address?.trim().toLowerCase();
      
      const { data: allMl } = await supabase
        .from('market_listings')
        .select('id, listing_id, address, status, size_sf, link, brochure_link');
      
      const autoMatches = (allMl || []).filter(ml => {
        const mlAddr = ml.address?.trim().toLowerCase();
        return mlAddr && (
          (normalizedAddr && mlAddr === normalizedAddr) ||
          (normalizedDisplay && mlAddr === normalizedDisplay)
        );
      });

      const autoLinked = (autoMatches || [])
        .filter(ml => !linkedListings.some(ll => ll.id === ml.id))
        .map(ml => ({
          id: ml.id,
          listing_id: ml.listing_id,
          address: ml.address,
          status: ml.status,
          size_sf: ml.size_sf,
          link: ml.link,
          brochure_link: ml.brochure_link,
          link_type: 'auto'
        }));

      const allLinked = [...linkedListings, ...autoLinked];
      const activeCount = allLinked.filter(l => l.status === 'Active' || l.status === 'Under Contract').length;

      setProperty({
        ...propertyData,
        photos: photosData || [],
        linked_listings: allLinked,
        active_listing_count: activeCount,
        leaseComps: leaseCompsData || []
      } as PropertyWithLinks);

      setBrochures(brochuresData || []);
      setPermits(permitsData || []);
      setLeaseComps(leaseCompsData || []);
    } catch (error: any) {
      console.error('Error fetching property detail:', error);
      toast({
        title: 'Error loading property',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [propertyId, toast]);

  useEffect(() => {
    fetchPropertyDetail();
  }, [fetchPropertyDetail]);

  return {
    property,
    brochures,
    permits,
    leaseComps,
    loading,
    refetch: fetchPropertyDetail
  };
}
