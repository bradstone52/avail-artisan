import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Sparkles, Download, FileText, Plus, Minus, Loader2, Image as ImageIcon, Upload,
} from 'lucide-react';
import { BrochureTemplate, type BrochureProps } from '@/components/brochures/BrochureTemplate';
import { exportBrochureAsPptx } from '@/lib/brochures/exportPptx';

type ListingType = 'sale' | 'lease' | 'sale-lease';

const TYPE_OPTIONS: { value: ListingType; label: string }[] = [
  { value: 'sale', label: 'Sale' },
  { value: 'lease', label: 'Lease' },
  { value: 'sale-lease', label: 'Sale + Lease' },
];

export default function BrochureBuilder() {
  const [searchParams] = useSearchParams();
  const listingId = searchParams.get('listingId');

  const [loading, setLoading] = useState(!!listingId);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingPptx, setDownloadingPptx] = useState(false);

  // Form state
  const [type, setType] = useState<ListingType>('lease');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('AB');
  const [buildingSF, setBuildingSF] = useState('');
  const [landAcres, setLandAcres] = useState('');
  const [clearHeight, setClearHeight] = useState('');
  const [dockDoors, setDockDoors] = useState('');
  const [gradeDoors, setGradeDoors] = useState('');
  const [power, setPower] = useState('');
  const [zoning, setZoning] = useState('');
  const [occupancy, setOccupancy] = useState('');
  const [askingPrice, setAskingPrice] = useState('');
  const [leaseRate, setLeaseRate] = useState('');
  const [leaseType, setLeaseType] = useState('');
  const [headline, setHeadline] = useState('');
  const [highlights, setHighlights] = useState<string[]>(['']);
  const [primaryPhotoUrl, setPrimaryPhotoUrl] = useState('');
  const [secondaryPhotoUrl, setSecondaryPhotoUrl] = useState('');
  const [aerialPhotoUrl, setAerialPhotoUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [brokerName, setBrokerName] = useState('');
  const [brokerTitle, setBrokerTitle] = useState('');
  const [brokerPhone, setBrokerPhone] = useState('');
  const [brokerEmail, setBrokerEmail] = useState('');
  const [brokerPhotoUrl, setBrokerPhotoUrl] = useState('');
  const [companyName, setCompanyName] = useState('');

  // Store listing data for AI generation
  const listingDataRef = useRef<any>(null);

  // Preview container for scaling
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(1);

  // Debounce timer
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Compute preview scale
  useEffect(() => {
    const container = previewContainerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const availableWidth = entry.contentRect.width - 32; // padding
        const scale = Math.min(availableWidth / 816, 1);
        setPreviewScale(scale);
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Load listing data
  useEffect(() => {
    if (!listingId) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('internal_listings')
          .select('*, internal_listing_photos(id, photo_url, sort_order)')
          .eq('id', listingId)
          .single();
        if (error) throw error;
        if (!data) return;

        listingDataRef.current = data;

        setAddress(data.address || '');
        setCity(data.city || '');

        // Map deal_type
        const dt = (data.deal_type || '').toLowerCase();
        if (dt === 'sale') setType('sale');
        else if (dt === 'both') setType('sale-lease');
        else setType('lease');

        if (data.size_sf) setBuildingSF(`${data.size_sf.toLocaleString()} SF`);
        if (data.land_acres) setLandAcres(`${data.land_acres} acres`);
        if (data.clear_height_ft) setClearHeight(`${data.clear_height_ft} ft`);
        if (data.dock_doors) setDockDoors(String(data.dock_doors));
        if (data.drive_in_doors) setGradeDoors(String(data.drive_in_doors));
        if (data.power) setPower(data.power);
        if (data.zoning) setZoning(data.zoning);
        if (data.asking_sale_price) setAskingPrice(`$${data.asking_sale_price.toLocaleString()}`);
        if (data.asking_rent_psf) setLeaseRate(`$${data.asking_rent_psf}/SF`);

        // First photo
        const photos = data.internal_listing_photos || [];
        const sorted = [...photos].sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
        if (sorted.length > 0) setPrimaryPhotoUrl(sorted[0].photo_url);
        if (data.photo_url && !sorted.length) setPrimaryPhotoUrl(data.photo_url);

        setHeadline(`Premium Industrial Opportunity — ${data.address}`);
      } catch (err) {
        console.error('Failed to load listing:', err);
        toast.error('Failed to load listing data');
      } finally {
        setLoading(false);
      }
    })();
  }, [listingId]);

  // Generate AI content
  const handleGenerateAI = useCallback(async () => {
    setGeneratingAI(true);
    try {
      const listing = listingDataRef.current || {
        address, city, size_sf: buildingSF, clear_height_ft: clearHeight,
        dock_doors: dockDoors, drive_in_doors: gradeDoors, power, zoning,
      };
      const { data, error } = await supabase.functions.invoke('generate-listing-marketing', {
        body: { listing },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.headline) setHeadline(data.headline);
      if (data?.highlights && Array.isArray(data.highlights)) {
        setHighlights(data.highlights.slice(0, 5));
      }
      toast.success('AI content generated!');
    } catch (err) {
      console.error('AI generation error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to generate content');
    } finally {
      setGeneratingAI(false);
    }
  }, [address, city, buildingSF, clearHeight, dockDoors, gradeDoors, power, zoning]);

  // Build props (debounced via useMemo is fine since it's synchronous)
  const brochureProps: BrochureProps = useMemo(() => ({
    type, address, city, province,
    buildingSF: buildingSF || undefined,
    landAcres: landAcres || undefined,
    clearHeight: clearHeight || undefined,
    dockDoors: dockDoors || undefined,
    gradeDoors: gradeDoors || undefined,
    power: power || undefined,
    zoning: zoning || undefined,
    occupancy: occupancy || undefined,
    askingPrice: askingPrice || undefined,
    leaseRate: leaseRate || undefined,
    leaseType: leaseType || undefined,
    headline: headline || 'Property Headline',
    highlights: highlights.filter(h => h.trim()),
    primaryPhotoUrl: primaryPhotoUrl || undefined,
    secondaryPhotoUrl: secondaryPhotoUrl || undefined,
    aerialPhotoUrl: aerialPhotoUrl || undefined,
    logoUrl: logoUrl || undefined,
    brokerName: brokerName || 'Broker Name',
    brokerTitle: brokerTitle || 'Sales Associate',
    brokerPhone: brokerPhone || '',
    brokerEmail: brokerEmail || '',
    brokerPhotoUrl: brokerPhotoUrl || undefined,
    companyName: companyName || 'Brokerage',
  }), [
    type, address, city, province, buildingSF, landAcres, clearHeight,
    dockDoors, gradeDoors, power, zoning, occupancy, askingPrice, leaseRate,
    leaseType, headline, highlights, primaryPhotoUrl, secondaryPhotoUrl,
    aerialPhotoUrl, logoUrl, brokerName, brokerTitle, brokerPhone, brokerEmail,
    brokerPhotoUrl, companyName,
  ]);

  // Download PDF
  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const el = document.getElementById('brochure-preview');
      if (!el) throw new Error('Preview element not found');
      const html = el.outerHTML;

      const { data, error } = await supabase.functions.invoke('generate-brochure-pdf', {
        body: { templateHtml: html },
      });
      if (error) throw error;

      // The response should be a PDF blob
      let blob: Blob;
      if (data instanceof Blob) {
        blob = data;
      } else if (data instanceof ArrayBuffer) {
        blob = new Blob([data], { type: 'application/pdf' });
      } else {
        throw new Error('Unexpected response format');
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'brochure.pdf';
      link.click();
      URL.revokeObjectURL(url);
      toast.success('PDF downloaded!');
    } catch (err) {
      console.error('PDF download error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to download PDF');
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Download PPTX
  const handleDownloadPptx = async () => {
    setDownloadingPptx(true);
    try {
      await exportBrochureAsPptx(brochureProps);
      toast.success('PPTX downloaded!');
    } catch (err) {
      console.error('PPTX download error:', err);
      toast.error('Failed to download PPTX');
    } finally {
      setDownloadingPptx(false);
    }
  };

  // Photo upload helper
  const handlePhotoUpload = useCallback(async (
    file: File,
    setter: (url: string) => void,
  ) => {
    try {
      const ext = file.name.split('.').pop();
      const path = `brochure-assets/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('internal-listing-photos')
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage
        .from('internal-listing-photos')
        .getPublicUrl(path);
      setter(publicUrl);
      toast.success('Photo uploaded');
    } catch {
      toast.error('Failed to upload photo');
    }
  }, []);

  // Highlight helpers
  const addHighlight = () => {
    if (highlights.length >= 5) return;
    setHighlights([...highlights, '']);
  };
  const removeHighlight = (idx: number) => {
    setHighlights(highlights.filter((_, i) => i !== idx));
  };
  const updateHighlight = (idx: number, val: string) => {
    const next = [...highlights];
    next[idx] = val;
    setHighlights(next);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-[600px] w-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-4">
        <PageHeader title="Brochure Builder" />

        <ResizablePanelGroup direction="horizontal" className="min-h-[800px] rounded-lg border">
          {/* ── Left: Edit Panel ─────────────────────────────────── */}
          <ResizablePanel defaultSize={40} minSize={30}>
            <div className="h-full overflow-y-auto p-4 space-y-6">
              {/* Type selector */}
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Listing Type</Label>
                <div className="flex gap-1 mt-1.5">
                  {TYPE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setType(opt.value)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                        type === opt.value
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-accent'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Address */}
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-3">
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" value={address} onChange={e => setAddress(e.target.value)} />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" value={city} onChange={e => setCity(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="province">Province</Label>
                  <Input id="province" value={province} onChange={e => setProvince(e.target.value)} />
                </div>
              </div>

              {/* Specs */}
              <div>
                <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-2">Specifications</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="buildingSF">Building SF</Label>
                    <Input id="buildingSF" value={buildingSF} onChange={e => setBuildingSF(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="landAcres">Land</Label>
                    <Input id="landAcres" value={landAcres} onChange={e => setLandAcres(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="clearHeight">Clear Height</Label>
                    <Input id="clearHeight" value={clearHeight} onChange={e => setClearHeight(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="dockDoors">Dock Doors</Label>
                    <Input id="dockDoors" value={dockDoors} onChange={e => setDockDoors(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="gradeDoors">Grade Doors</Label>
                    <Input id="gradeDoors" value={gradeDoors} onChange={e => setGradeDoors(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="power">Power</Label>
                    <Input id="power" value={power} onChange={e => setPower(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="zoning">Zoning</Label>
                    <Input id="zoning" value={zoning} onChange={e => setZoning(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="occupancy">Occupancy</Label>
                    <Input id="occupancy" value={occupancy} onChange={e => setOccupancy(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div>
                <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-2">Pricing</h3>
                <div className="grid grid-cols-2 gap-2">
                  {(type === 'sale' || type === 'sale-lease') && (
                    <div>
                      <Label htmlFor="askingPrice">Asking Price</Label>
                      <Input id="askingPrice" value={askingPrice} onChange={e => setAskingPrice(e.target.value)} />
                    </div>
                  )}
                  {(type === 'lease' || type === 'sale-lease') && (
                    <>
                      <div>
                        <Label htmlFor="leaseRate">Lease Rate</Label>
                        <Input id="leaseRate" value={leaseRate} onChange={e => setLeaseRate(e.target.value)} />
                      </div>
                      <div>
                        <Label htmlFor="leaseType">Lease Type</Label>
                        <Input id="leaseType" value={leaseType} onChange={e => setLeaseType(e.target.value)} placeholder="e.g. Net" />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Headline */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label htmlFor="headline">Headline</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-xs"
                    onClick={handleGenerateAI}
                    disabled={generatingAI}
                  >
                    {generatingAI ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    Generate with AI
                  </Button>
                </div>
                <Input id="headline" value={headline} onChange={e => setHeadline(e.target.value)} />
              </div>

              {/* Highlights */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label>Highlights</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-xs"
                    onClick={addHighlight}
                    disabled={highlights.length >= 5}
                  >
                    <Plus className="h-3 w-3" /> Add
                  </Button>
                </div>
                <div className="space-y-2">
                  {highlights.map((h, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        value={h}
                        onChange={e => updateHighlight(i, e.target.value)}
                        placeholder={`Highlight ${i + 1}`}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeHighlight(i)}
                        className="flex-shrink-0"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Photos */}
              <div>
                <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-2">Photos</h3>
                <div className="space-y-3">
                  <PhotoField label="Primary Photo" value={primaryPhotoUrl} onChange={setPrimaryPhotoUrl} onUpload={handlePhotoUpload} />
                  <PhotoField label="Secondary Photo" value={secondaryPhotoUrl} onChange={setSecondaryPhotoUrl} onUpload={handlePhotoUpload} />
                  <PhotoField label="Aerial Photo" value={aerialPhotoUrl} onChange={setAerialPhotoUrl} onUpload={handlePhotoUpload} />
                  <PhotoField label="Logo" value={logoUrl} onChange={setLogoUrl} onUpload={handlePhotoUpload} />
                  <PhotoField label="Broker Photo" value={brokerPhotoUrl} onChange={setBrokerPhotoUrl} onUpload={handlePhotoUpload} />
                </div>
              </div>

              {/* Broker Info */}
              <div>
                <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-2">Broker</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="brokerName">Name</Label>
                    <Input id="brokerName" value={brokerName} onChange={e => setBrokerName(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="brokerTitle">Title</Label>
                    <Input id="brokerTitle" value={brokerTitle} onChange={e => setBrokerTitle(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="brokerPhone">Phone</Label>
                    <Input id="brokerPhone" value={brokerPhone} onChange={e => setBrokerPhone(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="brokerEmail">Email</Label>
                    <Input id="brokerEmail" value={brokerEmail} onChange={e => setBrokerEmail(e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="companyName">Company</Label>
                    <Input id="companyName" value={companyName} onChange={e => setCompanyName(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* ── Right: Preview ───────────────────────────────────── */}
          <ResizablePanel defaultSize={60} minSize={40}>
            <div ref={previewContainerRef} className="h-full overflow-y-auto bg-muted/30 p-4">
              {/* Scaled preview */}
              <div
                className="origin-top-left mx-auto"
                style={{
                  transform: `scale(${previewScale})`,
                  width: 816,
                  transformOrigin: 'top center',
                }}
              >
                <BrochureTemplate {...brochureProps} />
              </div>

              {/* Download buttons */}
              <div className="flex items-center justify-center gap-3 mt-6 pb-4" style={{ position: 'relative', zIndex: 10 }}>
                <Button
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf}
                  className="gap-2"
                >
                  {downloadingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                  Download PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownloadPptx}
                  disabled={downloadingPptx}
                  className="gap-2"
                >
                  {downloadingPptx ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Download PPTX
                </Button>
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </AppLayout>
  );
}

// ── Photo field sub-component ──────────────────────────────────────────────────

interface PhotoFieldProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  onUpload: (file: File, setter: (url: string) => void) => Promise<void>;
}

function PhotoField({ label, value, onChange, onUpload }: PhotoFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="flex gap-2 mt-1">
        <Input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="URL or upload..."
          className="text-xs"
        />
        <Button
          variant="outline"
          size="icon"
          className="flex-shrink-0"
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-4 w-4" />
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) onUpload(file, onChange);
          }}
        />
      </div>
      {value && (
        <img src={value} alt={label} className="mt-1.5 h-16 w-auto rounded object-cover" />
      )}
    </div>
  );
}
