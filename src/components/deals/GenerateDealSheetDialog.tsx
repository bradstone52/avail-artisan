import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon, ChevronDown, Plus, X, FileText } from 'lucide-react';
import { useAgents, useCreateAgent } from '@/hooks/useAgents';
import { useBrokerages, useCreateBrokerage } from '@/hooks/useBrokerages';
import { useDealConditions } from '@/hooks/useDealConditions';
import { useDealDeposits } from '@/hooks/useDealDeposits';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { pdf } from '@react-pdf/renderer';
import { DealSheetPDF } from '@/components/documents/DealSheetPDF';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/format';
import type { Deal } from '@/types/database';
import { AddBrokerageWithAgentsDialog } from '@/components/deals/detail/AddBrokerageWithAgentsDialog';

interface GenerateDealSheetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal: Deal;
}

interface LocalCondition {
  id?: string;
  description: string;
  due_date: string | null;
  isNew?: boolean;
}

interface LocalDeposit {
  id?: string;
  amount: number;
  held_by: string;
  isNew?: boolean;
}

export function GenerateDealSheetDialog({ open, onOpenChange, deal }: GenerateDealSheetDialogProps) {
  const { data: agents } = useAgents();
  const { data: brokerages } = useBrokerages();
  const queryClient = useQueryClient();
  const { conditions: existingConditions, addCondition, deleteCondition } = useDealConditions(deal.id);
  const { deposits: existingDeposits, addDeposit, deleteDeposit } = useDealDeposits(deal.id);

  // Form state
  const [notes, setNotes] = useState(deal.notes || '');
  const [listingBrokerageId, setListingBrokerageId] = useState(deal.listing_brokerage_id || '');
  const [listingAgent1Id, setListingAgent1Id] = useState(deal.listing_agent1_id || '');
  const [listingAgent2Id, setListingAgent2Id] = useState(deal.listing_agent2_id || '');
  const [sellingBrokerageId, setSellingBrokerageId] = useState(deal.selling_brokerage_id || '');
  const [sellingAgent1Id, setSellingAgent1Id] = useState(deal.selling_agent1_id || '');
  const [sellingAgent2Id, setSellingAgent2Id] = useState(deal.selling_agent2_id || '');
  const [cvAgentId, setCvAgentId] = useState(deal.cv_agent_id || '');
  const [sellerName, setSellerName] = useState(deal.seller_name || '');
  const [sellerBrokerageId, setSellerBrokerageId] = useState(deal.seller_brokerage_id || '');
  const [buyerName, setBuyerName] = useState(deal.buyer_name || '');
  const [buyerBrokerageId, setBuyerBrokerageId] = useState(deal.buyer_brokerage_id || '');
  const [dealValue, setDealValue] = useState(deal.deal_value || 0);
  const [commissionPercent, setCommissionPercent] = useState(deal.commission_percent || 3);
  const [otherBrokeragePercent, setOtherBrokeragePercent] = useState(deal.other_brokerage_percent || 1.5);
  const [clearviewPercent, setClearviewPercent] = useState(deal.clearview_percent || 1.5);
  const [gstRate, setGstRate] = useState(deal.gst_rate || 5);

  // Local conditions & deposits
  const [localConditions, setLocalConditions] = useState<LocalCondition[]>([]);
  const [localDeposits, setLocalDeposits] = useState<LocalDeposit[]>([]);

  // Dialog states
  const [addBrokerageOpen, setAddBrokerageOpen] = useState(false);
  const [brokerageContext, setBrokerageContext] = useState<'listing' | 'selling' | 'seller' | 'buyer'>('listing');
  const [showPreview, setShowPreview] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Collapsible sections
  const [sectionsOpen, setSectionsOpen] = useState({
    basic: true,
    agents: true,
    parties: true,
    conditions: true,
    deposits: true,
    financial: true,
  });

  // Initialize local conditions and deposits from existing
  useEffect(() => {
    if (existingConditions) {
      setLocalConditions(existingConditions.map(c => ({
        id: c.id,
        description: c.description,
        due_date: c.due_date,
      })));
    }
  }, [existingConditions]);

  useEffect(() => {
    if (existingDeposits) {
      setLocalDeposits(existingDeposits.map(d => ({
        id: d.id,
        amount: d.amount,
        held_by: d.held_by || '',
      })));
    }
  }, [existingDeposits]);

  // Filter agents by brokerage
  const getAgentsForBrokerage = (brokerageId: string) => {
    if (!brokerageId || !agents) return [];
    return agents.filter(a => a.brokerage_id === brokerageId);
  };

  // Get CV agents (Clearview Commercial Realty Inc.)
  const cvAgents = agents?.filter(a => {
    const brokerage = brokerages?.find(b => b.id === a.brokerage_id);
    return brokerage?.name?.toLowerCase().includes('clearview');
  }) || [];

  // Commission calculations
  const totalCommission = dealValue * commissionPercent / 100;
  const totalGST = totalCommission * gstRate / 100;
  const totalWithGST = totalCommission + totalGST;
  const otherCommission = dealValue * otherBrokeragePercent / 100;
  const otherGST = otherCommission * gstRate / 100;
  const cvCommission = dealValue * clearviewPercent / 100;
  const cvGST = cvCommission * gstRate / 100;

  const handleAddCondition = () => {
    setLocalConditions([...localConditions, { description: '', due_date: null, isNew: true }]);
  };

  const handleRemoveCondition = (index: number) => {
    setLocalConditions(localConditions.filter((_, i) => i !== index));
  };

  const handleConditionChange = (index: number, field: 'description' | 'due_date', value: string | null) => {
    const updated = [...localConditions];
    updated[index] = { ...updated[index], [field]: value };
    setLocalConditions(updated);
  };

  const handleAddDeposit = () => {
    setLocalDeposits([...localDeposits, { amount: 0, held_by: '', isNew: true }]);
  };

  const handleRemoveDeposit = (index: number) => {
    setLocalDeposits(localDeposits.filter((_, i) => i !== index));
  };

  const handleDepositChange = (index: number, field: 'amount' | 'held_by', value: number | string) => {
    const updated = [...localDeposits];
    updated[index] = { ...updated[index], [field]: value };
    setLocalDeposits(updated);
  };

  const handleOpenAddBrokerage = (context: 'listing' | 'selling' | 'seller' | 'buyer') => {
    setBrokerageContext(context);
    setAddBrokerageOpen(true);
  };

  const handleBrokerageCreated = (brokerageId: string) => {
    if (brokerageContext === 'listing') setListingBrokerageId(brokerageId);
    else if (brokerageContext === 'selling') setSellingBrokerageId(brokerageId);
    else if (brokerageContext === 'seller') setSellerBrokerageId(brokerageId);
    else if (brokerageContext === 'buyer') setBuyerBrokerageId(brokerageId);
  };

  const saveAndGenerate = async () => {
    setSaving(true);
    try {
      // Update deal with all the form data using direct supabase call
      const { error: updateError } = await supabase
        .from('deals')
        .update({
          notes,
          listing_brokerage_id: listingBrokerageId || null,
          listing_agent1_id: listingAgent1Id || null,
          listing_agent2_id: listingAgent2Id || null,
          selling_brokerage_id: sellingBrokerageId || null,
          selling_agent1_id: sellingAgent1Id || null,
          selling_agent2_id: sellingAgent2Id || null,
          cv_agent_id: cvAgentId || null,
          seller_name: sellerName || null,
          seller_brokerage_id: sellerBrokerageId || null,
          buyer_name: buyerName || null,
          buyer_brokerage_id: buyerBrokerageId || null,
          deal_value: dealValue || null,
          commission_percent: commissionPercent || null,
          other_brokerage_percent: otherBrokeragePercent || null,
          clearview_percent: clearviewPercent || null,
          gst_rate: gstRate || null,
        })
        .eq('id', deal.id);

      if (updateError) throw updateError;

      // Invalidate deals query
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['deals', deal.id] });

      // Sync conditions - add new ones
      for (const c of localConditions) {
        if (c.isNew && c.description) {
          await addCondition({
            description: c.description,
            due_date: c.due_date || undefined,
          });
        }
      }

      // Delete removed conditions
      const currentConditionIds = localConditions.filter(c => c.id).map(c => c.id);
      for (const existing of existingConditions || []) {
        if (!currentConditionIds.includes(existing.id)) {
          await deleteCondition(existing.id);
        }
      }

      // Sync deposits - add new ones
      for (const d of localDeposits) {
        if (d.isNew && d.amount > 0) {
          await addDeposit({
            amount: d.amount,
            held_by: d.held_by || undefined,
          });
        }
      }

      // Delete removed deposits
      const depositIds = localDeposits.filter(d => d.id).map(d => d.id);
      for (const existing of existingDeposits || []) {
        if (!depositIds.includes(existing.id)) {
          await deleteDeposit(existing.id);
        }
      }

      // Now generate PDF
      setGenerating(true);
      
      // Create updated deal object for PDF
      const updatedDeal: Deal = {
        ...deal,
        notes,
        listing_brokerage_id: listingBrokerageId || null,
        listing_agent1_id: listingAgent1Id || null,
        listing_agent2_id: listingAgent2Id || null,
        selling_brokerage_id: sellingBrokerageId || null,
        selling_agent1_id: sellingAgent1Id || null,
        selling_agent2_id: sellingAgent2Id || null,
        cv_agent_id: cvAgentId || null,
        seller_name: sellerName || null,
        seller_brokerage_id: sellerBrokerageId || null,
        buyer_name: buyerName || null,
        buyer_brokerage_id: buyerBrokerageId || null,
        deal_value: dealValue || null,
        commission_percent: commissionPercent || null,
        other_brokerage_percent: otherBrokeragePercent || null,
        clearview_percent: clearviewPercent || null,
        gst_rate: gstRate || null,
      };

      const getAgent = (id: string | null | undefined) => agents?.find(a => a.id === id);
      const getBrokerage = (id: string | null | undefined) => brokerages?.find(b => b.id === id);

      const blob = await pdf(
        <DealSheetPDF
          deal={updatedDeal}
          conditions={localConditions.filter(c => c.description).map(c => ({
            id: c.id || '',
            deal_id: deal.id,
            description: c.description,
            due_date: c.due_date,
            is_satisfied: false,
            created_at: '',
          }))}
          deposits={localDeposits.filter(d => d.amount > 0).map(d => ({
            id: d.id || '',
            deal_id: deal.id,
            amount: d.amount,
            held_by: d.held_by,
            due_date: null,
            received: false,
            created_at: '',
          }))}
          getAgent={getAgent}
          getBrokerage={getBrokerage}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${deal.address.replace(/[^a-zA-Z0-9]/g, '_')}_Dealsheet.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Deal Sheet generated successfully');
      onOpenChange(false);
    } catch (error) {
      console.error('Error generating deal sheet:', error);
      toast.error('Failed to generate deal sheet');
    } finally {
      setSaving(false);
      setGenerating(false);
    }
  };

  const toggleSection = (section: keyof typeof sectionsOpen) => {
    setSectionsOpen(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Calculate size display
  const getSizeDisplay = () => {
    if (!deal.size_sf) return '—';
    return `${deal.size_sf.toLocaleString()} SF`;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0" preventOutsideClose>
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Generate Deal Sheet
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(90vh-120px)] px-6">
            <div className="space-y-4 pb-6">
              {/* Basic Information */}
              <Collapsible open={sectionsOpen.basic} onOpenChange={() => toggleSection('basic')}>
                <CollapsibleTrigger className="flex items-center justify-between w-full py-2 font-semibold text-left">
                  Basic Information
                  <ChevronDown className={cn("w-4 h-4 transition-transform", sectionsOpen.basic && "rotate-180")} />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-2">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Deal Number</Label>
                      <Input value={deal.deal_number || '—'} disabled className="bg-muted" />
                    </div>
                    <div className="space-y-2">
                      <Label>Deal Type</Label>
                      <Input value={deal.deal_type} disabled className="bg-muted" />
                    </div>
                    <div className="space-y-2">
                      <Label>Size</Label>
                      <Input value={getSizeDisplay()} disabled className="bg-muted" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Address</Label>
                      <Input value={deal.address} disabled className="bg-muted" />
                    </div>
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input value={deal.city || ''} disabled className="bg-muted" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes/Comments</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      placeholder="Additional notes for the deal sheet..."
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <Separator />

              {/* Agents Section */}
              <Collapsible open={sectionsOpen.agents} onOpenChange={() => toggleSection('agents')}>
                <CollapsibleTrigger className="flex items-center justify-between w-full py-2 font-semibold text-left">
                  Agents
                  <ChevronDown className={cn("w-4 h-4 transition-transform", sectionsOpen.agents && "rotate-180")} />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-6 pt-2">
                  {/* Listing Side */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground">Listing Side</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Listing Brokerage</Label>
                        <Select value={listingBrokerageId} onValueChange={setListingBrokerageId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select brokerage" />
                          </SelectTrigger>
                          <SelectContent>
                            {brokerages?.map((b) => (
                              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                            ))}
                            <SelectItem value="__add_new__">
                              <span className="flex items-center gap-1 text-primary">
                                <Plus className="w-3 h-3" /> Add New
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Listing Agent 1</Label>
                        <Select value={listingAgent1Id} onValueChange={setListingAgent1Id} disabled={!listingBrokerageId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select agent" />
                          </SelectTrigger>
                          <SelectContent>
                            {getAgentsForBrokerage(listingBrokerageId).map((a) => (
                              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Listing Agent 2</Label>
                        <Select value={listingAgent2Id} onValueChange={setListingAgent2Id} disabled={!listingBrokerageId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select agent" />
                          </SelectTrigger>
                          <SelectContent>
                            {getAgentsForBrokerage(listingBrokerageId).map((a) => (
                              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Selling Side */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground">Selling Side</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Selling Brokerage</Label>
                        <Select value={sellingBrokerageId} onValueChange={setSellingBrokerageId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select brokerage" />
                          </SelectTrigger>
                          <SelectContent>
                            {brokerages?.map((b) => (
                              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                            ))}
                            <SelectItem value="__add_new__">
                              <span className="flex items-center gap-1 text-primary">
                                <Plus className="w-3 h-3" /> Add New
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Selling Agent 1</Label>
                        <Select value={sellingAgent1Id} onValueChange={setSellingAgent1Id} disabled={!sellingBrokerageId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select agent" />
                          </SelectTrigger>
                          <SelectContent>
                            {getAgentsForBrokerage(sellingBrokerageId).map((a) => (
                              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Selling Agent 2</Label>
                        <Select value={sellingAgent2Id} onValueChange={setSellingAgent2Id} disabled={!sellingBrokerageId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select agent" />
                          </SelectTrigger>
                          <SelectContent>
                            {getAgentsForBrokerage(sellingBrokerageId).map((a) => (
                              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* CV Agent */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground">Clearview Agent</h4>
                    <div className="space-y-2">
                      <Label>CV Agent</Label>
                      <Select value={cvAgentId} onValueChange={setCvAgentId}>
                        <SelectTrigger className="w-1/3">
                          <SelectValue placeholder="Select CV agent" />
                        </SelectTrigger>
                        <SelectContent>
                          {cvAgents.map((a) => (
                            <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <Separator />

              {/* Parties Section */}
              <Collapsible open={sectionsOpen.parties} onOpenChange={() => toggleSection('parties')}>
                <CollapsibleTrigger className="flex items-center justify-between w-full py-2 font-semibold text-left">
                  Parties
                  <ChevronDown className={cn("w-4 h-4 transition-transform", sectionsOpen.parties && "rotate-180")} />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-6">
                    {/* Seller */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium text-muted-foreground">Seller</h4>
                      <div className="space-y-2">
                        <Label>Seller Name</Label>
                        <Input value={sellerName} onChange={(e) => setSellerName(e.target.value)} placeholder="Seller name" />
                      </div>
                      <div className="space-y-2">
                        <Label>Seller Brokerage</Label>
                        <Select value={sellerBrokerageId} onValueChange={(v) => v === '__add_new__' ? handleOpenAddBrokerage('seller') : setSellerBrokerageId(v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select brokerage" />
                          </SelectTrigger>
                          <SelectContent>
                            {brokerages?.map((b) => (
                              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                            ))}
                            <SelectItem value="__add_new__">
                              <span className="flex items-center gap-1 text-primary">
                                <Plus className="w-3 h-3" /> Add New
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Buyer */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium text-muted-foreground">Buyer</h4>
                      <div className="space-y-2">
                        <Label>Buyer Name</Label>
                        <Input value={buyerName} onChange={(e) => setBuyerName(e.target.value)} placeholder="Buyer name" />
                      </div>
                      <div className="space-y-2">
                        <Label>Buyer Brokerage</Label>
                        <Select value={buyerBrokerageId} onValueChange={(v) => v === '__add_new__' ? handleOpenAddBrokerage('buyer') : setBuyerBrokerageId(v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select brokerage" />
                          </SelectTrigger>
                          <SelectContent>
                            {brokerages?.map((b) => (
                              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                            ))}
                            <SelectItem value="__add_new__">
                              <span className="flex items-center gap-1 text-primary">
                                <Plus className="w-3 h-3" /> Add New
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <Separator />

              {/* Conditions Section */}
              <Collapsible open={sectionsOpen.conditions} onOpenChange={() => toggleSection('conditions')}>
                <CollapsibleTrigger className="flex items-center justify-between w-full py-2 font-semibold text-left">
                  Conditions
                  <ChevronDown className={cn("w-4 h-4 transition-transform", sectionsOpen.conditions && "rotate-180")} />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-2">
                  {localConditions.map((condition, index) => (
                    <div key={index} className="flex gap-4 items-start">
                      <div className="flex-1 space-y-2">
                        <Label>Description</Label>
                        <Input
                          value={condition.description}
                          onChange={(e) => handleConditionChange(index, 'description', e.target.value)}
                          placeholder="Condition description"
                        />
                      </div>
                      <div className="w-48 space-y-2">
                        <Label>Due Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !condition.due_date && "text-muted-foreground")}>
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {condition.due_date ? format(new Date(condition.due_date), 'PPP') : 'Select date'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={condition.due_date ? new Date(condition.due_date) : undefined}
                              onSelect={(date) => handleConditionChange(index, 'due_date', date ? date.toISOString().split('T')[0] : null)}
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <Button variant="ghost" size="icon" className="mt-8" onClick={() => handleRemoveCondition(index)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={handleAddCondition}>
                    <Plus className="w-4 h-4 mr-2" /> Add Condition
                  </Button>
                </CollapsibleContent>
              </Collapsible>

              <Separator />

              {/* Deposits Section */}
              <Collapsible open={sectionsOpen.deposits} onOpenChange={() => toggleSection('deposits')}>
                <CollapsibleTrigger className="flex items-center justify-between w-full py-2 font-semibold text-left">
                  Deposits
                  <ChevronDown className={cn("w-4 h-4 transition-transform", sectionsOpen.deposits && "rotate-180")} />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-2">
                  {localDeposits.map((deposit, index) => (
                    <div key={index} className="flex gap-4 items-start">
                      <div className="w-48 space-y-2">
                        <Label>Amount</Label>
                        <FormattedNumberInput
                          value={deposit.amount}
                          onChange={(v) => handleDepositChange(index, 'amount', v || 0)}
                          prefix="$"
                        />
                      </div>
                      <div className="flex-1 space-y-2">
                        <Label>Held By</Label>
                        <Input
                          value={deposit.held_by}
                          onChange={(e) => handleDepositChange(index, 'held_by', e.target.value)}
                          placeholder="Who holds the deposit"
                        />
                      </div>
                      <Button variant="ghost" size="icon" className="mt-8" onClick={() => handleRemoveDeposit(index)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={handleAddDeposit}>
                    <Plus className="w-4 h-4 mr-2" /> Add Deposit
                  </Button>
                </CollapsibleContent>
              </Collapsible>

              <Separator />

              {/* Financial Section */}
              <Collapsible open={sectionsOpen.financial} onOpenChange={() => toggleSection('financial')}>
                <CollapsibleTrigger className="flex items-center justify-between w-full py-2 font-semibold text-left">
                  Financial
                  <ChevronDown className={cn("w-4 h-4 transition-transform", sectionsOpen.financial && "rotate-180")} />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-2">
                  <div className="grid grid-cols-5 gap-4">
                    <div className="space-y-2">
                      <Label>Deal Value</Label>
                      <FormattedNumberInput value={dealValue} onChange={(v) => setDealValue(v || 0)} prefix="$" />
                    </div>
                    <div className="space-y-2">
                      <Label>Commission %</Label>
                      <FormattedNumberInput value={commissionPercent} onChange={(v) => setCommissionPercent(v || 0)} suffix="%" />
                    </div>
                    <div className="space-y-2">
                      <Label>Other Brokerage %</Label>
                      <FormattedNumberInput value={otherBrokeragePercent} onChange={(v) => setOtherBrokeragePercent(v || 0)} suffix="%" />
                    </div>
                    <div className="space-y-2">
                      <Label>Clearview %</Label>
                      <FormattedNumberInput value={clearviewPercent} onChange={(v) => setClearviewPercent(v || 0)} suffix="%" />
                    </div>
                    <div className="space-y-2">
                      <Label>GST Rate %</Label>
                      <FormattedNumberInput value={gstRate} onChange={(v) => setGstRate(v || 0)} suffix="%" />
                    </div>
                  </div>

                  {/* Commission Preview */}
                  <div className="mt-6 p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold mb-4">Commission Preview</h4>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="p-3 bg-background rounded border">
                        <div className="text-muted-foreground mb-2">Total Commission</div>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span>Commission:</span>
                            <span className="font-medium">{formatCurrency(totalCommission)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>GST ({gstRate}%):</span>
                            <span className="font-medium">{formatCurrency(totalGST)}</span>
                          </div>
                          <Separator className="my-2" />
                          <div className="flex justify-between font-semibold">
                            <span>Total:</span>
                            <span>{formatCurrency(totalWithGST)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="p-3 bg-background rounded border">
                        <div className="text-muted-foreground mb-2">Other Brokerage ({otherBrokeragePercent}%)</div>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span>Commission:</span>
                            <span className="font-medium">{formatCurrency(otherCommission)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>GST:</span>
                            <span className="font-medium">{formatCurrency(otherGST)}</span>
                          </div>
                          <Separator className="my-2" />
                          <div className="flex justify-between font-semibold">
                            <span>Total:</span>
                            <span>{formatCurrency(otherCommission + otherGST)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="p-3 bg-background rounded border">
                        <div className="text-muted-foreground mb-2">Clearview ({clearviewPercent}%)</div>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span>Commission:</span>
                            <span className="font-medium">{formatCurrency(cvCommission)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>GST:</span>
                            <span className="font-medium">{formatCurrency(cvGST)}</span>
                          </div>
                          <Separator className="my-2" />
                          <div className="flex justify-between font-semibold">
                            <span>Total:</span>
                            <span>{formatCurrency(cvCommission + cvGST)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </ScrollArea>

          {/* Footer Actions */}
          <div className="flex justify-end gap-2 p-6 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={saveAndGenerate} disabled={saving || generating}>
              {saving ? 'Saving...' : generating ? 'Generating...' : 'Download PDF'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AddBrokerageWithAgentsDialog
        open={addBrokerageOpen}
        onOpenChange={setAddBrokerageOpen}
        onBrokerageCreated={handleBrokerageCreated}
      />
    </>
  );
}
