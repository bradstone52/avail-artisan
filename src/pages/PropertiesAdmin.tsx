import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useProperties } from '@/hooks/useProperties';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, Download, RefreshCw, Database, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { queueGlobalToast } from '@/hooks/useGlobalToast';

export default function PropertiesAdmin() {
  const { toast } = useToast();
  const { properties, fetchProperties, importFromMarketListings } = useProperties();

  const [isSavingAllBrochures, setIsSavingAllBrochures] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isFetchingCityData, setIsFetchingCityData] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number; matched?: number; unmatched?: number } | null>(null);
  const [currentSyncId, setCurrentSyncId] = useState<string | null>(null);

  // Check for active sync on mount and resume tracking if one is running
  useEffect(() => {
    const checkActiveSync = async () => {
      const { data } = await supabase
        .from('workspace_settings')
        .select('value')
        .eq('key', 'city_data_sync_progress')
        .maybeSingle();

      if (data?.value) {
        const progress = data.value as { current: number; total: number; status: string; syncId: string; matched?: number; unmatched?: number };
        if (progress.status === 'running') {
          setIsFetchingCityData(true);
          setCurrentSyncId(progress.syncId);
          setSyncProgress({ current: progress.current, total: progress.total, matched: progress.matched, unmatched: progress.unmatched });
        }
      }
    };

    checkActiveSync();
  }, []);

  // Poll for progress whenever a sync is active
  useEffect(() => {
    if (!isFetchingCityData || !currentSyncId) return;

    const pollInterval = setInterval(async () => {
      const { data } = await supabase
        .from('workspace_settings')
        .select('value')
        .eq('key', 'city_data_sync_progress')
        .maybeSingle();

      if (data?.value) {
        const progress = data.value as {
          current: number;
          total: number;
          status: string;
          syncId: string;
          matched?: number;
          unmatched?: number;
          unmatchedAddresses?: { id: string; address: string }[];
        };

        if (progress.syncId !== currentSyncId) return;

        setSyncProgress({
          current: progress.current,
          total: progress.total,
          matched: progress.matched,
          unmatched: progress.unmatched,
        });

        if (progress.status === 'complete') {
          fetchProperties();
          const matchedCount = progress.matched || 0;
          const unmatchedCount = progress.unmatched || 0;

          if (unmatchedCount > 0) {
            queueGlobalToast({
              title: 'City data sync complete',
              description: `${matchedCount} of ${progress.total} properties matched. ${unmatchedCount} need manual review.`,
            });
          } else {
            queueGlobalToast({
              title: 'City data sync complete',
              description: `All ${matchedCount} properties matched successfully`,
            });
          }
          setIsFetchingCityData(false);
          setSyncProgress(null);
          setCurrentSyncId(null);
        } else if (progress.status === 'failed') {
          queueGlobalToast({
            title: 'Sync failed',
            description: 'An error occurred during sync',
            variant: 'destructive',
          });
          setIsFetchingCityData(false);
          setSyncProgress(null);
          setCurrentSyncId(null);
        }
      }
    }, 1000);

    return () => clearInterval(pollInterval);
  }, [isFetchingCityData, currentSyncId, fetchProperties]);

  const handleSaveAllBrochures = async () => {
    setIsSavingAllBrochures(true);
    let saved = 0;
    let skipped = 0;
    let failed = 0;

    try {
      for (const property of properties) {
        if (!property.linked_listings) continue;

        for (const listing of property.linked_listings) {
          if (!listing.brochure_link && !listing.link) continue;

          try {
            const { data, error } = await supabase.functions.invoke('download-brochure', {
              body: {
                propertyId: property.id,
                marketListingId: listing.id,
                listingId: listing.listing_id,
                brochureUrl: (listing.brochure_link || listing.link)!,
              },
            });

            const errorStatuses = ['restricted', 'invalid_url', 'dns_error', 'not_found', 'error'];
            if (error) {
              failed++;
            } else if (data?.status === 'file_too_large') {
              skipped++;
            } else if (data?.status && errorStatuses.includes(data.status)) {
              failed++;
            } else {
              saved++;
            }
          } catch {
            failed++;
          }
        }
      }

      const parts = [];
      if (saved > 0) parts.push(`${saved} saved`);
      if (skipped > 0) parts.push(`${skipped} skipped (too large)`);
      if (failed > 0) parts.push(`${failed} failed`);

      toast({
        title: 'Brochure save complete',
        description: parts.join(', ') || 'No brochures to process',
      });
    } catch (error: any) {
      toast({
        title: 'Error saving brochures',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSavingAllBrochures(false);
    }
  };

  const handleFetchAllCityData = async () => {
    const { data: existingSync } = await supabase
      .from('workspace_settings')
      .select('value')
      .eq('key', 'city_data_sync_progress')
      .maybeSingle();

    if (existingSync?.value) {
      const existing = existingSync.value as { status: string };
      if (existing.status === 'running') {
        toast({
          title: 'Sync already in progress',
          description: 'Please wait for the current sync to complete',
          variant: 'destructive',
        });
        return;
      }
    }

    setIsFetchingCityData(true);
    setSyncProgress(null);
    setCurrentSyncId(null);
    toast({
      title: 'Starting sync',
      description: 'Fetching city data for Calgary properties...',
    });

    try {
      const { data, error } = await supabase.functions.invoke('nightly-property-sync');

      if (error) {
        queueGlobalToast({
          title: 'Sync failed',
          description: error.message,
          variant: 'destructive',
        });
        setIsFetchingCityData(false);
      } else if (data?.results?.syncId) {
        setCurrentSyncId(data.results.syncId);
      }
    } catch (err: any) {
      queueGlobalToast({
        title: 'Sync failed',
        description: err.message,
        variant: 'destructive',
      });
      setIsFetchingCityData(false);
    }
  };

  const handleSyncMarketListings = async () => {
    setIsImporting(true);
    await importFromMarketListings();
    setIsImporting(false);
  };

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-8">
        <div>
          <Link to="/properties" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3">
            <ChevronLeft className="w-4 h-4" />
            Properties
          </Link>
          <h1 className="text-2xl font-display font-bold">Properties — Admin Tools</h1>
          <p className="text-muted-foreground mt-1">Maintenance and data sync tools</p>
        </div>

        {/* Brochures */}
        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Brochures</p>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Save All Brochures</CardTitle>
              <CardDescription>Download fresh copies of all brochures linked to properties and store them locally.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveAllBrochures}
                disabled={isSavingAllBrochures}
              >
                {isSavingAllBrochures ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                {isSavingAllBrochures ? 'Saving…' : 'Save All Brochures'}
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Data Sync */}
        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Data Sync</p>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Sync Market Listings</CardTitle>
              <CardDescription>Import new properties from market listings and link them to existing property records.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncMarketListings}
                disabled={isImporting}
              >
                {isImporting ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                {isImporting ? 'Syncing…' : 'Sync Market Listings'}
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Fetch All City Data</CardTitle>
              <CardDescription>Pull the latest Calgary open data (assessment, permits, parcels) for all Calgary properties.</CardDescription>
            </CardHeader>
            <CardContent>
              {isFetchingCityData && syncProgress && (
                <p className="text-sm text-muted-foreground mb-3">
                  {syncProgress.current} of {syncProgress.total} processed
                  {syncProgress.matched != null && ` • ${syncProgress.matched} matched`}
                  {syncProgress.unmatched != null && syncProgress.unmatched > 0 && ` • ${syncProgress.unmatched} unmatched`}
                  …
                </p>
              )}
              {isFetchingCityData && !syncProgress && (
                <p className="text-sm text-muted-foreground mb-3">Starting…</p>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleFetchAllCityData}
                disabled={isFetchingCityData}
              >
                {isFetchingCityData ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Database className="w-4 h-4 mr-2" />
                )}
                {isFetchingCityData ? 'Syncing…' : 'Fetch All City Data'}
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    </AppLayout>
  );
}
