import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileUpload } from '@/components/common/FileUpload';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, CheckCircle2, FileSearch, Upload, ListChecks } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { MarketListing } from '@/hooks/useMarketListings';
import { AuditReviewStepper, PdfExtractedListing, MatchedPair } from './AuditReviewStepper';

interface AuditPdfDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listings: MarketListing[];
  uniqueBrokers: string[];
  uniqueLandlords: string[];
  onFlagListings: (ids: string[]) => void;
  onAddNewListing?: (prefillData: PdfExtractedListing, brokerSource: string) => void;
  onRefreshListings?: () => void;
  onEditListing?: (listing: MarketListing) => void;
}

type MatchField = 'broker_source' | 'landlord';

interface AuditResult {
  extractedListings: PdfExtractedListing[];
  matchedPairs: MatchedPair[];
  newInPdf: PdfExtractedListing[];
  missingListings: MarketListing[];
}

export function AuditPdfDialog({
  open,
  onOpenChange,
  listings,
  uniqueBrokers,
  uniqueLandlords,
  onFlagListings,
  onAddNewListing,
  onRefreshListings,
  onEditListing,
}: AuditPdfDialogProps) {
  const { session } = useAuth();
  const [matchField, setMatchField] = useState<MatchField>('broker_source');
  const [selectedValue, setSelectedValue] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [showStepper, setShowStepper] = useState(false);

  const options = useMemo(() => {
    return matchField === 'broker_source' ? uniqueBrokers : uniqueLandlords;
  }, [matchField, uniqueBrokers, uniqueLandlords]);

  // Listings that match the selected filter
  const scopeListings = useMemo(() => {
    if (!selectedValue) return [];
    return listings.filter((l) => {
      if (matchField === 'broker_source') return l.broker_source === selectedValue;
      return l.landlord === selectedValue;
    });
  }, [listings, matchField, selectedValue]);

  const handleFileSelect = (newFiles: File[]) => {
    setFiles(newFiles);
    setResult(null);
    setShowStepper(false);
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setResult(null);
    setShowStepper(false);
  };

  const normalizeAddress = (addr: string) =>
    addr
      .toLowerCase()
      .replace(/[.,#]/g, '')
      .replace(/[–—\-&]/g, ' ')
      .replace(/\s+/g, ' ')
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

  const addressesMatch = (dbAddr: string, pdfAddr: string) => {
    const normDb = normalizeAddress(dbAddr);
    const normPdf = normalizeAddress(pdfAddr);
    if (normDb.includes(normPdf) || normPdf.includes(normDb)) return true;
    const dbTokens = extractKeyTokens(dbAddr).split(' ');
    const pdfTokens = extractKeyTokens(pdfAddr).split(' ');
    return dbTokens.every(t => pdfTokens.includes(t)) || pdfTokens.every(t => dbTokens.includes(t));
  };

  const handleProcess = async () => {
    if (!files.length || !selectedValue) return;
    if (!session?.access_token) {
      toast.error('Not authenticated');
      return;
    }

    setIsProcessing(true);
    setResult(null);
    setShowStepper(false);

    try {
      const formData = new FormData();
      formData.append('file', files[0]);

      const { data, error } = await supabase.functions.invoke('audit-brokerage-pdf', {
        body: formData,
      });

      if (error) throw new Error(error.message || 'Upload failed');
      if (data?.error) throw new Error(data.error);

      const extractedListings: PdfExtractedListing[] = data.listings || [];

      // Compare against scope listings: build matched pairs, missing, and new
      const matchedPairs: MatchedPair[] = [];
      const missing: MarketListing[] = [];
      const matchedPdfIndices = new Set<number>();

      for (const listing of scopeListings) {
        const listingAddr = listing.address || '';
        const displayAddr = listing.display_address || '';

        let matchedPdfIdx = -1;
        for (let i = 0; i < extractedListings.length; i++) {
          if (
            addressesMatch(listingAddr, extractedListings[i].address) ||
            (displayAddr && addressesMatch(displayAddr, extractedListings[i].address))
          ) {
            matchedPdfIdx = i;
            break;
          }
        }

        if (matchedPdfIdx >= 0) {
          matchedPairs.push({
            pdfListing: extractedListings[matchedPdfIdx],
            dbListing: listing,
          });
          matchedPdfIndices.add(matchedPdfIdx);
        } else {
          missing.push(listing);
        }
      }

      // PDF records not matched to any DB listing = new
      const newInPdf = extractedListings.filter((_, i) => !matchedPdfIndices.has(i));

      const auditResult: AuditResult = {
        extractedListings,
        matchedPairs,
        newInPdf,
        missingListings: missing,
      };

      setResult(auditResult);
      toast.success(
        `Found ${extractedListings.length} in PDF. ${matchedPairs.length} matched, ${newInPdf.length} new, ${missing.length} missing.`
      );
    } catch (err) {
      console.error('Audit error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to process PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFlagAndClose = () => {
    if (result) {
      onFlagListings(result.missingListings.map((l) => l.id));
      onOpenChange(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setFiles([]);
      setResult(null);
      setSelectedValue('');
      setShowStepper(false);
    }
    onOpenChange(open);
  };

  const handleConfirm = (dbListing: MarketListing) => {
    // Just confirm — update last_verified_date
    supabase
      .from('market_listings')
      .update({ last_verified_date: new Date().toISOString().split('T')[0] })
      .eq('id', dbListing.id)
      .then(({ error }) => {
        if (error) console.error('Failed to update verified date:', error);
      });
  };

  const handleConfirmAndUpdate = async (dbListing: MarketListing, pdfData: PdfExtractedListing) => {
    const updates: Record<string, unknown> = {
      last_verified_date: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString(),
    };
    if (pdfData.size_sf && pdfData.size_sf !== dbListing.size_sf) {
      updates.size_sf = pdfData.size_sf;
    }
    if (pdfData.asking_rate && pdfData.asking_rate !== dbListing.asking_rate_psf) {
      updates.asking_rate_psf = pdfData.asking_rate;
    }
    if (pdfData.listing_type && pdfData.listing_type !== dbListing.listing_type) {
      updates.listing_type = pdfData.listing_type;
    }
    if (pdfData.landlord && pdfData.landlord !== dbListing.landlord) {
      updates.landlord = pdfData.landlord;
    }

    const { error } = await supabase
      .from('market_listings')
      .update(updates)
      .eq('id', dbListing.id);

    if (error) {
      console.error('Failed to update listing:', error);
      toast.error('Failed to update listing');
    }
  };

  const handleAddNewListing = (pdfListing: PdfExtractedListing) => {
    if (onAddNewListing) {
      onAddNewListing(pdfListing, selectedValue);
    }
  };

  const handleStepperFlagMissing = (ids: string[]) => {
    onFlagListings(ids);
  };

  const handleStepperClose = () => {
    setShowStepper(false);
    onRefreshListings?.();
  };

  // If stepper is active, show it full-screen
  if (showStepper && result) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl h-[85vh] p-0 flex flex-col overflow-hidden" onInteractOutside={(e) => e.preventDefault()}>
          <AuditReviewStepper
            matchedPairs={result.matchedPairs}
            newInPdf={result.newInPdf}
            missingFromPdf={result.missingListings}
            brokerSource={selectedValue}
            onConfirm={handleConfirm}
            onConfirmAndUpdate={handleConfirmAndUpdate}
            onAddNewListing={handleAddNewListing}
            onFlagMissing={handleStepperFlagMissing}
            onEditListing={onEditListing}
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
            <FileSearch className="w-5 h-5" />
            Audit Brokerage PDF
          </DialogTitle>
          <DialogDescription>
            Upload a brokerage report PDF and compare it against your existing market listings to find missing entries.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Match Field Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Match By</Label>
              <Select
                value={matchField}
                onValueChange={(v) => {
                  setMatchField(v as MatchField);
                  setSelectedValue('');
                  setResult(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="broker_source">Brokerage</SelectItem>
                  <SelectItem value="landlord">Landlord</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{matchField === 'broker_source' ? 'Brokerage' : 'Landlord'}</Label>
              <Select
                value={selectedValue}
                onValueChange={(v) => {
                  setSelectedValue(v);
                  setResult(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={`Select ${matchField === 'broker_source' ? 'brokerage' : 'landlord'}...`} />
                </SelectTrigger>
                <SelectContent>
                  {options.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedValue && (
            <p className="text-sm text-muted-foreground">
              {scopeListings.length} active listing{scopeListings.length !== 1 ? 's' : ''} for{' '}
              <span className="font-medium text-foreground">{selectedValue}</span>
            </p>
          )}

          {/* File Upload */}
          <FileUpload
            onFileSelect={handleFileSelect}
            accept={{ 'application/pdf': ['.pdf'] }}
            maxFiles={1}
            maxSize={20 * 1024 * 1024}
            selectedFiles={files}
            onRemoveFile={handleRemoveFile}
          />

          {/* Process Button */}
          <Button
            onClick={handleProcess}
            disabled={!files.length || !selectedValue || isProcessing}
            className="w-full"
          >
            {isProcessing ? (
              <>Processing PDF...</>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Audit PDF Against {scopeListings.length} Listings
              </>
            )}
          </Button>

          {isProcessing && (
            <div className="space-y-2">
              <Progress value={undefined} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                Extracting addresses from PDF...
              </p>
            </div>
          )}

          {/* Results */}
          {result && (() => {
            const typeCounts: Record<string, number> = {};
            result.extractedListings.forEach(l => {
              typeCounts[l.listing_type] = (typeCounts[l.listing_type] || 0) + 1;
            });
            return (
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center gap-4 flex-wrap">
                <Badge variant="outline" className="text-sm">
                  {result.extractedListings.length} listings in PDF
                </Badge>
                {Object.entries(typeCounts).map(([type, count]) => (
                  <Badge key={type} variant="secondary" className="text-xs">
                    {type}: {count}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <Badge variant="outline" className="text-sm text-green-600 border-green-600">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  {result.matchedPairs.length} matched
                </Badge>
                {result.newInPdf.length > 0 && (
                  <Badge variant="outline" className="text-sm text-blue-600 border-blue-600">
                    {result.newInPdf.length} new in PDF
                  </Badge>
                )}
                {result.missingListings.length > 0 && (
                  <Badge variant="destructive" className="text-sm">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    {result.missingListings.length} not in PDF
                  </Badge>
                )}
              </div>

              {/* Review 1:1 Button */}
              <Button
                onClick={() => setShowStepper(true)}
                className="w-full"
                size="lg"
              >
                <ListChecks className="w-4 h-4 mr-2" />
                Review 1:1 ({result.matchedPairs.length + result.newInPdf.length + result.missingListings.length} items)
              </Button>

              {/* Quick actions */}
              {result.missingListings.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-destructive font-semibold">
                    Quick: Flag all {result.missingListings.length} missing listings
                  </Label>
                  <ScrollArea className="h-[150px] border rounded-md">
                    <div className="p-3 space-y-2">
                      {result.missingListings.map((listing) => (
                        <div
                          key={listing.id}
                          className="flex items-center justify-between p-2 bg-destructive/5 rounded border border-destructive/20"
                        >
                          <div>
                            <p className="text-sm font-medium">
                              {listing.display_address || listing.address}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {listing.city} • {listing.size_sf?.toLocaleString()} SF • {listing.status}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {listing.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  <Button onClick={handleFlagAndClose} variant="destructive" className="w-full">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Flag {result.missingListings.length} Missing Listings in Table
                  </Button>
                </div>
              )}

              {result.missingListings.length === 0 && result.newInPdf.length === 0 && (
                <div className="text-center py-4">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-green-600 mb-2" />
                  <p className="text-sm font-medium text-green-600">
                    All listings found in the PDF! No new listings detected.
                  </p>
                </div>
              )}
            </div>
            );
          })()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
