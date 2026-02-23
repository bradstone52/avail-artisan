import { useState, useEffect, useMemo, useRef } from 'react';
import { differenceInMonths } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { FormattedNumberInput } from '@/components/common/FormattedNumberInput';
import { Switch } from '@/components/ui/switch';
import { ListingCombobox } from '@/components/deals/ListingCombobox';
import { useCreateDeal, useUpdateDeal } from '@/hooks/useDeals';
import { useAgents } from '@/hooks/useAgents';
import { useBrokerages } from '@/hooks/useBrokerages';
import { MarketListing } from '@/hooks/useMarketListings';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Deal, DealFormData, DealType, DealStatus } from '@/types/database';

interface DealFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal?: Deal | null;
}

interface ExtendedDealFormData {
  deal_number?: string;
  deal_type: DealType;
  address: string;
  city: string;
  submarket: string;
  size_sf?: number;
  is_land_deal?: boolean;
  lease_rate_psf?: number;
  lease_term_months?: number;
  commencement_date?: string;
  expiry_date?: string;
  deal_value?: number;
  commission_percent?: number;
  close_date?: string;
  effective_date?: string;
  status: string;
  listing_id?: string;
  property_id?: string;
  notes?: string;
  // Party fields
  seller_name?: string;
  buyer_name?: string;
  seller_brokerage_id?: string;
  buyer_brokerage_id?: string;
  // Lawyer fields
  seller_lawyer_name?: string;
  seller_lawyer_firm?: string;
  seller_lawyer_phone?: string;
  seller_lawyer_email?: string;
  buyer_lawyer_name?: string;
  buyer_lawyer_firm?: string;
  buyer_lawyer_phone?: string;
  buyer_lawyer_email?: string;
  // Nomenclature toggle
  use_purchaser_vendor?: boolean;
  // Agent fields
  listing_brokerage_id?: string;
  listing_agent1_id?: string;
  listing_agent2_id?: string;
  selling_brokerage_id?: string;
  selling_agent1_id?: string;
  selling_agent2_id?: string;
  cv_agent_id?: string;
  // Financial fields
  other_brokerage_percent?: number;
  clearview_percent?: number;
  gst_rate?: number;
}

const dealTypes: DealType[] = ['Lease', 'Sale', 'Sublease', 'Renewal', 'Expansion'];
const createDealStatuses = ['Conditional', 'Firm', 'Closed'];

const EMPTY_FORM: ExtendedDealFormData = {
  deal_number: '',
  deal_type: 'Lease',
  address: '',
  city: '',
  submarket: '',
  size_sf: undefined,
  is_land_deal: false,
  lease_rate_psf: undefined,
  lease_term_months: undefined,
  commencement_date: '',
  expiry_date: '',
  deal_value: undefined,
  commission_percent: 3,
  close_date: '',
  effective_date: '',
  status: 'Conditional',
  listing_id: undefined,
  notes: '',
  seller_name: '',
  buyer_name: '',
  seller_brokerage_id: undefined,
  buyer_brokerage_id: undefined,
  seller_lawyer_name: '',
  seller_lawyer_firm: '',
  seller_lawyer_phone: '',
  seller_lawyer_email: '',
  buyer_lawyer_name: '',
  buyer_lawyer_firm: '',
  buyer_lawyer_phone: '',
  buyer_lawyer_email: '',
  use_purchaser_vendor: false,
  listing_brokerage_id: undefined,
  listing_agent1_id: undefined,
  listing_agent2_id: undefined,
  selling_brokerage_id: undefined,
  selling_agent1_id: undefined,
  selling_agent2_id: undefined,
  cv_agent_id: undefined,
  other_brokerage_percent: 1.5,
  clearview_percent: 1.5,
  gst_rate: 5,
};

export function DealFormDialog({ open, onOpenChange, deal }: DealFormDialogProps) {
  const createDeal = useCreateDeal();
  const updateDeal = useUpdateDeal();
  const { data: agents } = useAgents();
  const { data: brokerages } = useBrokerages();
  const isEditing = !!deal;

  const [formData, setFormData] = useState<ExtendedDealFormData>({ ...EMPTY_FORM });
  const [sizeUnit, setSizeUnit] = useState<'SF' | 'AC'>('SF');
  const [selectedListing, setSelectedListing] = useState<MarketListing | null>(null);

  // Collapsible section states
  const [partiesOpen, setPartiesOpen] = useState(false);
  const [agentsOpen, setAgentsOpen] = useState(false);
  const [financialOpen, setFinancialOpen] = useState(false);
  const [lawyersOpen, setLawyersOpen] = useState(false);

  // Calculate commission amount
  const calculatedCommission = formData.deal_value && formData.commission_percent
    ? (formData.deal_value * formData.commission_percent) / 100
    : 0;

  useEffect(() => {
    if (deal) {
      const isLand = !!(deal as any).is_land_deal;
      setFormData({
        deal_number: deal.deal_number || '',
        deal_type: deal.deal_type as DealType,
        address: deal.address,
        city: deal.city,
        submarket: deal.submarket,
        size_sf: deal.size_sf ?? undefined,
        is_land_deal: isLand,
        lease_rate_psf: (deal as any).lease_rate_psf ?? undefined,
        lease_term_months: (deal as any).lease_term_months ?? undefined,
        commencement_date: (deal as any).commencement_date || '',
        expiry_date: (deal as any).expiry_date || '',
        deal_value: deal.deal_value ?? undefined,
        commission_percent: deal.commission_percent ?? 3,
        close_date: deal.close_date || '',
        effective_date: (deal as any).effective_date || '',
        status: deal.status as DealStatus,
        listing_id: deal.listing_id ?? undefined,
        notes: deal.notes || '',
        seller_name: deal.seller_name || '',
        buyer_name: deal.buyer_name || '',
        seller_brokerage_id: deal.seller_brokerage_id ?? undefined,
        buyer_brokerage_id: deal.buyer_brokerage_id ?? undefined,
        seller_lawyer_name: (deal as any).seller_lawyer_name || '',
        seller_lawyer_firm: (deal as any).seller_lawyer_firm || '',
        seller_lawyer_phone: (deal as any).seller_lawyer_phone || '',
        seller_lawyer_email: (deal as any).seller_lawyer_email || '',
        buyer_lawyer_name: (deal as any).buyer_lawyer_name || '',
        buyer_lawyer_firm: (deal as any).buyer_lawyer_firm || '',
        buyer_lawyer_phone: (deal as any).buyer_lawyer_phone || '',
        buyer_lawyer_email: (deal as any).buyer_lawyer_email || '',
        use_purchaser_vendor: (deal as any).use_purchaser_vendor || false,
        listing_brokerage_id: deal.listing_brokerage_id ?? undefined,
        listing_agent1_id: deal.listing_agent1_id ?? undefined,
        listing_agent2_id: deal.listing_agent2_id ?? undefined,
        selling_brokerage_id: deal.selling_brokerage_id ?? undefined,
        selling_agent1_id: deal.selling_agent1_id ?? undefined,
        selling_agent2_id: deal.selling_agent2_id ?? undefined,
        cv_agent_id: deal.cv_agent_id ?? undefined,
        other_brokerage_percent: deal.other_brokerage_percent ?? 1.5,
        clearview_percent: deal.clearview_percent ?? 1.5,
        gst_rate: deal.gst_rate ?? 5,
      });
      setSizeUnit(isLand ? 'AC' : 'SF');
      // Auto-open sections that have data
      setPartiesOpen(!!(deal.seller_name || deal.buyer_name));
      setAgentsOpen(!!(deal.listing_brokerage_id || deal.selling_brokerage_id || deal.cv_agent_id));
      setFinancialOpen(!!(deal.other_brokerage_percent || deal.clearview_percent));
      setLawyersOpen(!!((deal as any).seller_lawyer_name || (deal as any).buyer_lawyer_name));
      setSelectedListing(null);
    } else {
      setFormData({ ...EMPTY_FORM });
      setSizeUnit('SF');
      setPartiesOpen(false);
      setAgentsOpen(false);
      setFinancialOpen(false);
      setLawyersOpen(false);
      setSelectedListing(null);
    }
  }, [deal, open]);

  const handleListingChange = (listing: MarketListing | null) => {
    setSelectedListing(listing);
    if (listing) {
      let dealType: DealType = 'Lease';
      if (listing.listing_type === 'Sale') dealType = 'Sale';
      else if (listing.listing_type === 'Sublease') dealType = 'Sublease';

      let size: number | undefined = undefined;
      let unit: 'SF' | 'AC' = 'SF';

      if (listing.size_sf && listing.size_sf > 0) {
        size = listing.size_sf;
        unit = 'SF';
      } else if (listing.land_acres) {
        const acres = parseFloat(listing.land_acres);
        if (!isNaN(acres) && acres > 0) {
          size = acres;
          unit = 'AC';
        }
      }

      setSizeUnit(unit);
      setFormData(prev => ({
        ...prev,
        listing_id: listing.id,
        address: listing.address,
        city: listing.city,
        submarket: listing.submarket,
        deal_type: dealType,
        size_sf: size,
      }));
    } else {
      setSizeUnit('SF');
      setFormData(prev => ({
        ...prev,
        listing_id: undefined,
        address: '',
        city: '',
        submarket: '',
        size_sf: undefined,
      }));
    }
  };

  // Agent helpers
  const getAgentsForBrokerage = (brokerageId: string | undefined, excludeId?: string) => {
    if (!brokerageId || !agents) return [];
    return agents.filter(a => a.brokerage_id === brokerageId && (!excludeId || a.id !== excludeId));
  };

  const listingAgents1 = useMemo(() => getAgentsForBrokerage(formData.listing_brokerage_id), [formData.listing_brokerage_id, agents]);
  const listingAgents2 = useMemo(() => getAgentsForBrokerage(formData.listing_brokerage_id, formData.listing_agent1_id), [formData.listing_brokerage_id, formData.listing_agent1_id, agents]);
  const sellingAgents1 = useMemo(() => getAgentsForBrokerage(formData.selling_brokerage_id), [formData.selling_brokerage_id, agents]);
  const sellingAgents2 = useMemo(() => getAgentsForBrokerage(formData.selling_brokerage_id, formData.selling_agent1_id), [formData.selling_brokerage_id, formData.selling_agent1_id, agents]);

  const cvAgents = useMemo(() => {
    return agents?.filter(a => {
      const brokerage = brokerages?.find(b => b.id === a.brokerage_id);
      return brokerage?.name?.toLowerCase().includes('clearview');
    }) || [];
  }, [agents, brokerages]);

  // Clear agent selections when brokerage changes
  useEffect(() => {
    if (formData.listing_agent1_id && formData.listing_agent2_id === formData.listing_agent1_id) {
      setFormData(prev => ({ ...prev, listing_agent2_id: undefined }));
    }
  }, [formData.listing_agent1_id]);

  useEffect(() => {
    if (formData.selling_agent1_id && formData.selling_agent2_id === formData.selling_agent1_id) {
      setFormData(prev => ({ ...prev, selling_agent2_id: undefined }));
    }
  }, [formData.selling_agent1_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { size_sf, is_land_deal, ...dealData } = formData;
      const parsedSize = size_sf != null 
        ? (is_land_deal ? parseFloat(Number(size_sf).toFixed(2)) : Math.round(size_sf))
        : undefined;
      const submitData = {
        ...dealData,
        size_sf: parsedSize,
        is_land_deal: is_land_deal || false,
        // Normalize empty strings to null for optional fields
        seller_name: dealData.seller_name || null,
        buyer_name: dealData.buyer_name || null,
        seller_brokerage_id: dealData.seller_brokerage_id || null,
        buyer_brokerage_id: dealData.buyer_brokerage_id || null,
        seller_lawyer_name: dealData.seller_lawyer_name || null,
        seller_lawyer_firm: dealData.seller_lawyer_firm || null,
        seller_lawyer_phone: dealData.seller_lawyer_phone || null,
        seller_lawyer_email: dealData.seller_lawyer_email || null,
        buyer_lawyer_name: dealData.buyer_lawyer_name || null,
        buyer_lawyer_firm: dealData.buyer_lawyer_firm || null,
        buyer_lawyer_phone: dealData.buyer_lawyer_phone || null,
        buyer_lawyer_email: dealData.buyer_lawyer_email || null,
        use_purchaser_vendor: dealData.use_purchaser_vendor || false,
        listing_brokerage_id: dealData.listing_brokerage_id || null,
        listing_agent1_id: dealData.listing_agent1_id || null,
        listing_agent2_id: dealData.listing_agent2_id || null,
        selling_brokerage_id: dealData.selling_brokerage_id || null,
        selling_agent1_id: dealData.selling_agent1_id || null,
        selling_agent2_id: dealData.selling_agent2_id || null,
        cv_agent_id: dealData.cv_agent_id || null,
        effective_date: dealData.effective_date || null,
        lease_rate_psf: dealData.lease_rate_psf ?? null,
        lease_term_months: dealData.lease_term_months ?? null,
        commencement_date: dealData.commencement_date || null,
        expiry_date: dealData.expiry_date || null,
        other_brokerage_percent: dealData.other_brokerage_percent ?? null,
        clearview_percent: dealData.clearview_percent ?? null,
        gst_rate: dealData.gst_rate ?? null,
      } as DealFormData & { size_sf?: number };

      if (isEditing && deal) {
        await updateDeal.mutateAsync({ id: deal.id, ...submitData });
      } else {
        await createDeal.mutateAsync(submitData);
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const isSubmitting = createDeal.isPending || updateDeal.isPending;
  const hasLinkedListing = !!selectedListing || (isEditing && !!deal?.listing_id);

  const update = (fields: Partial<ExtendedDealFormData>) => setFormData(prev => ({ ...prev, ...fields }));

  const isLeaseDeal = ['Lease', 'Sublease', 'Renewal', 'Expansion'].includes(formData.deal_type);

  // Auto-calculate lease term from commencement & expiry dates
  const leaseTermManuallyEdited = useRef(false);
  
  useEffect(() => {
    // Reset manual flag when dialog opens
    leaseTermManuallyEdited.current = false;
  }, [open]);

  useEffect(() => {
    if (leaseTermManuallyEdited.current) return;
    if (!isLeaseDeal) return;
    const start = formData.commencement_date;
    const end = formData.expiry_date;
    if (start && end) {
      // Add 1 day to expiry to handle lease convention (e.g. May 1 – Apr 30 = 120 months)
      const endDate = new Date(end);
      endDate.setDate(endDate.getDate() + 1);
      const months = differenceInMonths(endDate, new Date(start));
      if (months > 0) {
        setFormData(prev => ({ ...prev, lease_term_months: months }));
      }
    }
  }, [formData.commencement_date, formData.expiry_date, isLeaseDeal]);
  const sellerLabel = isLeaseDeal ? 'Landlord' : (formData.use_purchaser_vendor ? 'Vendor' : 'Seller');
  const buyerLabel = isLeaseDeal ? 'Tenant' : (formData.use_purchaser_vendor ? 'Purchaser' : 'Buyer');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Deal' : 'New Deal'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update deal details below.' : 'Create a new deal by filling out the form below.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Listing Selector */}
          <div className="space-y-2">
            <Label>Listing</Label>
            <ListingCombobox
              value={formData.listing_id || null}
              onChange={handleListingChange}
            />
            <p className="text-xs text-muted-foreground">
              Select a listing to auto-fill address details
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="deal_number">Deal Number</Label>
              <Input
                id="deal_number"
                value={formData.deal_number}
                onChange={(e) => update({ deal_number: e.target.value })}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deal_type">Deal Type</Label>
              <Select
                value={formData.deal_type}
                onValueChange={(value) => update({ deal_type: value as DealType })}
                disabled={hasLinkedListing}
              >
                <SelectTrigger className={hasLinkedListing ? 'bg-muted' : ''}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dealTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address *</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => update({ address: e.target.value })}
              required
              disabled={hasLinkedListing}
              className={hasLinkedListing ? 'bg-muted' : ''}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => update({ city: e.target.value })}
                disabled={hasLinkedListing}
                className={hasLinkedListing ? 'bg-muted' : ''}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="submarket">Submarket</Label>
              <Input
                id="submarket"
                value={formData.submarket}
                onChange={(e) => update({ submarket: e.target.value })}
                disabled={hasLinkedListing}
                className={hasLinkedListing ? 'bg-muted' : ''}
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <Switch
                id="is_land_deal"
                checked={formData.is_land_deal || false}
                onCheckedChange={(checked) => {
                  update({ is_land_deal: checked });
                  setSizeUnit(checked ? 'AC' : 'SF');
                }}
              />
              <Label htmlFor="is_land_deal" className="cursor-pointer">Land Deal</Label>
            </div>
            {!isLeaseDeal && (
              <Button
                type="button"
                variant={formData.use_purchaser_vendor ? 'default' : 'secondary'}
                size="sm"
                onClick={() => update({ use_purchaser_vendor: !formData.use_purchaser_vendor })}
                className="whitespace-nowrap"
              >
                {formData.use_purchaser_vendor ? 'Purchaser/Vendor' : 'Buyer/Seller'}
              </Button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Size ({formData.is_land_deal ? 'Ac' : 'SF'})</Label>
              {hasLinkedListing ? (
                <Input
                  value={formData.size_sf ? `${formData.size_sf.toLocaleString()} ${sizeUnit}` : ''}
                  disabled
                  className="bg-muted"
                />
              ) : (
                <FormattedNumberInput
                  value={formData.size_sf}
                  onChange={(value) => update({ size_sf: value ?? undefined })}
                  suffix={formData.is_land_deal ? ' Ac' : ' SF'}
                />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => update({ status: value as DealStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {createDealStatuses.map((status) => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="close_date">Close Date</Label>
              <Input
                id="close_date"
                type="date"
                value={formData.close_date}
                onChange={(e) => update({ close_date: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="effective_date">Effective Date</Label>
            <Input
              id="effective_date"
              type="date"
              value={formData.effective_date}
              onChange={(e) => update({ effective_date: e.target.value })}
            />
          </div>

          {isLeaseDeal && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="commencement_date">Commencement Date</Label>
                <Input
                  id="commencement_date"
                  type="date"
                  value={formData.commencement_date}
                  onChange={(e) => update({ commencement_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiry_date">Expiry Date</Label>
                <Input
                  id="expiry_date"
                  type="date"
                  value={formData.expiry_date}
                  onChange={(e) => update({ expiry_date: e.target.value })}
                />
              </div>
            </div>
          )}

          {isLeaseDeal && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Lease Rate PSF</Label>
                <FormattedNumberInput
                  value={formData.lease_rate_psf}
                  onChange={(value) => update({ lease_rate_psf: value ?? undefined })}
                  prefix="$"
                  suffix="/SF"
                />
              </div>
              <div className="space-y-2">
                <Label>Lease Term (Months)</Label>
                <FormattedNumberInput
                  value={formData.lease_term_months}
                  onChange={(value) => {
                    leaseTermManuallyEdited.current = true;
                    update({ lease_term_months: value ?? undefined });
                  }}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Deal Value</Label>
              <FormattedNumberInput
                value={formData.deal_value}
                onChange={(value) => update({ deal_value: value ?? undefined })}
                prefix="$"
              />
            </div>
            <div className="space-y-2">
              <Label>Commission %</Label>
              <FormattedNumberInput
                value={formData.commission_percent}
                onChange={(value) => update({ commission_percent: value ?? undefined })}
                suffix="%"
                max={100}
              />
            </div>
            <div className="space-y-2">
              <Label>Commission Amount</Label>
              <Input
                value={calculatedCommission > 0 ? `$${calculatedCommission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                disabled
                className="bg-muted"
              />
            </div>
          </div>

          {/* ── Parties Section ── */}
          <CollapsibleSection title="Parties" open={partiesOpen} onOpenChange={setPartiesOpen}>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{sellerLabel}</Label>
                <Input
                  value={formData.seller_name}
                  onChange={(e) => update({ seller_name: e.target.value })}
                  placeholder={`${sellerLabel} name`}
                />
              </div>
              <div className="space-y-2">
                <Label>{sellerLabel} Brokerage</Label>
                <BrokerageSelect
                  value={formData.seller_brokerage_id}
                  onChange={(v) => update({ seller_brokerage_id: v })}
                  brokerages={brokerages}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{buyerLabel}</Label>
                <Input
                  value={formData.buyer_name}
                  onChange={(e) => update({ buyer_name: e.target.value })}
                  placeholder={`${buyerLabel} name`}
                />
              </div>
              <div className="space-y-2">
                <Label>{buyerLabel} Brokerage</Label>
                <BrokerageSelect
                  value={formData.buyer_brokerage_id}
                  onChange={(v) => update({ buyer_brokerage_id: v })}
                  brokerages={brokerages}
                />
              </div>
            </div>
          </CollapsibleSection>

          {/* ── Lawyers Section ── */}
          <CollapsibleSection 
            title="Lawyers" 
            open={lawyersOpen} 
            onOpenChange={setLawyersOpen}
          >
            <p className="text-sm font-medium text-muted-foreground">{sellerLabel}'s Lawyer</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={formData.seller_lawyer_name} onChange={(e) => update({ seller_lawyer_name: e.target.value })} placeholder="Lawyer name" />
              </div>
              <div className="space-y-2">
                <Label>Firm</Label>
                <Input value={formData.seller_lawyer_firm} onChange={(e) => update({ seller_lawyer_firm: e.target.value })} placeholder="Law firm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={formData.seller_lawyer_phone} onChange={(e) => update({ seller_lawyer_phone: e.target.value })} placeholder="Phone" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={formData.seller_lawyer_email} onChange={(e) => update({ seller_lawyer_email: e.target.value })} placeholder="Email" />
              </div>
            </div>
            <p className="text-sm font-medium text-muted-foreground mt-2">{buyerLabel}'s Lawyer</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={formData.buyer_lawyer_name} onChange={(e) => update({ buyer_lawyer_name: e.target.value })} placeholder="Lawyer name" />
              </div>
              <div className="space-y-2">
                <Label>Firm</Label>
                <Input value={formData.buyer_lawyer_firm} onChange={(e) => update({ buyer_lawyer_firm: e.target.value })} placeholder="Law firm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={formData.buyer_lawyer_phone} onChange={(e) => update({ buyer_lawyer_phone: e.target.value })} placeholder="Phone" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={formData.buyer_lawyer_email} onChange={(e) => update({ buyer_lawyer_email: e.target.value })} placeholder="Email" />
              </div>
            </div>
          </CollapsibleSection>

          {/* ── Agents Section ── */}
          <CollapsibleSection title="Agents" open={agentsOpen} onOpenChange={setAgentsOpen}>
            <div className="space-y-4">
              {/* Listing Side */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Listing Side</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Brokerage</Label>
                    <BrokerageSelect
                      value={formData.listing_brokerage_id}
                      onChange={(v) => update({ listing_brokerage_id: v, listing_agent1_id: undefined, listing_agent2_id: undefined })}
                      brokerages={brokerages}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Agent 1</Label>
                    <AgentSelect
                      value={formData.listing_agent1_id}
                      onChange={(v) => update({ listing_agent1_id: v })}
                      agents={listingAgents1}
                      disabled={!formData.listing_brokerage_id}
                    />
                  </div>
                </div>
                {formData.listing_agent1_id && listingAgents2.length > 0 && (
                  <div className="grid grid-cols-2 gap-4">
                    <div />
                    <div className="space-y-2">
                      <Label>Agent 2</Label>
                      <AgentSelect
                        value={formData.listing_agent2_id}
                        onChange={(v) => update({ listing_agent2_id: v })}
                        agents={listingAgents2}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Selling Side */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">{isLeaseDeal ? 'Leasing' : 'Selling'} Side</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Brokerage</Label>
                    <BrokerageSelect
                      value={formData.selling_brokerage_id}
                      onChange={(v) => update({ selling_brokerage_id: v, selling_agent1_id: undefined, selling_agent2_id: undefined })}
                      brokerages={brokerages}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Agent 1</Label>
                    <AgentSelect
                      value={formData.selling_agent1_id}
                      onChange={(v) => update({ selling_agent1_id: v })}
                      agents={sellingAgents1}
                      disabled={!formData.selling_brokerage_id}
                    />
                  </div>
                </div>
                {formData.selling_agent1_id && sellingAgents2.length > 0 && (
                  <div className="grid grid-cols-2 gap-4">
                    <div />
                    <div className="space-y-2">
                      <Label>Agent 2</Label>
                      <AgentSelect
                        value={formData.selling_agent2_id}
                        onChange={(v) => update({ selling_agent2_id: v })}
                        agents={sellingAgents2}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* CV Agent */}
              <div className="space-y-2">
                <Label>Clearview Agent</Label>
                <AgentSelect
                  value={formData.cv_agent_id}
                  onChange={(v) => update({ cv_agent_id: v })}
                  agents={cvAgents}
                />
              </div>
            </div>
          </CollapsibleSection>

          {/* ── Financial Split Section ── */}
          <CollapsibleSection title="Commission Split" open={financialOpen} onOpenChange={setFinancialOpen}>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Other Brokerage %</Label>
                <FormattedNumberInput
                  value={formData.other_brokerage_percent}
                  onChange={(value) => update({ other_brokerage_percent: value ?? undefined })}
                  suffix="%"
                  max={100}
                />
              </div>
              <div className="space-y-2">
                <Label>Clearview %</Label>
                <FormattedNumberInput
                  value={formData.clearview_percent}
                  onChange={(value) => update({ clearview_percent: value ?? undefined })}
                  suffix="%"
                  max={100}
                />
              </div>
              <div className="space-y-2">
                <Label>GST Rate %</Label>
                <FormattedNumberInput
                  value={formData.gst_rate}
                  onChange={(value) => update({ gst_rate: value ?? undefined })}
                  suffix="%"
                  max={100}
                />
              </div>
            </div>
          </CollapsibleSection>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => update({ notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEditing ? 'Update Deal' : 'Create Deal'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ── Helper Components ── */

function CollapsibleSection({
  title,
  open,
  onOpenChange,
  children,
}: {
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange} className="border rounded-lg">
      <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium hover:bg-muted/50 rounded-lg">
        {title}
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4 space-y-4">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

function BrokerageSelect({
  value,
  onChange,
  brokerages,
}: {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  brokerages: any[] | undefined;
}) {
  return (
    <Select
      value={value || '__none__'}
      onValueChange={(v) => onChange(v === '__none__' ? undefined : v)}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select brokerage" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">None</SelectItem>
        {brokerages?.map((b) => (
          <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function AgentSelect({
  value,
  onChange,
  agents,
  disabled,
}: {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  agents: any[];
  disabled?: boolean;
}) {
  return (
    <Select
      value={value || '__none__'}
      onValueChange={(v) => onChange(v === '__none__' ? undefined : v)}
      disabled={disabled}
    >
      <SelectTrigger className={disabled ? 'bg-muted' : ''}>
        <SelectValue placeholder="Select agent" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">None</SelectItem>
        {agents.map((a) => (
          <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
