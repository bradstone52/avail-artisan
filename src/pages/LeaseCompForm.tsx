import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLeaseComps } from '@/hooks/useLeaseComps';
import { useSubmarkets } from '@/hooks/useSubmarkets';
import { ArrowLeft, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LeaseCompForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  const { createLeaseComp, updateLeaseComp, getLeaseComp } = useLeaseComps();
  const submarkets = useSubmarkets();

  const [isLoading, setIsLoading] = useState(isEdit);
  const [isSaving, setIsSaving] = useState(false);
  const [optionalOpen, setOptionalOpen] = useState(false);

  // Required fields
  const [address, setAddress] = useState('');
  const [sizeSf, setSizeSf] = useState('');
  const [netRatePsf, setNetRatePsf] = useState('');
  const [termMonths, setTermMonths] = useState('');
  const [commencementDate, setCommencementDate] = useState('');

  // Primary optional
  const [submarket, setSubmarket] = useState('');
  const [isTracked, setIsTracked] = useState(false);

  // Collapsible optional
  const [opCostsPsf, setOpCostsPsf] = useState('');
  const [fixturingMonths, setFixturingMonths] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [landlordName, setLandlordName] = useState('');

  // Bottom fields
  const [source, setSource] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!isEdit) {
      const raw = localStorage.getItem('lease-comp-prefill');
      if (raw) {
        try {
          const prefill = JSON.parse(raw);
          if (prefill.address) setAddress(prefill.address);
          if (prefill.size_sf) setSizeSf(String(prefill.size_sf));
          if (prefill.submarket) setSubmarket(prefill.submarket);
        } catch { /* ignore malformed */ }
        localStorage.removeItem('lease-comp-prefill');
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isEdit || !id) return;
    getLeaseComp(id).then((comp) => {
      if (!comp) { navigate('/lease-comps'); return; }
      setAddress(comp.address ?? '');
      setSizeSf(comp.size_sf != null ? String(comp.size_sf) : '');
      setNetRatePsf(comp.net_rate_psf != null ? String(comp.net_rate_psf) : '');
      setTermMonths(comp.term_months != null ? String(comp.term_months) : '');
      setCommencementDate(comp.commencement_date ?? '');
      setSubmarket(comp.submarket ?? '');
      setIsTracked(comp.is_tracked);
      setOpCostsPsf(comp.op_costs_psf != null ? String(comp.op_costs_psf) : '');
      setFixturingMonths(comp.fixturing_months != null ? String(comp.fixturing_months) : '');
      setTenantName(comp.tenant_name ?? '');
      setLandlordName(comp.landlord_name ?? '');
      setSource(comp.source ?? '');
      setNotes(comp.notes ?? '');
      if (comp.op_costs_psf || comp.fixturing_months || comp.tenant_name || comp.landlord_name) {
        setOptionalOpen(true);
      }
      setIsLoading(false);
    });
  }, [id, isEdit, getLeaseComp, navigate]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) return;

    setIsSaving(true);
    const input = {
      address: address.trim(),
      size_sf: sizeSf ? Number(sizeSf) : null,
      net_rate_psf: netRatePsf ? Number(netRatePsf) : null,
      term_months: termMonths ? Number(termMonths) : null,
      commencement_date: commencementDate || null,
      submarket: submarket.trim() || null,
      is_tracked: isTracked,
      op_costs_psf: opCostsPsf ? Number(opCostsPsf) : null,
      fixturing_months: fixturingMonths ? Number(fixturingMonths) : null,
      tenant_name: tenantName.trim() || null,
      landlord_name: landlordName.trim() || null,
      source: source.trim() || null,
      notes: notes.trim() || null,
    };

    let ok: boolean | object | null;
    if (isEdit && id) {
      ok = await updateLeaseComp(id, input);
    } else {
      ok = await createLeaseComp(input);
    }

    setIsSaving(false);
    if (ok) navigate('/lease-comps');
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 md:p-6 lg:p-8 max-w-2xl mx-auto">
        <button
          onClick={() => navigate('/lease-comps')}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Lease Comps
        </button>

        <form onSubmit={handleSave}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle>{isEdit ? 'Edit Lease Comp' : 'Add Lease Comp'}</CardTitle>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => navigate('/lease-comps')}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSaving || !address.trim()}>
                  {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Comp
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-5">
              {/* Address */}
              <div className="space-y-1.5">
                <Label htmlFor="address">Address <span className="text-destructive">*</span></Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Industrial Rd NE"
                  required
                />
              </div>

              {/* Size / Rate / Term */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="sizeSf">Size (SF) <span className="text-destructive">*</span></Label>
                  <Input
                    id="sizeSf"
                    type="number"
                    min={0}
                    value={sizeSf}
                    onChange={(e) => setSizeSf(e.target.value)}
                    placeholder="25000"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="netRatePsf">Net Rate (PSF) <span className="text-destructive">*</span></Label>
                  <Input
                    id="netRatePsf"
                    type="number"
                    min={0}
                    step="0.01"
                    value={netRatePsf}
                    onChange={(e) => setNetRatePsf(e.target.value)}
                    placeholder="12.50"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="termMonths">Term (months) <span className="text-destructive">*</span></Label>
                  <Input
                    id="termMonths"
                    type="number"
                    min={0}
                    value={termMonths}
                    onChange={(e) => setTermMonths(e.target.value)}
                    placeholder="60"
                  />
                </div>
              </div>

              {/* Commencement + Submarket */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="commencementDate">Commencement Date <span className="text-destructive">*</span></Label>
                  <Input
                    id="commencementDate"
                    type="date"
                    value={commencementDate}
                    onChange={(e) => setCommencementDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="submarket">Submarket</Label>
                  <Input
                    id="submarket"
                    list="submarket-list"
                    value={submarket}
                    onChange={(e) => setSubmarket(e.target.value)}
                    placeholder="e.g. Foothills"
                  />
                  <datalist id="submarket-list">
                    {submarkets.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Track expiry checkbox */}
              <div className="flex items-center gap-3">
                <Checkbox
                  id="isTracked"
                  checked={isTracked}
                  onCheckedChange={(v) => setIsTracked(!!v)}
                />
                <Label htmlFor="isTracked" className="cursor-pointer font-normal">
                  Track this lease expiry
                </Label>
              </div>

              {/* Optional details collapsible */}
              <div className="border border-border rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOptionalOpen((o) => !o)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
                >
                  Optional details
                  {optionalOpen
                    ? <ChevronDown className="h-4 w-4" />
                    : <ChevronRight className="h-4 w-4" />
                  }
                </button>
                <div className={cn('px-4 pb-4 space-y-4', optionalOpen ? 'block' : 'hidden')}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="opCostsPsf">Op Costs (PSF)</Label>
                      <Input
                        id="opCostsPsf"
                        type="number"
                        min={0}
                        step="0.01"
                        value={opCostsPsf}
                        onChange={(e) => setOpCostsPsf(e.target.value)}
                        placeholder="8.00"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="fixturingMonths">Fixturing Months</Label>
                      <Input
                        id="fixturingMonths"
                        type="number"
                        min={0}
                        value={fixturingMonths}
                        onChange={(e) => setFixturingMonths(e.target.value)}
                        placeholder="3"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="tenantName">Tenant Name</Label>
                    <Input
                      id="tenantName"
                      value={tenantName}
                      onChange={(e) => setTenantName(e.target.value)}
                      placeholder="Acme Logistics Inc."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="landlordName">Landlord Name</Label>
                    <Input
                      id="landlordName"
                      value={landlordName}
                      onChange={(e) => setLandlordName(e.target.value)}
                      placeholder="REIT Properties Ltd."
                    />
                  </div>
                </div>
              </div>

              {/* Source */}
              <div className="space-y-1.5">
                <Label htmlFor="source">Source</Label>
                <Input
                  id="source"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="e.g. Appraisal X, broker email, CoStar"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional context..."
                  rows={3}
                />
              </div>

              {/* Bottom save/cancel */}
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => navigate('/lease-comps')}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving || !address.trim()}>
                  {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Comp
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </AppLayout>
  );
}
