import { useState, useMemo } from 'react';
import { MarketListing } from '@/hooks/useMarketListings';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Plus,
  ArrowRightLeft,
  SkipForward,
  RefreshCw,
  Building2,
  Pencil,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PdfExtractedListing {
  address: string;
  listing_type: string;
  size_sf?: number | null;
  asking_rate?: string | null;
  city?: string | null;
  submarket?: string | null;
  landlord?: string | null;
  brochure_link?: string | null;
}

export interface MatchedPair {
  pdfListing: PdfExtractedListing;
  dbListing: MarketListing;
}

export type ReviewAction = 'confirmed' | 'confirmed_updated' | 'skipped' | 'added' | 'flagged' | null;

interface ReviewItem {
  type: 'matched' | 'new_in_pdf' | 'missing_from_pdf';
  matchedPair?: MatchedPair;
  pdfListing?: PdfExtractedListing;
  dbListing?: MarketListing;
  action: ReviewAction;
}

interface AuditReviewStepperProps {
  matchedPairs: MatchedPair[];
  newInPdf: PdfExtractedListing[];
  missingFromPdf: MarketListing[];
  brokerSource: string;
  onConfirm: (dbListing: MarketListing) => void;
  onConfirmAndUpdate: (dbListing: MarketListing, pdfData: PdfExtractedListing) => void;
  onAddNewListing: (pdfListing: PdfExtractedListing) => void;
  onFlagMissing: (ids: string[]) => void;
  onEditListing?: (listing: MarketListing) => void;
  onClose: () => void;
}

export function AuditReviewStepper({
  matchedPairs,
  newInPdf,
  missingFromPdf,
  brokerSource,
  onConfirm,
  onConfirmAndUpdate,
  onAddNewListing,
  onFlagMissing,
  onEditListing,
  onClose,
}: AuditReviewStepperProps) {
  // Build the review queue
  const items = useMemo<ReviewItem[]>(() => {
    const result: ReviewItem[] = [];
    matchedPairs.forEach((pair) => {
      result.push({ type: 'matched', matchedPair: pair, action: null });
    });
    newInPdf.forEach((pdf) => {
      result.push({ type: 'new_in_pdf', pdfListing: pdf, action: null });
    });
    missingFromPdf.forEach((db) => {
      result.push({ type: 'missing_from_pdf', dbListing: db, action: null });
    });
    return result;
  }, [matchedPairs, newInPdf, missingFromPdf]);

  const [actions, setActions] = useState<ReviewAction[]>(() => items.map(() => null));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'matched' | 'new_in_pdf' | 'missing_from_pdf'>(() => {
    if (matchedPairs.length > 0) return 'matched';
    if (newInPdf.length > 0) return 'new_in_pdf';
    return 'missing_from_pdf';
  });

  const filteredIndices = useMemo(() => {
    return items.map((item, i) => ({ item, i })).filter(({ item }) => item.type === activeTab).map(({ i }) => i);
  }, [items, activeTab]);

  const currentFilteredPos = filteredIndices.indexOf(currentIndex);
  const currentItem = items[currentIndex];

  const setAction = (index: number, action: ReviewAction) => {
    setActions((prev) => {
      const next = [...prev];
      next[index] = action;
      return next;
    });
  };

  const goToNext = () => {
    const nextPos = currentFilteredPos + 1;
    if (nextPos < filteredIndices.length) {
      setCurrentIndex(filteredIndices[nextPos]);
    }
  };

  const goToPrev = () => {
    const prevPos = currentFilteredPos - 1;
    if (prevPos >= 0) {
      setCurrentIndex(filteredIndices[prevPos]);
    }
  };

  const handleConfirm = () => {
    if (currentItem?.matchedPair) {
      onConfirm(currentItem.matchedPair.dbListing);
      setAction(currentIndex, 'confirmed');
      goToNext();
    }
  };

  const handleConfirmAndUpdate = () => {
    if (currentItem?.matchedPair) {
      onConfirmAndUpdate(currentItem.matchedPair.dbListing, currentItem.matchedPair.pdfListing);
      setAction(currentIndex, 'confirmed_updated');
      goToNext();
    }
  };

  const handleAddNew = () => {
    if (currentItem?.pdfListing) {
      onAddNewListing(currentItem.pdfListing);
      setAction(currentIndex, 'added');
      goToNext();
    }
  };

  const handleSkip = () => {
    setAction(currentIndex, 'skipped');
    goToNext();
  };

  const handleFlagMissing = () => {
    if (currentItem?.dbListing) {
      setAction(currentIndex, 'flagged');
      goToNext();
    }
  };

  const handleFinish = () => {
    // Collect all flagged missing IDs
    const flaggedIds = items
      .filter((_, i) => actions[i] === 'flagged' && items[i].type === 'missing_from_pdf')
      .map((item) => item.dbListing!.id);
    if (flaggedIds.length > 0) {
      onFlagMissing(flaggedIds);
    }
    onClose();
  };

  const switchTab = (tab: 'matched' | 'new_in_pdf' | 'missing_from_pdf') => {
    setActiveTab(tab);
    const indices = items.map((item, i) => ({ item, i })).filter(({ item }) => item.type === tab).map(({ i }) => i);
    if (indices.length > 0) {
      setCurrentIndex(indices[0]);
    }
  };

  // Summary counts
  const matchedCount = matchedPairs.length;
  const newCount = newInPdf.length;
  const missingCount = missingFromPdf.length;
  const reviewedCount = actions.filter((a) => a !== null).length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? (reviewedCount / totalCount) * 100 : 0;

  const getActionCountForTab = (tab: 'matched' | 'new_in_pdf' | 'missing_from_pdf') => {
    return items.filter((item, i) => item.type === tab && actions[i] !== null).length;
  };

  const getCountForTab = (tab: 'matched' | 'new_in_pdf' | 'missing_from_pdf') => {
    return items.filter((item) => item.type === tab).length;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Top Progress */}
      <div className="px-6 pt-4 pb-2 space-y-2 border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black uppercase tracking-tight">
            1:1 Audit Review — {brokerSource}
          </h2>
          <span className="text-sm text-muted-foreground">
            {reviewedCount}/{totalCount} reviewed
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b px-6 gap-1 pt-2">
        <button
          onClick={() => switchTab('matched')}
          className={cn(
            'px-4 py-2 text-sm font-bold rounded-t-md transition-colors flex items-center gap-2',
            activeTab === 'matched'
              ? 'bg-card border-2 border-b-0 border-foreground text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <ArrowRightLeft className="h-3.5 w-3.5" />
          Matched
          <Badge variant="secondary" className="text-xs ml-1">
            {getActionCountForTab('matched')}/{matchedCount}
          </Badge>
        </button>
        <button
          onClick={() => switchTab('new_in_pdf')}
          className={cn(
            'px-4 py-2 text-sm font-bold rounded-t-md transition-colors flex items-center gap-2',
            activeTab === 'new_in_pdf'
              ? 'bg-card border-2 border-b-0 border-foreground text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Plus className="h-3.5 w-3.5" />
          New in PDF
          <Badge variant="outline" className="text-xs ml-1 border-green-600 text-green-600">
            {getActionCountForTab('new_in_pdf')}/{newCount}
          </Badge>
        </button>
        <button
          onClick={() => switchTab('missing_from_pdf')}
          className={cn(
            'px-4 py-2 text-sm font-bold rounded-t-md transition-colors flex items-center gap-2',
            activeTab === 'missing_from_pdf'
              ? 'bg-card border-2 border-b-0 border-foreground text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          Missing
          <Badge variant="destructive" className="text-xs ml-1">
            {getActionCountForTab('missing_from_pdf')}/{missingCount}
          </Badge>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {filteredIndices.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mb-2" />
            <p className="font-semibold">No items in this category</p>
          </div>
        ) : currentItem ? (
          <div className="space-y-4">
            {/* Item counter */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-muted-foreground">
                {currentFilteredPos + 1} of {filteredIndices.length}
              </span>
              {actions[currentIndex] && (
                <Badge
                  variant={actions[currentIndex] === 'skipped' ? 'secondary' : 'default'}
                  className={cn(
                    'text-xs',
                    actions[currentIndex] === 'confirmed' && 'bg-green-600 text-white',
                    actions[currentIndex] === 'confirmed_updated' && 'bg-blue-600 text-white',
                    actions[currentIndex] === 'added' && 'bg-green-600 text-white',
                    actions[currentIndex] === 'flagged' && 'bg-destructive text-destructive-foreground'
                  )}
                >
                  {actions[currentIndex] === 'confirmed' && '✓ Confirmed'}
                  {actions[currentIndex] === 'confirmed_updated' && '✓ Confirmed & Updated'}
                  {actions[currentIndex] === 'skipped' && 'Skipped'}
                  {actions[currentIndex] === 'added' && '✓ Added'}
                  {actions[currentIndex] === 'flagged' && '⚑ Flagged'}
                </Badge>
              )}
            </div>

            {/* Content based on type */}
            {currentItem.type === 'matched' && currentItem.matchedPair && (
              <MatchedReviewCard pair={currentItem.matchedPair} onEdit={onEditListing} />
            )}

            {currentItem.type === 'new_in_pdf' && currentItem.pdfListing && (
              <NewInPdfCard pdfListing={currentItem.pdfListing} />
            )}

            {currentItem.type === 'missing_from_pdf' && currentItem.dbListing && (
              <MissingFromPdfCard dbListing={currentItem.dbListing} onEdit={onEditListing} />
            )}

            {/* Action Buttons */}
            <Separator />
            <div className="flex items-center gap-2 flex-wrap">
              {currentItem.type === 'matched' && (
                <>
                  <Button onClick={handleConfirm} size="sm" variant="outline" className="border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-950">
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Confirm Match
                  </Button>
                  <Button onClick={handleConfirmAndUpdate} size="sm">
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Confirm & Update from PDF
                  </Button>
                </>
              )}
              {currentItem.type === 'new_in_pdf' && (
                <Button onClick={handleAddNew} size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add as New Listing
                </Button>
              )}
              {currentItem.type === 'missing_from_pdf' && (
                <Button onClick={handleFlagMissing} size="sm" variant="destructive">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Flag as Missing
                </Button>
              )}
              <Button onClick={handleSkip} size="sm" variant="ghost">
                <SkipForward className="h-4 w-4 mr-1" />
                Skip
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Bottom Navigation */}
      <div className="border-t px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPrev}
            disabled={currentFilteredPos <= 0}
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={goToNext}
            disabled={currentFilteredPos >= filteredIndices.length - 1}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Thumbnail dots */}
        <ScrollArea className="max-w-[300px]">
          <div className="flex gap-1">
            {filteredIndices.map((idx, pos) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={cn(
                  'h-3 w-3 rounded-full border transition-colors flex-shrink-0',
                  pos === currentFilteredPos && 'ring-2 ring-primary ring-offset-1',
                  actions[idx] === null && 'bg-muted border-muted-foreground/30',
                  actions[idx] === 'confirmed' && 'bg-green-500 border-green-600',
                  actions[idx] === 'confirmed_updated' && 'bg-blue-500 border-blue-600',
                  actions[idx] === 'skipped' && 'bg-muted-foreground/30 border-muted-foreground/50',
                  actions[idx] === 'added' && 'bg-green-500 border-green-600',
                  actions[idx] === 'flagged' && 'bg-destructive border-destructive'
                )}
              />
            ))}
          </div>
        </ScrollArea>

        <Button onClick={handleFinish}>
          Finish Review
        </Button>
      </div>
    </div>
  );
}

// --- Sub-components ---

function MatchedReviewCard({ pair, onEdit }: { pair: MatchedPair; onEdit?: (listing: MarketListing) => void }) {
  const { pdfListing, dbListing } = pair;
  const brochureLink = pdfListing.brochure_link || dbListing.brochure_link || dbListing.link;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4">
        {/* PDF Side */}
        <div className="border-2 border-foreground rounded-md p-4 space-y-2" style={{ borderRadius: 'var(--radius)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Badge className="bg-amber-500 text-white text-xs">PDF</Badge>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Extracted</span>
          </div>
          <div>
            <p className="text-sm font-bold">{pdfListing.address}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Field label="Type" value={pdfListing.listing_type} />
            <Field label="Size" value={pdfListing.size_sf ? `${pdfListing.size_sf.toLocaleString()} SF` : null} />
            <Field label="Rate" value={pdfListing.asking_rate} />
            <Field label="City" value={pdfListing.city} />
            <Field label="Landlord" value={pdfListing.landlord} />
          </div>
        </div>

        {/* DB Side */}
        <div className="border-2 border-foreground rounded-md p-4 space-y-2" style={{ borderRadius: 'var(--radius)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Badge className="bg-blue-600 text-white text-xs">Database</Badge>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Current</span>
          </div>
          <div>
            <p className="text-sm font-bold">{dbListing.display_address || dbListing.address}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Field label="Type" value={dbListing.listing_type} />
            <Field label="Size" value={dbListing.size_sf ? `${dbListing.size_sf.toLocaleString()} SF` : null} />
            <Field label="Rate" value={dbListing.asking_rate_psf} />
            <Field label="City" value={dbListing.city} />
            <Field label="Landlord" value={dbListing.landlord} />
            <Field label="Status" value={dbListing.status} />
          </div>
        </div>
      </div>

      {/* Quick actions row */}
      <div className="flex items-center gap-2 flex-wrap">
        {brochureLink && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(brochureLink, '_blank')}
          >
            <ExternalLink className="h-3.5 w-3.5 mr-1" />
            View Brochure
          </Button>
        )}
        {onEdit && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(dbListing)}
          >
            <Pencil className="h-3.5 w-3.5 mr-1" />
            Edit Listing
          </Button>
        )}
      </div>
    </div>
  );
}

function NewInPdfCard({ pdfListing }: { pdfListing: PdfExtractedListing }) {
  return (
    <div className="border-2 border-green-600 rounded-md p-4 space-y-3" style={{ borderRadius: 'var(--radius)' }}>
      <div className="flex items-center gap-2 mb-2">
        <Badge className="bg-green-600 text-white text-xs">New</Badge>
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Found in PDF — Not in Database
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Building2 className="h-5 w-5 text-muted-foreground" />
        <p className="text-lg font-bold">{pdfListing.address}</p>
      </div>
      <div className="grid grid-cols-3 gap-3 text-sm">
        <Field label="Listing Type" value={pdfListing.listing_type} />
        <Field label="Size" value={pdfListing.size_sf ? `${pdfListing.size_sf.toLocaleString()} SF` : null} />
        <Field label="Asking Rate" value={pdfListing.asking_rate} />
        <Field label="City" value={pdfListing.city} />
        <Field label="Submarket" value={pdfListing.submarket} />
        <Field label="Landlord" value={pdfListing.landlord} />
      </div>
      <p className="text-xs text-muted-foreground italic">
        The brochure link often contains more detail — further investigation recommended after adding.
      </p>
    </div>
  );
}

function MissingFromPdfCard({ dbListing, onEdit }: { dbListing: MarketListing; onEdit?: (listing: MarketListing) => void }) {
  const brochureLink = dbListing.brochure_link || dbListing.link;
  return (
    <div className="space-y-3">
      <div className="border-2 border-destructive rounded-md p-4 space-y-3" style={{ borderRadius: 'var(--radius)' }}>
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="destructive" className="text-xs">Missing</Badge>
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            In Database — Not Found in PDF
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-muted-foreground" />
          <p className="text-lg font-bold">{dbListing.display_address || dbListing.address}</p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <Field label="Listing Type" value={dbListing.listing_type} />
          <Field label="Size" value={dbListing.size_sf ? `${dbListing.size_sf.toLocaleString()} SF` : null} />
          <Field label="Rate" value={dbListing.asking_rate_psf} />
          <Field label="City" value={dbListing.city} />
          <Field label="Status" value={dbListing.status} />
          <Field label="Broker" value={dbListing.broker_source} />
        </div>
      </div>

      {/* Quick actions row */}
      <div className="flex items-center gap-2 flex-wrap">
        {brochureLink && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(brochureLink, '_blank')}
          >
            <ExternalLink className="h-3.5 w-3.5 mr-1" />
            View Brochure
          </Button>
        )}
        {onEdit && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(dbListing)}
          >
            <Pencil className="h-3.5 w-3.5 mr-1" />
            Edit Listing
          </Button>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-muted-foreground font-medium">{label}</p>
      <p className={cn('font-semibold', !value && 'text-muted-foreground/50 italic')}>
        {value || '—'}
      </p>
    </div>
  );
}
