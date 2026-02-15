import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileUpload } from '@/components/common/FileUpload';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, CheckCircle2, FileSearch, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { MarketListing } from '@/hooks/useMarketListings';

interface AuditPdfDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listings: MarketListing[];
  uniqueBrokers: string[];
  uniqueLandlords: string[];
  onFlagListings: (ids: string[]) => void;
}

type MatchField = 'broker_source' | 'landlord';

interface PdfListing {
  address: string;
  listing_type: string;
}

interface AuditResult {
  extractedListings: PdfListing[];
  matchedListingIds: string[];
  missingListings: MarketListing[];
}

export function AuditPdfDialog({
  open,
  onOpenChange,
  listings,
  uniqueBrokers,
  uniqueLandlords,
  onFlagListings,
}: AuditPdfDialogProps) {
  const { session } = useAuth();
  const [matchField, setMatchField] = useState<MatchField>('broker_source');
  const [selectedValue, setSelectedValue] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);

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
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setResult(null);
  };

  const normalizeAddress = (addr: string) =>
    addr
      .toLowerCase()
      .replace(/[.,#]/g, '')
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

  const handleProcess = async () => {
    if (!files.length || !selectedValue) return;
    if (!session?.access_token) {
      toast.error('Not authenticated');
      return;
    }

    setIsProcessing(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', files[0]);

      const { data, error } = await supabase.functions.invoke('audit-brokerage-pdf', {
        body: formData,
      });

      if (error) throw new Error(error.message || 'Upload failed');
      if (data?.error) throw new Error(data.error);

      const extractedListings: PdfListing[] = data.listings || [];

      // Normalize extracted addresses for comparison
      const normalizedExtracted = extractedListings.map(l => normalizeAddress(l.address));

      // Compare against scope listings
      const matchedIds: string[] = [];
      const missing: MarketListing[] = [];

      for (const listing of scopeListings) {
        const listingAddr = normalizeAddress(listing.address || '');
        const displayAddr = listing.display_address ? normalizeAddress(listing.display_address) : '';

        // Check if any extracted address contains the listing address or vice versa
        const found = normalizedExtracted.some(
          (ext) =>
            ext.includes(listingAddr) ||
            listingAddr.includes(ext) ||
            (displayAddr && (ext.includes(displayAddr) || displayAddr.includes(ext)))
        );

        if (found) {
          matchedIds.push(listing.id);
        } else {
          missing.push(listing);
        }
      }

      const auditResult: AuditResult = {
        extractedListings,
        matchedListingIds: matchedIds,
        missingListings: missing,
      };

      setResult(auditResult);
      toast.success(
        `Found ${extractedListings.length} listings in PDF. ${missing.length} listings not found.`
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
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
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
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="text-sm text-green-600 border-green-600">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  {result.matchedListingIds.length} matched
                </Badge>
                {result.missingListings.length > 0 && (
                  <Badge variant="destructive" className="text-sm">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    {result.missingListings.length} not in PDF
                  </Badge>
                )}
              </div>

              {result.missingListings.length > 0 ? (
                <div className="space-y-2">
                  <Label className="text-destructive font-semibold">
                    Listings NOT found in PDF:
                  </Label>
                  <ScrollArea className="h-[200px] border rounded-md">
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

                  <Button onClick={handleFlagAndClose} className="w-full">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Flag {result.missingListings.length} Missing Listings in Table
                  </Button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-green-600 mb-2" />
                  <p className="text-sm font-medium text-green-600">
                    All listings found in the PDF!
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
