import { useState, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useMarketListings, MarketListing } from '@/hooks/useMarketListings';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, Link2, ClipboardCheck, FileSearch, Globe, MapPin, Copy, Wrench } from 'lucide-react';
import { MarketListingEditDialog } from '@/components/market/MarketListingEditDialog';
import { FixLinksDialog } from '@/components/market/FixLinksDialog';
import { MonthlyUpdateCheckerDialog } from '@/components/market/MonthlyUpdateCheckerDialog';
import { AuditPdfDialog } from '@/components/market/AuditPdfDialog';
import { AuditWebsiteDialog } from '@/components/market/AuditWebsiteDialog';
import { UngeocodeListingsDialog } from '@/components/market/UngeocodeListingsDialog';
import { DuplicateListingsDialog, normalizeAddressForDupeCheck } from '@/components/market/DuplicateListingsDialog';

export default function MarketListingsAdmin() {
  const navigate = useNavigate();
  const {
    listings,
    refreshListings,
    isValidatingLinks,
    linkCheckTotal,
    linkCheckChecked,
    validateLinks,
  } = useMarketListings();

  const [isFixLinksDialogOpen, setIsFixLinksDialogOpen] = useState(false);
  const [isUpdateCheckerOpen, setIsUpdateCheckerOpen] = useState(false);
  const [isAuditPdfOpen, setIsAuditPdfOpen] = useState(false);
  const [isAuditWebsiteOpen, setIsAuditWebsiteOpen] = useState(false);
  const [isUngeocodeDialogOpen, setIsUngeocodeDialogOpen] = useState(false);
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const [editingListing, setEditingListing] = useState<MarketListing | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const auditEditCallbackRef = useRef<((listingId: string) => void) | null>(null);

  const geocodedCount = listings.filter(l => l.latitude && l.longitude).length;
  const ungeocodeCount = listings.length - geocodedCount;

  const duplicateCount = useMemo(() => {
    const counts = new Map<string, number>();
    for (const l of listings) {
      const addr = normalizeAddressForDupeCheck(l);
      if (!addr) continue;
      const key = `${addr}||${l.size_sf ?? ''}||${l.land_acres ?? ''}||${l.listing_type ?? ''}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    let extras = 0;
    for (const c of counts.values()) if (c > 1) extras += c - 1;
    return extras;
  }, [listings]);

  const hasAnyLink = (l: MarketListing) => !!(l.link || l.brochure_link);
  const linksWithUrl = listings.filter(l => hasAnyLink(l));
  const linksBroken = linksWithUrl.filter(l => l.link_status === 'broken').length;
  const linksError = linksWithUrl.filter(l => l.link_status === 'error').length;
  const linksRestricted = linksWithUrl.filter(l => l.link_status === 'restricted').length;
  const issueCount = linksBroken + linksError + linksRestricted;
  const hasLinkIssues = issueCount > 0;

  const linksLeftThisRun = useMemo(() => {
    if (!isValidatingLinks || !linkCheckTotal) return 0;
    return Math.max(0, linkCheckTotal - linkCheckChecked);
  }, [isValidatingLinks, linkCheckTotal, linkCheckChecked]);

  const uniqueBrokers = useMemo(() =>
    ([...new Set(listings.map(l => l.broker_source).filter(Boolean))] as string[]).sort(),
    [listings]);

  const uniqueLandlords = useMemo(() =>
    ([...new Set(listings.map(l => l.landlord).filter(Boolean))] as string[]).sort(),
    [listings]);

  const handleFlagListings = (ids: string[]) => {
    if (ids.length > 0) navigate(`/market-listings?flagged=${ids.join(',')}`);
  };

  const buildPrefillState = (listing: any, brokerSource: string, brochureLink: string) => {
    const now = new Date();
    const id = `ML-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    return {
      sessionId: 'create', mode: 'create', timestamp: Date.now(),
      state: {
        listingId: id, address: listing.address || '', building: '', unit: '',
        displayAddress: listing.address || '', displayAddressManuallyEdited: false,
        city: listing.city || '', submarket: listing.submarket || '',
        sizeSf: listing.size_sf ? listing.size_sf.toLocaleString() : '',
        status: 'Active', listingType: listing.listing_type || '',
        askingRate: listing.asking_rate || '', opCosts: '', propertyTax: '',
        condoFees: '', salePrice: '', grossRate: '', availabilityDate: '',
        subleaseExp: '', landlord: listing.landlord || '', brokerSource,
        brochureLink, websiteLink: '', notesPublic: '', internalNote: '',
        warehouseSf: '', officeSf: '', clearHeight: '', dockDoors: '',
        driveInDoors: '', driveInDoorDimensions: [], buildingDepth: '',
        powerAmps: '', voltage: '', sprinkler: '', hasSprinklers: false,
        hasCranes: false, cranes: '', craneTons: '', yard: false, yardArea: '',
        crossDock: false, trailerParking: '', landAcres: '', zoning: '',
        mua: false, muaValue: '',
        hasLand: listing.listing_type?.includes('Land') || false,
        isDistributionWarehouse: false, calgaryQuad: '',
      },
    };
  };

  const openCreateFromAudit = (listing: any, brokerSource: string, brochureLink = '') => {
    try {
      localStorage.setItem('market-listing-form-draft', JSON.stringify(buildPrefillState(listing, brokerSource, brochureLink)));
    } catch { /* ignore */ }
    setIsCreateDialogOpen(true);
  };

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-8">
        <div>
          <Link to="/market-listings" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3">
            <ChevronLeft className="w-4 h-4" />
            Market Listings
          </Link>
          <h1 className="text-2xl font-display font-bold">Market Listings — Tools</h1>
          <p className="text-muted-foreground mt-1">Maintenance and data quality tools</p>
        </div>

        {/* Link Management */}
        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Link Management</p>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Check Links</CardTitle>
              <CardDescription>Validate all brochure and listing URLs. Results update the Link Health stat on the main page.</CardDescription>
            </CardHeader>
            <CardContent>
              {isValidatingLinks && linkCheckTotal > 0 && (
                <p className="text-sm text-muted-foreground mb-3">{linksLeftThisRun} of {linkCheckTotal} remaining…</p>
              )}
              <Button variant="outline" size="sm" onClick={validateLinks} disabled={isValidatingLinks || linksWithUrl.length === 0}>
                <Link2 className={`w-4 h-4 mr-2 ${isValidatingLinks ? 'animate-pulse' : ''}`} />
                {isValidatingLinks ? 'Checking…' : 'Check Links'}
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Fix Links</CardTitle>
              <CardDescription>
                Review and repair broken, restricted, or errored links.
                {hasLinkIssues
                  ? <span className="text-destructive"> {issueCount} issue{issueCount !== 1 ? 's' : ''} detected.</span>
                  : <span className="text-green-600"> No issues detected.</span>}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" onClick={() => setIsFixLinksDialogOpen(true)} disabled={!hasLinkIssues}>
                <Wrench className="w-4 h-4 mr-2" />
                Fix Links
                {hasLinkIssues && <Badge variant="destructive" className="ml-2 text-xs">{issueCount}</Badge>}
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Data Quality */}
        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Data Quality</p>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Fix Geocoding</CardTitle>
              <CardDescription>
                Geocode listings missing lat/lng coordinates.
                {ungeocodeCount === 0
                  ? <span className="text-green-600"> All listings geocoded.</span>
                  : <span className="text-destructive"> {ungeocodeCount} missing.</span>}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" onClick={() => setIsUngeocodeDialogOpen(true)} disabled={ungeocodeCount === 0}>
                <MapPin className="w-4 h-4 mr-2" />
                Fix Geocoding
                {ungeocodeCount > 0 && <Badge variant="destructive" className="ml-2 text-xs">{ungeocodeCount}</Badge>}
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Review Duplicates</CardTitle>
              <CardDescription>
                Find and resolve duplicate listings by address, size, and listing type.
                {duplicateCount === 0
                  ? <span className="text-green-600"> No duplicates found.</span>
                  : <span className="text-destructive"> {duplicateCount} potential duplicate{duplicateCount !== 1 ? 's' : ''}.</span>}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" onClick={() => setIsDuplicateDialogOpen(true)} disabled={duplicateCount === 0}>
                <Copy className="w-4 h-4 mr-2" />
                Review Duplicates
                {duplicateCount > 0 && <Badge variant="destructive" className="ml-2 text-xs">{duplicateCount}</Badge>}
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Audit Tools */}
        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Audit Tools</p>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Monthly Updates</CardTitle>
              <CardDescription>Check listings against brokerage PDFs for new, changed, or removed properties.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" onClick={() => setIsUpdateCheckerOpen(true)}>
                <ClipboardCheck className="w-4 h-4 mr-2" />
                Monthly Updates
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Audit PDF</CardTitle>
              <CardDescription>Upload a brokerage PDF to flag listings missing from the file. Flagged results filter the main listings table.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" onClick={() => setIsAuditPdfOpen(true)}>
                <FileSearch className="w-4 h-4 mr-2" />
                Audit PDF
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Audit Website</CardTitle>
              <CardDescription>Scrape brokerage websites to detect listing changes.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" onClick={() => setIsAuditWebsiteOpen(true)}>
                <Globe className="w-4 h-4 mr-2" />
                Audit Website
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Dialogs */}
        <FixLinksDialog
          open={isFixLinksDialogOpen}
          onOpenChange={setIsFixLinksDialogOpen}
          listings={listings}
          onListingUpdated={refreshListings}
        />
        <UngeocodeListingsDialog
          open={isUngeocodeDialogOpen}
          onOpenChange={setIsUngeocodeDialogOpen}
          listings={listings}
          onListingUpdated={refreshListings}
        />
        <DuplicateListingsDialog
          open={isDuplicateDialogOpen}
          onOpenChange={setIsDuplicateDialogOpen}
          listings={listings}
          onListingUpdated={refreshListings}
          onFilterByAddress={(addr) => navigate(`/market-listings?search=${encodeURIComponent(addr)}`)}
        />
        <MonthlyUpdateCheckerDialog
          open={isUpdateCheckerOpen}
          onOpenChange={setIsUpdateCheckerOpen}
          listings={listings}
        />
        <AuditPdfDialog
          open={isAuditPdfOpen}
          onOpenChange={setIsAuditPdfOpen}
          listings={listings.filter(l => l.status === 'Active' || l.status === 'Under Contract')}
          uniqueBrokers={uniqueBrokers}
          uniqueLandlords={uniqueLandlords}
          onFlagListings={handleFlagListings}
          onAddNewListing={(pdfListing, brokerSource) => openCreateFromAudit(pdfListing, brokerSource)}
          onRefreshListings={refreshListings}
          onEditListing={(listing) => setEditingListing(listing)}
          onRegisterEditCallback={(cb) => { auditEditCallbackRef.current = cb; }}
        />
        <AuditWebsiteDialog
          open={isAuditWebsiteOpen}
          onOpenChange={setIsAuditWebsiteOpen}
          listings={listings.filter(l => l.status === 'Active' || l.status === 'Under Contract')}
          uniqueLandlords={uniqueLandlords}
          onFlagListings={handleFlagListings}
          onAddNewListing={(webListing, landlordName) => openCreateFromAudit(webListing, landlordName, webListing.brochure_link || '')}
          onRefreshListings={refreshListings}
          onEditListing={(listing) => setEditingListing(listing)}
          onRegisterEditCallback={(cb) => { auditEditCallbackRef.current = cb; }}
        />
        <MarketListingEditDialog
          listing={editingListing}
          open={editingListing !== null}
          onOpenChange={(open) => { if (!open) setEditingListing(null); }}
          onSaved={() => { setEditingListing(null); refreshListings(); }}
          mode="edit"
        />
        <MarketListingEditDialog
          listing={null}
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          onSaved={() => { setIsCreateDialogOpen(false); refreshListings(); }}
          mode="create"
        />
      </div>
    </AppLayout>
  );
}
