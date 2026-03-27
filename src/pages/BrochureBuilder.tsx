import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Sparkles, Download, FileText, Plus, Minus, Loader2, Upload,
} from 'lucide-react';
import { BrochureTemplate } from '@/components/brochures/BrochureTemplate';
import { exportBrochureAsPptx } from '@/lib/brochures/exportPptx';
import type { BrochureProps, BrokerContact, DriveTime } from '@/lib/brochures/brochureTypes';

type ListingType = 'sale' | 'lease' | 'sale-lease';

const TYPE_OPTIONS: { value: ListingType; label: string }[] = [
  { value: 'sale', label: 'Sale' },
  { value: 'lease', label: 'Lease' },
  { value: 'sale-lease', label: 'Sale + Lease' },
];

const COLOR_SWATCHES = [
  { value: '#6B8F3E', label: 'Olive' },
  { value: '#0f2044', label: 'Navy' },
  { value: '#C41E3A', label: 'Red' },
  { value: '#D97706', label: 'Amber' },
  { value: '#0D7377', label: 'Teal' },
  { value: '#7C3AED', label: 'Purple' },
];

const DEFAULT_DISCLAIMER =
  'The information contained herein has been obtained from sources believed to be reliable. No warranty or representation is made as to its accuracy. All information is subject to change without notice.';

export default function BrochureBuilder() {
  const [searchParams] = useSearchParams();
  const listingId = searchParams.get('listingId');

  const [loading, setLoading] = useState(!!listingId);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingPptx, setDownloadingPptx] = useState(false);

  // Form state
  const [type, setType] = useState<ListingType>('lease');
  const [accentColor, setAccentColor] = useState('#0f2044');
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
  const [district, setDistrict] = useState('');
  const [askingPrice, setAskingPrice] = useState('');
  const [leaseRate, setLeaseRate] = useState('');
  const [leaseType, setLeaseType] = useState('');
  const [operatingCosts, setOperatingCosts] = useState('');
  const [headline, setHeadline] = useState('');
  const [highlights, setHighlights] = useState<string[]>(['']);
  const [primaryPhotoUrl, setPrimaryPhotoUrl] = useState('');
  const [secondaryPhotoUrl, setSecondaryPhotoUrl] = useState('');
  const [aerialPhotoUrl, setAerialPhotoUrl] = useState('');
  const [floorPlanImageUrl, setFloorPlanImageUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [latitude, setLatitude] = useState<number | undefined>();
  const [longitude, setLongitude] = useState<number | undefined>();
  const [driveTimes, setDriveTimes] = useState<DriveTime[]>([]);
  const [brokers, setBrokers] = useState<BrokerContact[]>([
    { name: '', title: '', email: '' },
  ]);
  const [companyName, setCompanyName] = useState('');
  const [disclaimer, setDisclaimer] = useState(DEFAULT_DISCLAIMER);

  const listingDataRef = useRef<any>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(1);

  // Compute preview scale
  useEffect(() => {
    const container = previewContainerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const availableWidth = entry.contentRect.width - 32;
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
          .select('*, internal_listing_photos(id, photo_url, sort_order), assigned_agent:agents!internal_listings_assigned_agent_id_fkey(name, email, phone), secondary_agent:agents!internal_listings_secondary_agent_id_fkey(name, email, phone)')
          .eq('id', listingId)
          .single();
        if (error) throw error;
        if (!data) return;

        listingDataRef.current = data;

        setAddress(data.address || '');
        setCity(data.city || '');

        // Auto-populate agents
        const newBrokers: BrokerContact[] = [];
        const agent1 = data.assigned_agent as any;
        if (agent1) {
          newBrokers.push({
            name: agent1.name || '',
            title: 'Sales Associate',
            directPhone: agent1.phone || '',
            email: agent1.email || '',
          });
        }
        const agent2 = data.secondary_agent as any;
        if (agent2) {
          newBrokers.push({
            name: agent2.name || '',
            title: 'Sales Associate',
            directPhone: agent2.phone || '',
            email: agent2.email || '',
          });
        }
        if (newBrokers.length > 0) setBrokers(newBrokers);

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
        if (data.submarket) setDistrict(data.submarket);
        if (data.asking_sale_price) setAskingPrice(`$${data.asking_sale_price.toLocaleString()}`);
        if (data.asking_rent_psf) setLeaseRate(`$${data.asking_rent_psf}/SF`);
        if (data.op_costs) setOperatingCosts(`$${data.op_costs}/SF`);
        if (data.latitude) setLatitude(data.latitude);
        if (data.longitude) setLongitude(data.longitude);

        const photos = data.internal_listing_photos || [];
        const sorted = [...photos].sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
        if (sorted.length > 0) setPrimaryPhotoUrl(sorted[0].photo_url);
        if (sorted.length > 1) setSecondaryPhotoUrl(sorted[1].photo_url);
        if (sorted.length > 2) setAerialPhotoUrl(sorted[2].photo_url);
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
      const listing = listingDataRef.current || { address, city, size_sf: buildingSF, clear_height_ft: clearHeight, dock_doors: dockDoors, drive_in_doors: gradeDoors, power, zoning };
      const { data, error } = await supabase.functions.invoke('generate-listing-marketing', { body: { listing } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.headline) setHeadline(data.headline);
      if (data?.highlights && Array.isArray(data.highlights)) setHighlights(data.highlights.slice(0, 5));
      toast.success('AI content generated!');
    } catch (err) {
      console.error('AI generation error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to generate content');
    } finally {
      setGeneratingAI(false);
    }
  }, [address, city, buildingSF, clearHeight, dockDoors, gradeDoors, power, zoning]);

  // Build props
  const brochureProps: BrochureProps = useMemo(() => ({
    type,
    accentColor,
    address,
    city,
    province,
    buildingSF: buildingSF || undefined,
    landAcres: landAcres || undefined,
    clearHeight: clearHeight || undefined,
    dockDoors: dockDoors || undefined,
    gradeDoors: gradeDoors || undefined,
    power: power || undefined,
    zoning: zoning || undefined,
    occupancy: occupancy || undefined,
    district: district || undefined,
    askingPrice: askingPrice || undefined,
    leaseRate: leaseRate || undefined,
    leaseType: leaseType || undefined,
    operatingCosts: operatingCosts || undefined,
    headline: headline || 'Property Headline',
    highlights: highlights.filter(h => h.trim()),
    primaryPhotoUrl: primaryPhotoUrl || undefined,
    secondaryPhotoUrl: secondaryPhotoUrl || undefined,
    aerialPhotoUrl: aerialPhotoUrl || undefined,
    floorPlanImageUrl: floorPlanImageUrl || undefined,
    logoUrl: logoUrl || undefined,
    latitude,
    longitude,
    driveTimes,
    brokers: brokers.filter(b => b.name.trim()),
    companyName: companyName || 'Brokerage',
    disclaimer: disclaimer || undefined,
  }), [
    type, accentColor, address, city, province, buildingSF, landAcres, clearHeight,
    dockDoors, gradeDoors, power, zoning, occupancy, district, askingPrice, leaseRate,
    leaseType, operatingCosts, headline, highlights, primaryPhotoUrl, secondaryPhotoUrl,
    aerialPhotoUrl, floorPlanImageUrl, logoUrl, latitude, longitude, driveTimes,
    brokers, companyName, disclaimer,
  ]);

  // Download PDF
  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const el = document.getElementById('brochure-preview');
      if (!el) throw new Error('Preview element not found');

      const { data, error } = await supabase.functions.invoke('generate-brochure-pdf', {
        body: { templateHtml: el.outerHTML },
      });
      if (error) throw error;

      let blob: Blob;
      if (data instanceof Blob) blob = data;
      else if (data instanceof ArrayBuffer) blob = new Blob([data], { type: 'application/pdf' });
      else throw new Error('Unexpected response format');

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
  const handlePhotoUpload = useCallback(async (file: File, setter: (url: string) => void) => {
    try {
      const ext = file.name.split('.').pop();
      const path = `brochure-assets/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from('internal-listing-photos').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('internal-listing-photos').getPublicUrl(path);
      setter(publicUrl);
      toast.success('Photo uploaded');
    } catch {
      toast.error('Failed to upload photo');
    }
  }, []);

  // Highlight helpers
  const addHighlight = () => { if (highlights.length < 5) setHighlights([...highlights, '']); };
  const removeHighlight = (idx: number) => setHighlights(highlights.filter((_, i) => i !== idx));
  const updateHighlight = (idx: number, val: string) => { const n = [...highlights]; n[idx] = val; setHighlights(n); };

  // Drive time helpers
  const addDriveTime = () => { if (driveTimes.length < 6) setDriveTimes([...driveTimes, { minutes: '', label: '' }]); };
  const removeDriveTime = (idx: number) => setDriveTimes(driveTimes.filter((_, i) => i !== idx));
  const updateDriveTime = (idx: number, field: keyof DriveTime, val: string) => {
    const n = [...driveTimes]; n[idx] = { ...n[idx], [field]: val }; setDriveTimes(n);
  };

  // Broker helpers
  const addBroker = () => { if (brokers.length < 6) setBrokers([...brokers, { name: '', title: '', email: '' }]); };
  const removeBroker = (idx: number) => setBrokers(brokers.filter((_, i) => i !== idx));
  const updateBroker = (idx: number, field: keyof BrokerContact, val: string) => {
    const n = [...brokers]; n[idx] = { ...n[idx], [field]: val }; setBrokers(n);
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
          {/* ── Left: Edit Panel ─── */}
          <ResizablePanel defaultSize={40} minSize={30}>
            <div className="h-full overflow-y-auto p-4 space-y-6">
              {/* Type & Style */}
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Listing Type</Label>
                <div className="flex gap-1 mt-1.5">
                  {TYPE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setType(opt.value)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                        type === opt.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Accent Color */}
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Accent Color</Label>
                <div className="flex gap-2 mt-1.5">
                  {COLOR_SWATCHES.map(c => (
                    <button
                      key={c.value}
                      onClick={() => setAccentColor(c.value)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        accentColor === c.value ? 'border-foreground scale-110' : 'border-transparent'
                      }`}
                      style={{ background: c.value }}
                      title={c.label}
                    />
                  ))}
                  <Input
                    value={accentColor}
                    onChange={e => setAccentColor(e.target.value)}
                    className="w-24 h-8 text-xs"
                    placeholder="#hex"
                  />
                </div>
              </div>

              {/* Address */}
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-3">
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" value={address} onChange={e => setAddress(e.target.value)} />
                </div>
                <div className="col-span-1">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" value={city} onChange={e => setCity(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="province">Province</Label>
                  <Input id="province" value={province} onChange={e => setProvince(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="district">District</Label>
                  <Input id="district" value={district} onChange={e => setDistrict(e.target.value)} />
                </div>
              </div>

              {/* Specs */}
              <div>
                <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-2">Specifications</h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ['buildingSF', 'Building SF', buildingSF, setBuildingSF],
                    ['landAcres', 'Land', landAcres, setLandAcres],
                    ['clearHeight', 'Clear Height', clearHeight, setClearHeight],
                    ['dockDoors', 'Dock Doors', dockDoors, setDockDoors],
                    ['gradeDoors', 'Grade Doors', gradeDoors, setGradeDoors],
                    ['power', 'Power', power, setPower],
                    ['zoning', 'Zoning', zoning, setZoning],
                    ['occupancy', 'Occupancy', occupancy, setOccupancy],
                  ].map(([id, label, val, setter]) => (
                    <div key={id as string}>
                      <Label htmlFor={id as string}>{label as string}</Label>
                      <Input id={id as string} value={val as string} onChange={e => (setter as (v: string) => void)(e.target.value)} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Pricing */}
              <div>
                <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-2">Pricing</h3>
                <div className="grid grid-cols-2 gap-2">
                  {(type === 'sale' || type === 'sale-lease') && (
                    <div>
                      <Label>Asking Price</Label>
                      <Input value={askingPrice} onChange={e => setAskingPrice(e.target.value)} />
                    </div>
                  )}
                  {(type === 'lease' || type === 'sale-lease') && (
                    <>
                      <div>
                        <Label>Lease Rate</Label>
                        <Input value={leaseRate} onChange={e => setLeaseRate(e.target.value)} />
                      </div>
                      <div>
                        <Label>Lease Type</Label>
                        <Input value={leaseType} onChange={e => setLeaseType(e.target.value)} placeholder="e.g. Net" />
                      </div>
                      <div>
                        <Label>Operating Costs</Label>
                        <Input value={operatingCosts} onChange={e => setOperatingCosts(e.target.value)} />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Headline */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label>Headline</Label>
                  <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={handleGenerateAI} disabled={generatingAI}>
                    {generatingAI ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    Generate with AI
                  </Button>
                </div>
                <Input value={headline} onChange={e => setHeadline(e.target.value)} />
              </div>

              {/* Highlights */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label>Highlights</Label>
                  <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={addHighlight} disabled={highlights.length >= 5}>
                    <Plus className="h-3 w-3" /> Add
                  </Button>
                </div>
                <div className="space-y-2">
                  {highlights.map((h, i) => (
                    <div key={i} className="flex gap-2">
                      <Input value={h} onChange={e => updateHighlight(i, e.target.value)} placeholder={`Highlight ${i + 1}`} />
                      <Button variant="ghost" size="icon" onClick={() => removeHighlight(i)} className="flex-shrink-0"><Minus className="h-4 w-4" /></Button>
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
                  <PhotoField label="Floor Plan" value={floorPlanImageUrl} onChange={setFloorPlanImageUrl} onUpload={handlePhotoUpload} />
                  <PhotoField label="Logo" value={logoUrl} onChange={setLogoUrl} onUpload={handlePhotoUpload} />
                </div>
              </div>

              {/* Drive Times */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Drive Times</h3>
                  <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={addDriveTime} disabled={driveTimes.length >= 6}>
                    <Plus className="h-3 w-3" /> Add
                  </Button>
                </div>
                {latitude && longitude ? (
                  <div className="space-y-2">
                    {driveTimes.map((dt, i) => (
                      <div key={i} className="flex gap-2">
                        <Input value={dt.minutes} onChange={e => updateDriveTime(i, 'minutes', e.target.value)} placeholder="Min" className="w-16" />
                        <Input value={dt.label} onChange={e => updateDriveTime(i, 'label', e.target.value)} placeholder="e.g. Stoney Trail" />
                        <Button variant="ghost" size="icon" onClick={() => removeDriveTime(i)} className="flex-shrink-0"><Minus className="h-4 w-4" /></Button>
                      </div>
                    ))}
                    {driveTimes.length === 0 && (
                      <p className="text-xs text-muted-foreground">Add drive times to enable the Location page</p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Geocoded coordinates required for location page</p>
                )}
              </div>

              {/* Brokers */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Brokers</h3>
                  <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={addBroker} disabled={brokers.length >= 6}>
                    <Plus className="h-3 w-3" /> Add
                  </Button>
                </div>
                <div className="space-y-4">
                  {brokers.map((b, i) => (
                    <div key={i} className="p-3 border rounded-md space-y-2 relative">
                      {brokers.length > 1 && (
                        <Button variant="ghost" size="icon" onClick={() => removeBroker(i)} className="absolute top-1 right-1 h-6 w-6">
                          <Minus className="h-3 w-3" />
                        </Button>
                      )}
                      <div className="text-xs font-medium text-muted-foreground">Agent {i + 1}</div>
                      <div className="grid grid-cols-2 gap-2">
                        <div><Label className="text-xs">Name</Label><Input value={b.name} onChange={e => updateBroker(i, 'name', e.target.value)} /></div>
                        <div><Label className="text-xs">Title</Label><Input value={b.title} onChange={e => updateBroker(i, 'title', e.target.value)} /></div>
                        <div><Label className="text-xs">Direct Phone</Label><Input value={b.directPhone || ''} onChange={e => updateBroker(i, 'directPhone', e.target.value)} /></div>
                        <div><Label className="text-xs">Cell Phone</Label><Input value={b.cellPhone || ''} onChange={e => updateBroker(i, 'cellPhone', e.target.value)} /></div>
                        <div className="col-span-2"><Label className="text-xs">Email</Label><Input value={b.email} onChange={e => updateBroker(i, 'email', e.target.value)} /></div>
                      </div>
                      <PhotoField label="Photo" value={b.photoUrl || ''} onChange={url => updateBroker(i, 'photoUrl', url)} onUpload={handlePhotoUpload} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Company */}
              <div>
                <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-2">Company</h3>
                <Label>Company Name</Label>
                <Input value={companyName} onChange={e => setCompanyName(e.target.value)} />
              </div>

              {/* Disclaimer */}
              <div>
                <Label>Disclaimer</Label>
                <Textarea value={disclaimer} onChange={e => setDisclaimer(e.target.value)} rows={3} className="text-xs" />
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* ── Right: Preview ─── */}
          <ResizablePanel defaultSize={60} minSize={40}>
            <div ref={previewContainerRef} className="h-full overflow-y-auto bg-muted/30 p-4">
              <div
                className="origin-top-left mx-auto"
                style={{ transform: `scale(${previewScale})`, width: 816, transformOrigin: 'top center' }}
              >
                <BrochureTemplate {...brochureProps} />
              </div>

              <div className="flex items-center justify-center gap-3 mt-6 pb-4" style={{ position: 'relative', zIndex: 10 }}>
                <Button onClick={handleDownloadPdf} disabled={downloadingPdf} className="gap-2">
                  {downloadingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                  Download PDF
                </Button>
                <Button variant="outline" onClick={handleDownloadPptx} disabled={downloadingPptx} className="gap-2">
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

// ── Photo field sub-component ──

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
        <Input value={value} onChange={e => onChange(e.target.value)} placeholder="URL or upload..." className="text-xs" />
        <Button variant="outline" size="icon" className="flex-shrink-0" onClick={() => inputRef.current?.click()}>
          <Upload className="h-4 w-4" />
        </Button>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f, onChange); }} />
      </div>
      {value && <img src={value} alt={label} className="mt-1.5 h-16 w-auto rounded object-cover" />}
    </div>
  );
}
