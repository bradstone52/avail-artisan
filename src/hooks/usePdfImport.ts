import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface BrokerageProfile {
  id: string;
  name: string;
  display_name: string;
  extraction_hints: unknown;
  created_at: string;
}

export interface ImportBatch {
  id: string;
  brokerage_id: string | null;
  filename: string;
  total_listings: number;
  imported_count: number;
  skipped_count: number;
  status: string;
  created_at: string;
  completed_at: string | null;
}

export interface StagingRecord {
  id: string;
  import_batch_id: string;
  brokerage_id: string | null;
  source_filename: string;
  extracted_data: unknown;
  matched_listing_id: string | null;
  match_confidence: number | null;
  import_status: string;
  import_action: string | null;
}

export interface ExistingListing {
  id: string;
  address: string;
  display_address: string | null;
  city: string;
  submarket: string;
  size_sf: number;
  status: string;
  asking_rate_psf: string | null;
  availability_date: string | null;
}

export function usePdfImport() {
  const { session } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [brokerages, setBrokerages] = useState<BrokerageProfile[]>([]);
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [stagingRecords, setStagingRecords] = useState<StagingRecord[]>([]);
  const [matchedListings, setMatchedListings] = useState<Record<string, ExistingListing>>({});
  const [loading, setLoading] = useState(false);

  // Fetch all brokerage profiles
  const fetchBrokerages = useCallback(async () => {
    const { data, error } = await supabase
      .from('brokerage_profiles')
      .select('*')
      .order('display_name');

    if (error) {
      console.error('Error fetching brokerages:', error);
      return;
    }

    setBrokerages(data || []);
  }, []);

  // Fetch import batches
  const fetchBatches = useCallback(async () => {
    const { data, error } = await supabase
      .from('pdf_import_batches')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching batches:', error);
      return;
    }

    setBatches(data || []);
  }, []);

  // Fetch staging records for a batch
  const fetchStagingRecords = useCallback(async (batchId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pdf_import_staging')
        .select('*')
        .eq('import_batch_id', batchId)
        .order('id');

      if (error) throw error;

      setStagingRecords(data || []);

      // Fetch matched listings
      const matchedIds = (data || [])
        .filter((r) => r.matched_listing_id)
        .map((r) => r.matched_listing_id as string);

      if (matchedIds.length > 0) {
        const { data: listings } = await supabase
          .from('market_listings')
          .select('id, address, display_address, city, submarket, size_sf, status, asking_rate_psf, availability_date')
          .in('id', matchedIds);

        const listingsMap: Record<string, ExistingListing> = {};
        (listings || []).forEach((l) => {
          listingsMap[l.id] = l;
        });
        setMatchedListings(listingsMap);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Upload and parse PDF
  const uploadPdf = useCallback(async (
    file: File,
    brokerageId?: string,
    newBrokerageName?: string
  ): Promise<string | null> => {
    if (!session?.access_token) {
      toast.error('Not authenticated');
      return null;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (brokerageId) {
        formData.append('brokerage_id', brokerageId);
      } else if (newBrokerageName) {
        formData.append('brokerage_name', newBrokerageName);
      }

      const response = await supabase.functions.invoke('parse-brokerage-pdf', {
        body: formData,
      });

      if (response.error) {
        throw new Error(response.error.message || 'Upload failed');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast.success(`Extracted ${response.data.total_extracted} listings`);
      return response.data.batch_id;
    } catch (err) {
      console.error('Upload error:', err);
      toast.error(err instanceof Error ? err.message : 'Upload failed');
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [session]);

  // Update staging record action
  const updateStagingAction = useCallback(async (
    recordId: string,
    action: 'import' | 'update' | 'skip'
  ) => {
    const { error } = await supabase
      .from('pdf_import_staging')
      .update({ import_action: action })
      .eq('id', recordId);

    if (error) {
      toast.error('Failed to update action');
      return;
    }

    setStagingRecords((prev) =>
      prev.map((r) => (r.id === recordId ? { ...r, import_action: action } : r))
    );
  }, []);

  // Execute import for selected records
  const executeImport = useCallback(async (batchId: string) => {
    const toImport = stagingRecords.filter((r) => r.import_action === 'import' || r.import_action === 'update');

    if (toImport.length === 0) {
      toast.warning('No records selected for import');
      return false;
    }

    let importedCount = 0;
    let skippedCount = 0;

    for (const record of toImport) {
      const data = record.extracted_data as Record<string, unknown>;

      if (record.import_action === 'update' && record.matched_listing_id) {
        // Update existing listing
        const { error } = await supabase
          .from('market_listings')
          .update({
            size_sf: data.size_sf as number || undefined,
            clear_height_ft: data.clear_height_ft as number || undefined,
            dock_doors: data.dock_doors as number || undefined,
            drive_in_doors: data.drive_in_doors as number || undefined,
            asking_rate_psf: data.asking_rate_psf as string || undefined,
            availability_date: data.availability_date as string || undefined,
            landlord: data.landlord as string || undefined,
            broker_source: data.broker_source as string || undefined,
            notes_public: data.notes_public as string || undefined,
            updated_at: new Date().toISOString(),
          })
          .eq('id', record.matched_listing_id);

        if (error) {
          console.error('Update error:', error);
          skippedCount++;
        } else {
          importedCount++;
        }
      } else if (record.import_action === 'import') {
        // Create new listing
        const { data: userData } = await supabase.auth.getUser();
        const { data: orgData } = await supabase.rpc('get_user_org_ids', { _user_id: userData.user?.id });
        const orgId = orgData?.[0];

        const listingId = `PDF-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

        const { error } = await supabase
          .from('market_listings')
          .insert({
            listing_id: listingId,
            address: data.address as string,
            city: (data.city as string) || '',
            submarket: (data.submarket as string) || '',
            size_sf: (data.size_sf as number) || 0,
            clear_height_ft: data.clear_height_ft as number || null,
            dock_doors: data.dock_doors as number || null,
            drive_in_doors: data.drive_in_doors as number || null,
            asking_rate_psf: data.asking_rate_psf as string || null,
            availability_date: data.availability_date as string || null,
            landlord: data.landlord as string || null,
            broker_source: data.broker_source as string || null,
            listing_type: data.listing_type as string || null,
            notes_public: data.notes_public as string || null,
            yard: data.yard as string || 'Unknown',
            sprinkler: data.sprinkler as string || null,
            power_amps: data.power_amps as string || null,
            trailer_parking: data.trailer_parking as string || 'Unknown',
            cross_dock: data.cross_dock as string || 'Unknown',
            status: 'Active',
            user_id: userData.user?.id,
            org_id: orgId,
          });

        if (error) {
          console.error('Insert error:', error);
          skippedCount++;
        } else {
          importedCount++;
        }
      }

      // Mark as imported
      await supabase
        .from('pdf_import_staging')
        .update({
          import_status: 'imported',
          imported_at: new Date().toISOString(),
        })
        .eq('id', record.id);
    }

    // Update batch
    await supabase
      .from('pdf_import_batches')
      .update({
        imported_count: importedCount,
        skipped_count: skippedCount,
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', batchId);

    toast.success(`Imported ${importedCount} listings, skipped ${skippedCount}`);
    return true;
  }, [stagingRecords]);

  return {
    isUploading,
    loading,
    brokerages,
    batches,
    stagingRecords,
    matchedListings,
    fetchBrokerages,
    fetchBatches,
    fetchStagingRecords,
    uploadPdf,
    updateStagingAction,
    executeImport,
  };
}
