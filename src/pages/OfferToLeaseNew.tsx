import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { ChevronRight, FileText, Plus, Minus, BookOpen } from 'lucide-react';
import { useAgents } from '@/hooks/useAgents';
import { useBrokerages } from '@/hooks/useBrokerages';
import { useAuth } from '@/contexts/AuthContext';
import { useOrg } from '@/hooks/useOrg';
import { supabase } from '@/integrations/supabase/client';
import { ClauseLibrarySheet } from '@/components/documents/ClauseLibrarySheet';

// ── helpers ──────────────────────────────────────────────────────────────────

function parseAmount(str: string): number {
  return parseFloat((str || '0').replace(/[^0-9.]/g, '')) || 0;
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString('en-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 2 });
}

// ── form section card ─────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border rounded-lg p-5 space-y-4">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ── deposit summary ───────────────────────────────────────────────────────────

function DepositSummary({
  year1Rate,
  lastYearRate,
  sf,
  opCostPerFoot,
}: {
  year1Rate: string;
  lastYearRate: string;
  sf: string;
  opCostPerFoot: string;
}) {
  const size = parseAmount(sf);
  const GST = 0.05;

  const y1 = parseAmount(year1Rate);
  const yLast = parseAmount(lastYearRate);
  const opRate = parseAmount(opCostPerFoot);

  const firstMonthBasic = (y1 * size) / 12;
  const firstMonthBasicGST = firstMonthBasic * GST;
  const opRent = (opRate * size) / 12;
  const opGST = opRent * GST;
  const totalDueOnSigning = firstMonthBasic + firstMonthBasicGST + opRent + opGST;

  const lastMonthBasic = (yLast * size) / 12;
  const depositSubtotal = lastMonthBasic + opRent;
  const depositGST = depositSubtotal * GST;
  const securityDeposit = depositSubtotal + depositGST;
  const totalDeposit = securityDeposit + totalDueOnSigning;

  const row = (label: string, amount: number, bold = false) => (
    <div className={`flex justify-between text-sm ${bold ? 'font-semibold' : ''}`}>
      <span className={bold ? '' : 'text-muted-foreground'}>{label}</span>
      <span>{formatCurrency(amount)}</span>
    </div>
  );

  return (
    <div className="border rounded-lg p-4 space-y-2 bg-muted/30">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Deposit Summary (live)</p>
      {row('First Month Basic Rent', firstMonthBasic)}
      {row('GST on Basic Rent (5%)', firstMonthBasicGST)}
      {row('First Month Op Costs', opRent)}
      {row('GST on Op Costs (5%)', opGST)}
      <div className="border-t pt-2">{row('Total Due on Signing', totalDueOnSigning, true)}</div>
      {row('Security Deposit (last month + GST)', securityDeposit)}
      <div className="border-t pt-2">{row('TOTAL DEPOSIT', totalDeposit, true)}</div>
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function OfferToLeaseNew() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { org } = useOrg();
  const { data: agents = [] } = useAgents();
  const { data: brokerages = [] } = useBrokerages();

  const [submitting, setSubmitting] = useState(false);

  // Clause library sheet state
  const [clauseSheetOpen, setClauseSheetOpen] = useState(false);
  const [clauseTargetField, setClauseTargetField] = useState<'useOfPremises' | 'parkingComment'>('useOfPremises');

  // ── Landlord fields
  const [llBrokerageId, setLlBrokerageId] = useState('');
  const [llBrokerageName, setLlBrokerageName] = useState('');
  const [llBrokerageAddress, setLlBrokerageAddress] = useState('');
  const [llAgentId, setLlAgentId] = useState('');
  const [llAgentName, setLlAgentName] = useState('');
  const [llAgentPhone, setLlAgentPhone] = useState('');
  const [llAgentEmail, setLlAgentEmail] = useState('');
  const [llCorporateName, setLlCorporateName] = useState('');

  // ── Tenant fields
  const [tenantBrokerageId, setTenantBrokerageId] = useState('');
  const [tenantBrokerageName, setTenantBrokerageName] = useState('');
  const [tenantBrokerageAddress, setTenantBrokerageAddress] = useState('');
  const [tenantAgentId, setTenantAgentId] = useState('');
  const [tenantAgentName, setTenantAgentName] = useState('');
  const [tenantAgentPhone, setTenantAgentPhone] = useState('');
  const [tenantAgentEmail, setTenantAgentEmail] = useState('');
  const [tenantCorporateName, setTenantCorporateName] = useState('');

  // ── ClearView Agent fields
  const [cvAgentId, setCvAgentId] = useState('');
  const [cvAgentName, setCvAgentName] = useState('');
  const [cvAgentPhone, setCvAgentPhone] = useState('');
  const [cvAgentEmail, setCvAgentEmail] = useState('');

  // ── Agency
  const [agencyLLorTenant, setAgencyLLorTenant] = useState('Tenant');

  // ── Premises
  const [premisesAddress, setPremisesAddress] = useState('');
  const [premisesCity, setPremisesCity] = useState('Calgary');
  const [premisesSF, setPremisesSF] = useState('');

  // ── Term
  const [termLength, setTermLength] = useState('');
  const [commencementDate, setCommencementDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [earlyOccupancyDate, setEarlyOccupancyDate] = useState('');
  const [earlyOccType, setEarlyOccType] = useState('non-exclusive');

  // ── Basic Rent rows (year index 0–9)
  const [rentRows, setRentRows] = useState<string[]>(['']);
  const [basicRentStartMonth, setBasicRentStartMonth] = useState('');
  const [basicRentStartYear, setBasicRentStartYear] = useState('');

  // ── Additional Rent
  const [additionalRentBudgetYear, setAdditionalRentBudgetYear] = useState('');
  const [additionalRentCostPerFoot, setAdditionalRentCostPerFoot] = useState('');

  // ── Free Rent
  const [freeBasicRent, setFreeBasicRent] = useState('No');
  const [numMonthsFree, setNumMonthsFree] = useState('');

  // ── Use & Permitting
  const [useOfPremises, setUseOfPremises] = useState('');
  const [municipalityForPermitting, setMunicipalityForPermitting] = useState('City of Calgary');

  // ── Deposit
  const [depositBrokerage, setDepositBrokerage] = useState('');
  const [depositSection, setDepositSection] = useState('Section 12');

  // ── Option to Renew
  const [optionToRenew, setOptionToRenew] = useState('No');
  const [optionToRenewLength, setOptionToRenewLength] = useState('');

  // ── Parking
  const [parkingComment, setParkingComment] = useState('');

  // ── Conditions
  const [tenantConditionTimeline, setTenantConditionTimeline] = useState('');
  const [landlordConditionTimeline, setLandlordConditionTimeline] = useState('');

  // ── Offer Date & Acceptance
  const [offerMonth, setOfferMonth] = useState('');
  const [offerYear, setOfferYear] = useState('');
  const [acceptanceDeadline, setAcceptanceDeadline] = useState('');
  const [acceptanceForWho, setAcceptanceForWho] = useState('Landlord');

  // ── Derived: agents filtered by brokerage
  const llAgents = useMemo(
    () => (llBrokerageId ? agents.filter((a) => a.brokerage_id === llBrokerageId) : agents),
    [agents, llBrokerageId]
  );
  const tenantAgents = useMemo(
    () => (tenantBrokerageId ? agents.filter((a) => a.brokerage_id === tenantBrokerageId) : agents),
    [agents, tenantBrokerageId]
  );

  // ── Derived: last non-empty rent year rate
  const lastYearRate = useMemo(() => {
    for (let i = rentRows.length - 1; i >= 0; i--) {
      if (rentRows[i] && rentRows[i].trim() !== '') return rentRows[i];
    }
    return '';
  }, [rentRows]);

  // ── Computed: estimated monthly additional rent
  const estimatedMonthlyAdditional = useMemo(() => {
    const sf = parseAmount(premisesSF);
    const rate = parseAmount(additionalRentCostPerFoot);
    if (!sf || !rate) return null;
    return (rate * sf) / 12;
  }, [premisesSF, additionalRentCostPerFoot]);

  // ── Rent row helpers
  function addRentRow() {
    if (rentRows.length >= 10) return;
    setRentRows((prev) => [...prev, '']);
  }
  function removeRentRow() {
    if (rentRows.length <= 1) return;
    setRentRows((prev) => prev.slice(0, -1));
  }
  function updateRentRow(index: number, value: string) {
    setRentRows((prev) => prev.map((r, i) => (i === index ? value : r)));
  }

  // ── Auto-fill handlers
  function handleLlBrokerageSelect(id: string) {
    setLlBrokerageId(id);
    setLlAgentId('');
    setLlAgentName('');
    setLlAgentPhone('');
    setLlAgentEmail('');
    const b = brokerages.find((b) => b.id === id);
    if (b) {
      setLlBrokerageName(b.name);
      setLlBrokerageAddress(b.address ?? '');
    }
  }

  function handleLlAgentSelect(id: string) {
    setLlAgentId(id);
    const a = agents.find((a) => a.id === id);
    if (a) {
      setLlAgentName(a.name);
      setLlAgentPhone(a.phone ?? '');
      setLlAgentEmail(a.email ?? '');
    }
  }

  function handleTenantBrokerageSelect(id: string) {
    setTenantBrokerageId(id);
    setTenantAgentId('');
    setTenantAgentName('');
    setTenantAgentPhone('');
    setTenantAgentEmail('');
    const b = brokerages.find((b) => b.id === id);
    if (b) {
      setTenantBrokerageName(b.name);
      setTenantBrokerageAddress(b.address ?? '');
    }
  }

  function handleTenantAgentSelect(id: string) {
    setTenantAgentId(id);
    const a = agents.find((a) => a.id === id);
    if (a) {
      setTenantAgentName(a.name);
      setTenantAgentPhone(a.phone ?? '');
      setTenantAgentEmail(a.email ?? '');
    }
  }

  function handleCvAgentSelect(id: string) {
    setCvAgentId(id);
    const a = agents.find((a) => a.id === id);
    if (a) {
      setCvAgentName(a.name);
      setCvAgentPhone(a.phone ?? '');
      setCvAgentEmail(a.email ?? '');
    }
  }

  // ── Clause library insert
  function openClauseSheet(field: typeof clauseTargetField) {
    setClauseTargetField(field);
    setClauseSheetOpen(true);
  }

  function handleClauseInsert(content: string) {
    if (clauseTargetField === 'useOfPremises') setUseOfPremises(content);
    if (clauseTargetField === 'parkingComment') setParkingComment(content);
  }

  // ── Submit
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.id || !org?.id) return;
    setSubmitting(true);

    const rentFields: Record<string, string> = {};
    const yearNames = ['year1BasicRent','year2BasicRent','year3BasicRent','year4BasicRent',
      'year5BasicRent','year6BasicRent','year7BasicRent','year8BasicRent','year9BasicRent','year10BasicRent'];
    rentRows.forEach((val, i) => { rentFields[yearNames[i]] = val; });
    // fill remaining with empty
    for (let i = rentRows.length; i < 10; i++) { rentFields[yearNames[i]] = ''; }

    const payload = {
      llCorporateName,
      llBrokerageName,
      llAgentName,
      llAgentPhone,
      llAgentEmail,
      llBrokerageAddress,
      tenantCorporateName,
      tenantBrokerageName,
      tenantAgentName,
      tenantAgentPhone,
      tenantAgentEmail,
      tenantBrokerageAddress,
      cvAgentName,
      cvAgentPhone,
      cvAgentEmail,
      agencyLLorTenant,
      premisesAddress,
      premisesCity,
      premisesSF,
      termLength,
      commencementDate,
      expiryDate,
      earlyOccupancyDate,
      earlyOccType,
      ...rentFields,
      basicRentStartMonth,
      basicRentStartYear,
      additionalRentBudgetYear,
      additionalRentCostPerFoot,
      freeBasicRent,
      numMonthsFree,
      useOfPremises,
      municipalityForPermitting,
      depositBrokerage,
      depositSection,
      optionToRenewLength: optionToRenew === 'Yes' ? optionToRenewLength : '',
      parkingComment,
      tenantConditionTimeline,
      landlordConditionTimeline,
      offerMonth,
      offerYear,
      acceptanceDeadline,
      acceptanceForWho,
      orgId: org.id,
      userId: user.id,
    };

    try {
      const { data, error } = await supabase.functions.invoke('generate-offer-to-lease', {
        body: payload,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Offer to Lease generated successfully');

      // Trigger download
      if (data?.docxUrl) {
        const a = document.createElement('a');
        a.href = data.docxUrl;
        a.download = `OTL_${tenantCorporateName || 'offer'}.docx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      navigate('/documents');
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Failed to generate document');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-5">
          <button onClick={() => navigate('/documents')} className="hover:text-foreground transition-colors">
            Documents
          </button>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground font-medium">New Offer to Lease</span>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">New Offer to Lease</h1>
          </div>
          <Button form="otl-form" type="submit" disabled={submitting}>
            {submitting ? 'Generating…' : 'Generate Document'}
          </Button>
        </div>

        <form id="otl-form" onSubmit={handleSubmit} className="space-y-5">

          {/* ── Section 1: LANDLORD ── */}
          <Section title="Landlord">
            <Field label="LL Corporate Name">
              <Input value={llCorporateName} onChange={(e) => setLlCorporateName(e.target.value)} placeholder="e.g. Skyline Industrial Corp." />
            </Field>
            <Field label="LL Brokerage">
              <Select value={llBrokerageId} onValueChange={handleLlBrokerageSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select brokerage…" />
                </SelectTrigger>
                <SelectContent>
                  {brokerages.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="LL Brokerage Name">
              <Input value={llBrokerageName} onChange={(e) => setLlBrokerageName(e.target.value)} placeholder="Auto-filled from brokerage" />
            </Field>
            <Field label="LL Brokerage Address">
              <Input value={llBrokerageAddress} onChange={(e) => setLlBrokerageAddress(e.target.value)} placeholder="Auto-filled from brokerage" />
            </Field>
            <Field label="LL Agent">
              <Select value={llAgentId} onValueChange={handleLlAgentSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select agent…" />
                </SelectTrigger>
                <SelectContent>
                  {llAgents.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="LL Agent Name">
              <Input value={llAgentName} onChange={(e) => setLlAgentName(e.target.value)} placeholder="Auto-filled from agent" />
            </Field>
            <Field label="LL Agent Phone">
              <Input value={llAgentPhone} onChange={(e) => setLlAgentPhone(e.target.value)} placeholder="Auto-filled from agent" />
            </Field>
            <Field label="LL Agent Email">
              <Input value={llAgentEmail} onChange={(e) => setLlAgentEmail(e.target.value)} placeholder="Auto-filled from agent" />
            </Field>
          </Section>

          {/* ── Section 2: TENANT ── */}
          <Section title="Tenant">
            <Field label="Tenant Corporate Name">
              <Input value={tenantCorporateName} onChange={(e) => setTenantCorporateName(e.target.value)} placeholder="e.g. Acme Logistics Inc." />
            </Field>
            <Field label="Tenant Brokerage">
              <Select value={tenantBrokerageId} onValueChange={handleTenantBrokerageSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select brokerage…" />
                </SelectTrigger>
                <SelectContent>
                  {brokerages.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Tenant Brokerage Name">
              <Input value={tenantBrokerageName} onChange={(e) => setTenantBrokerageName(e.target.value)} placeholder="Auto-filled from brokerage" />
            </Field>
            <Field label="Tenant Brokerage Address">
              <Input value={tenantBrokerageAddress} onChange={(e) => setTenantBrokerageAddress(e.target.value)} placeholder="Auto-filled from brokerage" />
            </Field>
            <Field label="Tenant Agent">
              <Select value={tenantAgentId} onValueChange={handleTenantAgentSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select agent…" />
                </SelectTrigger>
                <SelectContent>
                  {tenantAgents.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Tenant Agent Name">
              <Input value={tenantAgentName} onChange={(e) => setTenantAgentName(e.target.value)} placeholder="Auto-filled from agent" />
            </Field>
            <Field label="Tenant Agent Phone">
              <Input value={tenantAgentPhone} onChange={(e) => setTenantAgentPhone(e.target.value)} placeholder="Auto-filled from agent" />
            </Field>
            <Field label="Tenant Agent Email">
              <Input value={tenantAgentEmail} onChange={(e) => setTenantAgentEmail(e.target.value)} placeholder="Auto-filled from agent" />
            </Field>
          </Section>

          {/* ── Section 3: CLEARVIEW AGENT ── */}
          <Section title="ClearView Agent">
            <Field label="CV Agent">
              <Select value={cvAgentId} onValueChange={handleCvAgentSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select agent…" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="CV Agent Name">
              <Input value={cvAgentName} onChange={(e) => setCvAgentName(e.target.value)} placeholder="Auto-filled from agent" />
            </Field>
            <Field label="CV Agent Phone">
              <Input value={cvAgentPhone} onChange={(e) => setCvAgentPhone(e.target.value)} placeholder="Auto-filled from agent" />
            </Field>
            <Field label="CV Agent Email">
              <Input value={cvAgentEmail} onChange={(e) => setCvAgentEmail(e.target.value)} placeholder="Auto-filled from agent" />
            </Field>
          </Section>

          {/* ── Section 4: AGENCY ── */}
          <Section title="Agency">
            <Field label="ClearView Represents">
              <Select value={agencyLLorTenant} onValueChange={setAgencyLLorTenant}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tenant">Tenant</SelectItem>
                  <SelectItem value="Landlord">Landlord</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </Section>

          {/* ── Section 5: PREMISES ── */}
          <Section title="Premises">
            <Field label="Premises Address">
              <Input value={premisesAddress} onChange={(e) => setPremisesAddress(e.target.value)} placeholder="e.g. 4800 104 Avenue SE" required />
            </Field>
            <Field label="Premises City">
              <Input value={premisesCity} onChange={(e) => setPremisesCity(e.target.value)} />
            </Field>
            <Field label="Premises SF">
              <Input value={premisesSF} onChange={(e) => setPremisesSF(e.target.value)} placeholder="e.g. 9,108" />
            </Field>
          </Section>

          {/* ── Section 6: TERM ── */}
          <Section title="Term">
            <Field label="Term Length">
              <Input value={termLength} onChange={(e) => setTermLength(e.target.value)} placeholder="e.g. Five (5) Year" />
            </Field>
            <Field label="Commencement Date">
              <Input value={commencementDate} onChange={(e) => setCommencementDate(e.target.value)} placeholder="e.g. September 1, 2026" />
            </Field>
            <Field label="Expiry Date">
              <Input value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} placeholder="e.g. August 31, 2031" />
            </Field>
            <Field label="Early Occupancy Date" hint="Leave blank if no early occupancy date">
              <Input value={earlyOccupancyDate} onChange={(e) => setEarlyOccupancyDate(e.target.value)} placeholder="e.g. August 1, 2026" />
            </Field>
            <Field label="Early Occupancy Type">
              <Select value={earlyOccType} onValueChange={setEarlyOccType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="exclusive">Exclusive</SelectItem>
                  <SelectItem value="non-exclusive">Non-Exclusive</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </Section>

          {/* ── Section 7: BASIC RENT ── */}
          <Section title="Basic Rent">
            <div className="space-y-2">
              {rentRows.map((val, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground w-14 flex-shrink-0">Year {i + 1}</span>
                  <Input
                    value={val}
                    onChange={(e) => updateRentRow(i, e.target.value)}
                    placeholder="$/sf/year"
                    className="flex-1"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" onClick={addRentRow} disabled={rentRows.length >= 10}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Year
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={removeRentRow} disabled={rentRows.length <= 1}>
                <Minus className="h-3.5 w-3.5 mr-1" />
                Remove
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <Field label="Basic Rent Start Month">
                <Input value={basicRentStartMonth} onChange={(e) => setBasicRentStartMonth(e.target.value)} placeholder="e.g. September" />
              </Field>
              <Field label="Basic Rent Start Year">
                <Input value={basicRentStartYear} onChange={(e) => setBasicRentStartYear(e.target.value)} placeholder="e.g. 2026" />
              </Field>
            </div>
          </Section>

          {/* ── Section 8: ADDITIONAL RENT ── */}
          <Section title="Additional Rent">
            <Field label="Budget Year">
              <Input value={additionalRentBudgetYear} onChange={(e) => setAdditionalRentBudgetYear(e.target.value)} placeholder="e.g. 2026" />
            </Field>
            <Field label="Cost Per Foot ($/sf/year)">
              <Input value={additionalRentCostPerFoot} onChange={(e) => setAdditionalRentCostPerFoot(e.target.value)} placeholder="e.g. 8.50" />
            </Field>
            {estimatedMonthlyAdditional !== null && (
              <div className="flex justify-between text-sm border rounded p-3 bg-muted/30">
                <span className="text-muted-foreground">Estimated Monthly Total</span>
                <span className="font-medium">{formatCurrency(estimatedMonthlyAdditional)}</span>
              </div>
            )}
          </Section>

          {/* ── Section 9: FREE RENT ── */}
          <Section title="Free Rent">
            <Field label="Free Basic Rent">
              <Select value={freeBasicRent} onValueChange={setFreeBasicRent}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="No">No</SelectItem>
                  <SelectItem value="Yes">Yes</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {freeBasicRent === 'Yes' && (
              <Field label="Number of Months Free">
                <Input value={numMonthsFree} onChange={(e) => setNumMonthsFree(e.target.value)} placeholder="e.g. 3" />
              </Field>
            )}
          </Section>

          {/* ── Section 10: USE & PERMITTING ── */}
          <Section title="Use &amp; Permitting">
            <Field label="Use of Premises">
              <div className="space-y-1.5">
                <Textarea
                  value={useOfPremises}
                  onChange={(e) => setUseOfPremises(e.target.value)}
                  rows={5}
                  placeholder="Describe the permitted use of the premises…"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => openClauseSheet('useOfPremises')}
                >
                  <BookOpen className="h-3.5 w-3.5 mr-1.5" />
                  Clause Library
                </Button>
              </div>
            </Field>
            <Field label="Municipality for Permitting">
              <Input value={municipalityForPermitting} onChange={(e) => setMunicipalityForPermitting(e.target.value)} />
            </Field>
          </Section>

          {/* ── Section 11: DEPOSIT ── */}
          <Section title="Deposit">
            <Field label="Deposit Payable To">
              <Input value={depositBrokerage} onChange={(e) => setDepositBrokerage(e.target.value)} placeholder="e.g. ClearView Commercial Realty Inc." />
            </Field>
            <Field label="Deposit Section Reference">
              <Input value={depositSection} onChange={(e) => setDepositSection(e.target.value)} />
            </Field>
            <DepositSummary
              year1Rate={rentRows[0] ?? ''}
              lastYearRate={lastYearRate}
              sf={premisesSF}
              opCostPerFoot={additionalRentCostPerFoot}
            />
          </Section>

          {/* ── Section 12: OPTION TO RENEW ── */}
          <Section title="Option to Renew">
            <Field label="Option to Renew">
              <Select value={optionToRenew} onValueChange={setOptionToRenew}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="No">No</SelectItem>
                  <SelectItem value="Yes">Yes</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            {optionToRenew === 'Yes' && (
              <Field label="Option Length">
                <Input value={optionToRenewLength} onChange={(e) => setOptionToRenewLength(e.target.value)} placeholder="e.g. Five (5) Year" />
              </Field>
            )}
          </Section>

          {/* ── Section 13: PARKING ── */}
          <Section title="Parking">
            <Field label="Parking Comment">
              <div className="space-y-1.5">
                <Textarea
                  value={parkingComment}
                  onChange={(e) => setParkingComment(e.target.value)}
                  rows={3}
                  placeholder="Parking terms and conditions…"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => openClauseSheet('parkingComment')}
                >
                  <BookOpen className="h-3.5 w-3.5 mr-1.5" />
                  Clause Library
                </Button>
              </div>
            </Field>
          </Section>

          {/* ── Section 14: CONDITIONS ── */}
          <Section title="Conditions">
            <Field label="Tenant Condition Timeline">
              <Input value={tenantConditionTimeline} onChange={(e) => setTenantConditionTimeline(e.target.value)} placeholder="e.g. Ten (10) Business Days" />
            </Field>
            <Field label="Landlord Condition Timeline">
              <Input value={landlordConditionTimeline} onChange={(e) => setLandlordConditionTimeline(e.target.value)} placeholder="e.g. Ten (10) Business Days" />
            </Field>
          </Section>

          {/* ── Section 15: OFFER DATE & ACCEPTANCE ── */}
          <Section title="Offer Date &amp; Acceptance">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Offer Month">
                <Input value={offerMonth} onChange={(e) => setOfferMonth(e.target.value)} placeholder="e.g. May" />
              </Field>
              <Field label="Offer Year">
                <Input value={offerYear} onChange={(e) => setOfferYear(e.target.value)} placeholder="e.g. 2026" />
              </Field>
            </div>
            <Field label="Acceptance Deadline">
              <Input value={acceptanceDeadline} onChange={(e) => setAcceptanceDeadline(e.target.value)} placeholder="e.g. May 15, 2026" />
            </Field>
            <Field label="Acceptance Party">
              <Input value={acceptanceForWho} onChange={(e) => setAcceptanceForWho(e.target.value)} />
            </Field>
          </Section>

          {/* Bottom submit */}
          <div className="flex justify-end pb-8">
            <Button type="submit" disabled={submitting} size="lg">
              {submitting ? 'Generating…' : 'Generate Document'}
            </Button>
          </div>

        </form>
      </div>

      <ClauseLibrarySheet
        open={clauseSheetOpen}
        onOpenChange={setClauseSheetOpen}
        documentType="offer_to_lease"
        onInsert={handleClauseInsert}
      />
    </AppLayout>
  );
}
