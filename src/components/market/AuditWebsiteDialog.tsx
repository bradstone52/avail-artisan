import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Globe, Plus, Trash2, Loader2, ListChecks, CheckCircle2, AlertTriangle, Pencil } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { MarketListing } from '@/hooks/useMarketListings';
import { useLandlordWebsites } from '@/hooks/useLandlordWebsites';
import { AuditReviewStepper, PdfExtractedListing, MatchedPair } from './AuditReviewStepper';

interface AuditWebsiteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listings: MarketListing[];
  uniqueLandlords: string[];
  onFlagListings: (ids: string[]) => void;
  onAddNewListing?: (pdfListing: PdfExtractedListing, brokerSource: string) => void;
  onRefreshListings?: () => void;
  onEditListing?: (listing: MarketListing) => void;
  onRegisterEditCallback?: (cb: (listingId: string) => void) => void;
}

interface AuditResult {
  extractedListings: PdfExtractedListing[];
  matchedPairs: MatchedPair[];
  newInPdf: PdfExtractedListing[];
  missingListings: MarketListing[];
}

export function AuditWebsiteDialog({
  open,
  onOpenChange,
  listings,
  uniqueLandlords,
  onFlagListings,
  onAddNewListing,
  onRefreshListings,
  onEditListing,
  onRegisterEditCallback,
}: AuditWebsiteDialogProps) {
  const { session } = useAuth();
  const { websites, addWebsite, deleteWebsite, updateWebsite } = useLandlordWebsites();
  const [selectedLandlord, setSelectedLandlord] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [showStepper, setShowStepper] = useState(false);
  const [editingWebsiteUrl, setEditingWebsiteUrl] = useState<string | null>(null);

  // New website form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLandlordName, setNewLandlordName] = useState('');
  const [newWebsiteUrl, setNewWebsiteUrl] = useState('');

  const selectedWebsite = useMemo(
    () => websites.find((w) => w.landlord_name === selectedLandlord),
    [websites, selectedLandlord]
  );

  // All landlords that have a configured website
  const configuredLandlords = useMemo(() => websites.map((w) => w.landlord_name).sort(), [websites]);

  // Scope listings to the selected landlord
  const scopeListings = useMemo(() => {
    if (!selectedLandlord) return [];
    return listings.filter((l) => l.landlord === selectedLandlord);
  }, [listings, selectedLandlord]);

  const normalizeAddress = (addr: string) =>
    addr
      .toLowerCase()
      .replace(/[.,#]/g, '')
      .replace(/[–—\-&]/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/(\d+)(st|nd|rd|th)\b/g, '$1')
      .replace(/\b(street|st)\b/g, 'st')
      .replace(/\b(avenue|ave)\b/g, 'ave')
      .replace(/\b(drive|dr)\b/g, 'dr')
      .replace(/\b(road|rd)\b/g, 'rd')
      .replace(/\b(boulevard|blvd)\b/g, 'blvd')
      .replace(/\b(crescent|cres)\b/g, 'cres')
      .replace(/\b(northeast|n\.e\.)\b/g, 'ne')
      .replace(/\b(northwest|n\.w\.)\b/g, 'nw')
      .replace(/\b(southeast|s\.e\.)\b/g, 'se')
      .replace(/\b(southwest|s\.w\.)\b/g, 'sw')
      .trim();

  const extractKeyTokens = (addr: string) => {
    const normalized = normalizeAddress(addr);
    const tokens = normalized.match(/\b(\d+|ne|nw|se|sw|st|ave|dr|rd|blvd|cres)\b/g);
    return tokens ? tokens.join(' ') : normalized;
  };

  const addressesMatch = (dbAddr: string, webAddr: string) => {
    const normDb = normalizeAddress(dbAddr);
    const normWeb = normalizeAddress(webAddr);
    if (normDb.includes(normWeb) || normWeb.includes(normDb)) return true;
    const dbTokens = extractKeyTokens(dbAddr).split(' ').filter(Boolean);
    const webTokens = extractKeyTokens(webAddr).split(' ').filter(Boolean);
    if (dbTokens.length < 2 || webTokens.length < 2) return false;
    return dbTokens.every((t) => webTokens.includes(t)) && webTokens.every((t) => dbTokens.includes(t));
  };

  const handleCrawl = async () => {
    if (!selectedWebsite || !session?.access_token) {
      toast.error('Not authenticated or no website selected');
      return;
    }

    setIsProcessing(true);
    setResult(null);
    setShowStepper(false);

    try {
      const { data, error } = await supabase.functions.invoke('audit-landlord-website', {
        body: {
          url: selectedWebsite.website_url,
          landlord_name: selectedLandlord,
        },
      });

      if (error) throw new Error(error.message || 'Crawl failed');
      if (data?.error) throw new Error(data.error);

      const rawListings: PdfExtractedListing[] = data.listings || [];

      // Log cities for debugging
      const citiesFound = [...new Set(rawListings.map((l) => l.city || 'null'))];
      console.log('Cities found in crawl:', citiesFound);

      const allowedCities = ['calgary', 'city of calgary', 'rocky view county', 'county of rocky view', 'rocky view', 'balzac', 'airdrie', 'chestermere', 'cochrane', 'okotoks', 'crossfield', 'strathmore', 'high river', 'carstairs', 'didsbury', 'olds', 'innisfail', 'penhold', 'red deer'];
      const extractedListings = rawListings.filter((l) => {
        const sizeOk = !l.size_sf || l.size_sf >= 8000;
        const cityLower = (l.city || '').toLowerCase().trim();
        // Allow through if no city specified OR city is in allowed list
        const cityOk = !cityLower || allowedCities.includes(cityLower);
        if (!cityOk) console.log(`Filtered out listing "${l.address}" with city "${l.city}"`);
        return sizeOk && cityOk;
      });

      // Matching logic (same as AuditPdfDialog)
      const matchedPairs: MatchedPair[] = [];
      const missing: MarketListing[] = [];

      const dbToPdfCandidates: Map<number, number[]> = new Map();
      const pdfToDbCandidates: Map<number, number[]> = new Map();

      for (let di = 0; di < scopeListings.length; di++) {
        const listing = scopeListings[di];
        const listingAddr = listing.address || '';
        const displayAddr = listing.display_address || '';
        const candidates: number[] = [];

        for (let pi = 0; pi < extractedListings.length; pi++) {
          if (
            addressesMatch(listingAddr, extractedListings[pi].address) ||
            (displayAddr && addressesMatch(displayAddr, extractedListings[pi].address))
          ) {
            candidates.push(pi);
            if (!pdfToDbCandidates.has(pi)) pdfToDbCandidates.set(pi, []);
            pdfToDbCandidates.get(pi)!.push(di);
          }
        }
        dbToPdfCandidates.set(di, candidates);
      }

      const assignedPdf = new Set<number>();
      const assignedDb = new Set<number>();
      const normalizeType = (t?: string | null) => (t || '').toLowerCase().trim();

      for (let di = 0; di < scopeListings.length; di++) {
        const candidates = dbToPdfCandidates.get(di) || [];
        const dbType = normalizeType(scopeListings[di].listing_type);
        const typeMatch = candidates.find(
          (pi) => !assignedPdf.has(pi) && normalizeType(extractedListings[pi].listing_type) === dbType
        );
        if (typeMatch !== undefined) {
          matchedPairs.push({ pdfListing: extractedListings[typeMatch], dbListing: scopeListings[di] });
          assignedPdf.add(typeMatch);
          assignedDb.add(di);
        }
      }

      for (let di = 0; di < scopeListings.length; di++) {
        if (assignedDb.has(di)) continue;
        const candidates = dbToPdfCandidates.get(di) || [];
        const fallback = candidates.find((pi) => !assignedPdf.has(pi));
        if (fallback !== undefined) {
          matchedPairs.push({ pdfListing: extractedListings[fallback], dbListing: scopeListings[di] });
          assignedPdf.add(fallback);
          assignedDb.add(di);
        } else if (candidates.length > 0) {
          matchedPairs.push({ pdfListing: extractedListings[candidates[0]], dbListing: scopeListings[di] });
          assignedDb.add(di);
        } else {
          missing.push(scopeListings[di]);
        }
      }

      const newInPdf = extractedListings
        .filter((_, i) => !assignedPdf.has(i))
        .map((webItem) => {
          const matchInScope = scopeListings.some(
            (l) =>
              addressesMatch(l.address || '', webItem.address) ||
              (l.display_address && addressesMatch(l.display_address, webItem.address))
          );
          const matchOutsideScope =
            !matchInScope &&
            listings.some((l) => {
              const inScope = scopeListings.some((sl) => sl.id === l.id);
              if (inScope) return false;
              return (
                addressesMatch(l.address || '', webItem.address) ||
                (l.display_address && addressesMatch(l.display_address, webItem.address))
              );
            });
          return {
            ...webItem,
            existsInDbUnderDifferentScope: matchOutsideScope,
            existsInDbSameScope: matchInScope,
          };
        });

      const auditResult: AuditResult = {
        extractedListings,
        matchedPairs,
        newInPdf,
        missingListings: missing,
      };

      setResult(auditResult);

      // Update last_crawled_at
      updateWebsite(selectedWebsite.id, { last_crawled_at: new Date().toISOString() });

      toast.success(
        `Found ${extractedListings.length} on website. ${matchedPairs.length} matched, ${newInPdf.length} new, ${missing.length} missing.`
      );
    } catch (err) {
      console.error('Website audit error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to crawl website');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddWebsite = async () => {
    if (!newLandlordName.trim() || !newWebsiteUrl.trim()) return;
    await addWebsite(newLandlordName.trim(), newWebsiteUrl.trim());
    setNewLandlordName('');
    setNewWebsiteUrl('');
    setShowAddForm(false);
  };

  const handleConfirm = (dbListing: MarketListing) => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    supabase
      .from('market_listings')
      .update({ last_verified_date: dateStr })
      .eq('id', dbListing.id)
      .then(({ error }) => {
        if (error) console.error('Failed to update verified date:', error);
      });
  };

  const handleConfirmAndUpdate = async (dbListing: MarketListing, webData: PdfExtractedListing) => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const updates: Record<string, unknown> = {
      last_verified_date: dateStr,
      updated_at: new Date().toISOString(),
    };
    if (webData.size_sf && webData.size_sf !== dbListing.size_sf) updates.size_sf = webData.size_sf;
    if (webData.asking_rate && webData.asking_rate !== dbListing.asking_rate_psf) updates.asking_rate_psf = webData.asking_rate;
    if (webData.listing_type && webData.listing_type !== dbListing.listing_type) updates.listing_type = webData.listing_type;
    if (webData.brochure_link) updates.brochure_link = webData.brochure_link;

    const { error } = await supabase.from('market_listings').update(updates).eq('id', dbListing.id);
    if (error) {
      console.error('Failed to update listing:', error);
      toast.error('Failed to update listing');
    }
  };

  const handleAddNewListing = (webListing: PdfExtractedListing) => {
    if (onAddNewListing) {
      onAddNewListing(webListing, selectedLandlord);
    }
  };

  const handleStepperClose = () => {
    setShowStepper(false);
    onRefreshListings?.();
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setResult(null);
      setSelectedLandlord('');
      setShowStepper(false);
      setShowAddForm(false);
      setEditingWebsiteUrl(null);
    }
    onOpenChange(open);
  };

  // Stepper mode
  if (showStepper && result) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl h-[92vh] p-0 flex flex-col overflow-hidden" onInteractOutside={(e) => e.preventDefault()}>
          <AuditReviewStepper
            matchedPairs={result.matchedPairs}
            newInPdf={result.newInPdf}
            missingFromPdf={result.missingListings}
            scopeListings={scopeListings}
            brokerSource={selectedLandlord}
            onConfirm={handleConfirm}
            onConfirmAndUpdate={handleConfirmAndUpdate}
            onAddNewListing={handleAddNewListing}
            onFlagMissing={(ids) => onFlagListings(ids)}
            onEditListing={onEditListing}
            onRegisterEditCallback={onRegisterEditCallback}
            onClose={handleStepperClose}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Audit Landlord Website
          </DialogTitle>
          <DialogDescription>
            Crawl a landlord's website to find available listings and compare against your database.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-hidden">
          {/* Landlord Selection */}
          <div className="space-y-2">
            <Label>Landlord</Label>
            <Select
              value={selectedLandlord}
              onValueChange={(v) => {
                setSelectedLandlord(v);
                setResult(null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select landlord..." />
              </SelectTrigger>
              <SelectContent>
                {configuredLandlords.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedWebsite && (
            <div className="space-y-2">
              {editingWebsiteUrl !== null ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editingWebsiteUrl}
                    onChange={(e) => setEditingWebsiteUrl(e.target.value)}
                    className="text-sm h-8 flex-1"
                    placeholder="https://..."
                    autoFocus
                  />
                  <Button
                    size="sm"
                    className="h-8"
                    onClick={async () => {
                      if (editingWebsiteUrl.trim()) {
                        await updateWebsite(selectedWebsite.id, { website_url: editingWebsiteUrl.trim() });
                        setEditingWebsiteUrl(null);
                      }
                    }}
                  >
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditingWebsiteUrl(null)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-sm min-w-0 overflow-hidden">
                  <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <a
                    href={selectedWebsite.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline truncate min-w-0 flex-1"
                  >
                    {selectedWebsite.website_url}
                  </a>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => setEditingWebsiteUrl(selectedWebsite.website_url)}
                      title="Edit URL"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-destructive"
                      onClick={() => {
                        deleteWebsite(selectedWebsite.id);
                        setSelectedLandlord('');
                      }}
                      title="Remove website"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedLandlord && (
            <p className="text-sm text-muted-foreground">
              {scopeListings.length} active listing{scopeListings.length !== 1 ? 's' : ''} for{' '}
              <span className="font-medium text-foreground">{selectedLandlord}</span>
            </p>
          )}

          {/* Add new website */}
          {!showAddForm ? (
            <Button variant="outline" size="sm" onClick={() => setShowAddForm(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Add Landlord Website
            </Button>
          ) : (
            <div className="space-y-3 border rounded-md p-3 bg-muted/30">
              <div className="space-y-2">
                <Label>Landlord Name</Label>
                <Select value={newLandlordName} onValueChange={setNewLandlordName}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select or type landlord..." />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueLandlords
                      .filter((l) => !configuredLandlords.includes(l))
                      .map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Website URL</Label>
                <Input
                  placeholder="https://landlord-website.com/available-space"
                  value={newWebsiteUrl}
                  onChange={(e) => setNewWebsiteUrl(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddWebsite} disabled={!newLandlordName || !newWebsiteUrl}>
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowAddForm(false);
                    setNewLandlordName('');
                    setNewWebsiteUrl('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Crawl Button */}
          <Button
            onClick={handleCrawl}
            disabled={!selectedWebsite || isProcessing}
            className="w-full"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Crawling Website...
              </>
            ) : (
              <>
                <Globe className="w-4 h-4 mr-2" />
                Crawl Website & Compare Against {scopeListings.length} Listings
              </>
            )}
          </Button>

          {isProcessing && (
            <div className="space-y-2">
              <Progress value={undefined} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                Discovering pages, scraping content, and extracting listings...
              </p>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center gap-4 flex-wrap">
                <Badge variant="outline" className="text-sm">
                  {result.extractedListings.length} listings on website
                </Badge>
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <Badge variant="outline" className="text-sm text-green-600 border-green-600">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  {result.matchedPairs.length} matched
                </Badge>
                {result.newInPdf.length > 0 && (
                  <Badge variant="outline" className="text-sm text-blue-600 border-blue-600">
                    {result.newInPdf.length} new on website
                  </Badge>
                )}
                {result.missingListings.length > 0 && (
                  <Badge variant="destructive" className="text-sm">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    {result.missingListings.length} not on website
                  </Badge>
                )}
              </div>

              <Button onClick={() => setShowStepper(true)} className="w-full" size="lg">
                <ListChecks className="w-4 h-4 mr-2" />
                Review 1:1 ({result.matchedPairs.length + result.newInPdf.length + result.missingListings.length} items)
              </Button>

              {result.missingListings.length === 0 && result.newInPdf.length === 0 && (
                <div className="text-center py-4">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-green-600 mb-2" />
                  <p className="text-sm font-medium text-green-600">
                    All listings found on the website! No new listings detected.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
