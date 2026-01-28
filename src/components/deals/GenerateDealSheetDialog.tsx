import { useState, useEffect, useMemo } from 'react';
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
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FormattedNumberInput } from '@/components/common/FormattedNumberInput';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon, Plus, X, FileText, Download, Eye, Check } from 'lucide-react';
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

const TABS = ['basic', 'agents', 'parties', 'conditions', 'financial', 'preview'] as const;
type TabValue = typeof TABS[number];

export function GenerateDealSheetDialog({ open, onOpenChange, deal }: GenerateDealSheetDialogProps) {
  const { data: agents } = useAgents();
  const { data: brokerages } = useBrokerages();
  const queryClient = useQueryClient();
  const { conditions: existingConditions, addCondition, deleteCondition } = useDealConditions(deal.id);
  const { deposits: existingDeposits, addDeposit, deleteDeposit } = useDealDeposits(deal.id);

  // Current tab
  const [currentTab, setCurrentTab] = useState<TabValue>('basic');

  // Form state - now includes editable deal number
  const [dealNumber, setDealNumber] = useState(deal.deal_number || '');
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
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Create stable dependency strings based on IDs to prevent infinite loops
  const conditionIds = existingConditions?.map(c => c.id).join(',') || '';
  const depositIds = existingDeposits?.map(d => d.id).join(',') || '';

  // Initialize local conditions and deposits from existing (using stable ID-based dependencies)
  useEffect(() => {
    if (existingConditions) {
      setLocalConditions(existingConditions.map(c => ({
        id: c.id,
        description: c.description,
        due_date: c.due_date,
      })));
    }
  }, [conditionIds]);

  useEffect(() => {
    if (existingDeposits) {
      setLocalDeposits(existingDeposits.map(d => ({
        id: d.id,
        amount: d.amount,
        held_by: d.held_by || '',
      })));
    }
  }, [depositIds]);

  // Filter agents by brokerage, excluding already selected agent
  const getAgentsForBrokerage = (brokerageId: string, excludeAgentId?: string) => {
    if (!brokerageId || !agents) return [];
    return agents.filter(a => 
      a.brokerage_id === brokerageId && 
      (!excludeAgentId || a.id !== excludeAgentId)
    );
  };

  // Get agents for listing side (agent 2 excludes agent 1)
  const listingAgents1 = useMemo(() => getAgentsForBrokerage(listingBrokerageId), [listingBrokerageId, agents]);
  const listingAgents2 = useMemo(() => getAgentsForBrokerage(listingBrokerageId, listingAgent1Id), [listingBrokerageId, listingAgent1Id, agents]);
  
  // Get agents for selling side (agent 2 excludes agent 1)
  const sellingAgents1 = useMemo(() => getAgentsForBrokerage(sellingBrokerageId), [sellingBrokerageId, agents]);
  const sellingAgents2 = useMemo(() => getAgentsForBrokerage(sellingBrokerageId, sellingAgent1Id), [sellingBrokerageId, sellingAgent1Id, agents]);

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

  // Clear agent 2 if agent 1 changes to the same value
  useEffect(() => {
    if (listingAgent1Id && listingAgent2Id === listingAgent1Id) {
      setListingAgent2Id('');
    }
  }, [listingAgent1Id]);

  useEffect(() => {
    if (sellingAgent1Id && sellingAgent2Id === sellingAgent1Id) {
      setSellingAgent2Id('');
    }
  }, [sellingAgent1Id]);

  const getAgent = (id: string | null | undefined) => agents?.find(a => a.id === id);
  const getBrokerage = (id: string | null | undefined) => brokerages?.find(b => b.id === id);

  const saveAndGenerate = async () => {
    setSaving(true);
    try {
      // Update deal with all the form data
      const { error: updateError } = await supabase
        .from('deals')
        .update({
          deal_number: dealNumber || null,
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

      // Sync conditions
      for (const c of localConditions) {
        if (c.isNew && c.description) {
          await addCondition({
            description: c.description,
            due_date: c.due_date || undefined,
          });
        }
      }

      const currentConditionIds = localConditions.filter(c => c.id).map(c => c.id);
      for (const existing of existingConditions || []) {
        if (!currentConditionIds.includes(existing.id)) {
          await deleteCondition(existing.id);
        }
      }

      // Sync deposits
      for (const d of localDeposits) {
        if (d.isNew && d.amount > 0) {
          await addDeposit({
            amount: d.amount,
            held_by: d.held_by || undefined,
          });
        }
      }

      const depositIds = localDeposits.filter(d => d.id).map(d => d.id);
      for (const existing of existingDeposits || []) {
        if (!depositIds.includes(existing.id)) {
          await deleteDeposit(existing.id);
        }
      }

      // Generate PDF
      setGenerating(true);
      
      const updatedDeal: Deal = {
        ...deal,
        deal_number: dealNumber || null,
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

      // Download the PDF
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const fileName = `${deal.address.replace(/[^a-zA-Z0-9]/g, '_')}_Dealsheet.pdf`;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Upload to deal documents
      try {
        const file = new File([blob], fileName, { type: 'application/pdf' });
        const filePath = `${deal.id}/${Date.now()}-${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('deals')
          .upload(filePath, file);

        if (!uploadError) {
          await supabase.from('deal_documents').insert({
            deal_id: deal.id,
            name: `Deal Sheet - ${dealNumber || deal.address}`,
            file_path: filePath,
            file_size: blob.size,
            uploaded_by: null,
          });
          queryClient.invalidateQueries({ queryKey: ['deal_documents', deal.id] });
        }
      } catch (docError) {
        console.warn('Could not save deal sheet to documents:', docError);
      }

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

  // Calculate size display
  const getSizeDisplay = () => {
    if (!deal.size_sf) return '—';
    return `${deal.size_sf.toLocaleString()} SF`;
  };

  // Tab navigation
  const currentTabIndex = TABS.indexOf(currentTab);
  const canGoNext = currentTabIndex < TABS.length - 1;
  const canGoPrev = currentTabIndex > 0;

  const goToNextTab = () => {
    if (canGoNext) setCurrentTab(TABS[currentTabIndex + 1]);
  };

  const goToPrevTab = () => {
    if (canGoPrev) setCurrentTab(TABS[currentTabIndex - 1]);
  };

  // Get helper names for preview
  const listingBrokerage = getBrokerage(listingBrokerageId);
  const sellingBrokerage = getBrokerage(sellingBrokerageId);
  const sellerBrokerage = getBrokerage(sellerBrokerageId);
  const buyerBrokerage = getBrokerage(buyerBrokerageId);
  const listingAgent1 = getAgent(listingAgent1Id);
  const listingAgent2 = getAgent(listingAgent2Id);
  const sellingAgent1 = getAgent(sellingAgent1Id);
  const sellingAgent2 = getAgent(sellingAgent2Id);
  const cvAgent = getAgent(cvAgentId);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl p-0" preventOutsideClose>
          <DialogHeader className="p-6 pb-4">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Generate Deal Sheet
            </DialogTitle>
          </DialogHeader>

          <Tabs value={currentTab} onValueChange={(v) => setCurrentTab(v as TabValue)} className="flex-1">
            <div className="px-6">
              <TabsList className="w-full grid grid-cols-6">
                <TabsTrigger value="basic" className="text-xs">Basic</TabsTrigger>
                <TabsTrigger value="agents" className="text-xs">Agents</TabsTrigger>
                <TabsTrigger value="parties" className="text-xs">Parties</TabsTrigger>
                <TabsTrigger value="conditions" className="text-xs">Conditions</TabsTrigger>
                <TabsTrigger value="financial" className="text-xs">Financial</TabsTrigger>
                <TabsTrigger value="preview" className="text-xs">Preview</TabsTrigger>
              </TabsList>
            </div>

            <div className="px-6 mt-4 pb-2 max-h-[60vh] overflow-y-auto">
              {/* Basic Information Tab */}
              <TabsContent value="basic" className="mt-0 space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Deal Number</Label>
                    <Input 
                      value={dealNumber} 
                      onChange={(e) => setDealNumber(e.target.value)}
                      placeholder="Enter deal number"
                    />
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
                    rows={4}
                    placeholder="Additional notes for the deal sheet..."
                  />
                </div>
              </TabsContent>

              {/* Agents Tab */}
              <TabsContent value="agents" className="mt-0 space-y-6">
                {/* Listing Side */}
                <div className="space-y-4">
                  <h4 className="font-medium">Listing Side</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Listing Brokerage</Label>
                      <Select 
                        value={listingBrokerageId} 
                        onValueChange={(v) => v === '__add_new__' ? handleOpenAddBrokerage('listing') : setListingBrokerageId(v)}
                      >
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
                          {listingAgents1.map((a) => (
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
                          {listingAgents2.map((a) => (
                            <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Selling Side */}
                <div className="space-y-4">
                  <h4 className="font-medium">Selling Side</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Selling Brokerage</Label>
                      <Select 
                        value={sellingBrokerageId} 
                        onValueChange={(v) => v === '__add_new__' ? handleOpenAddBrokerage('selling') : setSellingBrokerageId(v)}
                      >
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
                          {sellingAgents1.map((a) => (
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
                          {sellingAgents2.map((a) => (
                            <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* CV Agent */}
                <div className="space-y-4">
                  <h4 className="font-medium">Clearview Agent</h4>
                  <div className="space-y-2">
                    <Label>CV Agent</Label>
                    <Select value={cvAgentId} onValueChange={setCvAgentId}>
                      <SelectTrigger className="w-1/2">
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
              </TabsContent>

              {/* Parties Tab */}
              <TabsContent value="parties" className="mt-0 space-y-6">
                <div className="grid grid-cols-2 gap-8">
                  {/* Seller */}
                  <div className="space-y-4">
                    <h4 className="font-medium">Seller</h4>
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
                    <h4 className="font-medium">Buyer</h4>
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
              </TabsContent>

              {/* Conditions Tab */}
              <TabsContent value="conditions" className="mt-0 space-y-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Conditions</h4>
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
                      <div className="w-40 space-y-2 flex-shrink-0">
                        <Label>Due Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("w-full justify-start text-left font-normal text-xs px-2", !condition.due_date && "text-muted-foreground")}>
                              <CalendarIcon className="mr-1 h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{condition.due_date ? format(new Date(condition.due_date), 'MMM d, yyyy') : 'Select'}</span>
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
                      <Button variant="ghost" size="icon" className="mt-8 flex-shrink-0" onClick={() => handleRemoveCondition(index)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={handleAddCondition}>
                    <Plus className="w-4 h-4 mr-2" /> Add Condition
                  </Button>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-medium">Deposits</h4>
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
                </div>
              </TabsContent>

              {/* Financial Tab */}
              <TabsContent value="financial" className="mt-0 space-y-6">
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
                <div className="p-4 bg-muted rounded-lg">
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
              </TabsContent>

              {/* Preview Tab */}
              <TabsContent value="preview" className="mt-0 space-y-6">
                <div className="space-y-6">
                  {/* Deal Summary */}
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      Deal Summary
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><span className="text-muted-foreground">Deal Number:</span> <span className="font-medium">{dealNumber || '—'}</span></div>
                      <div><span className="text-muted-foreground">Deal Type:</span> <span className="font-medium">{deal.deal_type}</span></div>
                      <div><span className="text-muted-foreground">Address:</span> <span className="font-medium">{deal.address}</span></div>
                      <div><span className="text-muted-foreground">City:</span> <span className="font-medium">{deal.city || '—'}</span></div>
                      <div><span className="text-muted-foreground">Size:</span> <span className="font-medium">{getSizeDisplay()}</span></div>
                      <div><span className="text-muted-foreground">Deal Value:</span> <span className="font-medium">{formatCurrency(dealValue)}</span></div>
                    </div>
                  </div>

                  {/* Agents */}
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold mb-3">Agents</h4>
                    <div className="grid grid-cols-2 gap-6 text-sm">
                      <div>
                        <div className="font-medium mb-2">Listing Side</div>
                        <div><span className="text-muted-foreground">Brokerage:</span> {listingBrokerage?.name || '—'}</div>
                        <div><span className="text-muted-foreground">Agent 1:</span> {listingAgent1?.name || '—'}</div>
                        <div><span className="text-muted-foreground">Agent 2:</span> {listingAgent2?.name || '—'}</div>
                      </div>
                      <div>
                        <div className="font-medium mb-2">Selling Side</div>
                        <div><span className="text-muted-foreground">Brokerage:</span> {sellingBrokerage?.name || '—'}</div>
                        <div><span className="text-muted-foreground">Agent 1:</span> {sellingAgent1?.name || '—'}</div>
                        <div><span className="text-muted-foreground">Agent 2:</span> {sellingAgent2?.name || '—'}</div>
                      </div>
                    </div>
                    {cvAgent && (
                      <div className="mt-3 text-sm">
                        <span className="text-muted-foreground">CV Agent:</span> {cvAgent.name}
                      </div>
                    )}
                  </div>

                  {/* Parties */}
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold mb-3">Parties</h4>
                    <div className="grid grid-cols-2 gap-6 text-sm">
                      <div>
                        <div className="font-medium mb-2">Seller</div>
                        <div><span className="text-muted-foreground">Name:</span> {sellerName || '—'}</div>
                        <div><span className="text-muted-foreground">Brokerage:</span> {sellerBrokerage?.name || '—'}</div>
                      </div>
                      <div>
                        <div className="font-medium mb-2">Buyer</div>
                        <div><span className="text-muted-foreground">Name:</span> {buyerName || '—'}</div>
                        <div><span className="text-muted-foreground">Brokerage:</span> {buyerBrokerage?.name || '—'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Conditions */}
                  {localConditions.length > 0 && (
                    <div className="p-4 bg-muted rounded-lg">
                      <h4 className="font-semibold mb-3">Conditions</h4>
                      <div className="space-y-2 text-sm">
                        {localConditions.filter(c => c.description).map((c, i) => (
                          <div key={i}>
                            {i + 1}. {c.description} {c.due_date && `— Due: ${format(new Date(c.due_date), 'PPP')}`}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Financial Summary */}
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-semibold mb-3">Commission Summary</h4>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="font-medium">Total</div>
                        <div>{formatCurrency(totalWithGST)} (incl. GST)</div>
                      </div>
                      <div>
                        <div className="font-medium">Other Brokerage ({otherBrokeragePercent}%)</div>
                        <div>{formatCurrency(otherCommission + otherGST)}</div>
                      </div>
                      <div>
                        <div className="font-medium">Clearview ({clearviewPercent}%)</div>
                        <div>{formatCurrency(cvCommission + cvGST)}</div>
                      </div>
                    </div>
                  </div>

                  {notes && (
                    <div className="p-4 bg-muted rounded-lg">
                      <h4 className="font-semibold mb-2">Notes</h4>
                      <p className="text-sm">{notes}</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </div>
          </Tabs>

          {/* Footer Actions */}
          <div className="flex justify-end gap-2 p-6 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {currentTab === 'preview' ? (
              <Button onClick={saveAndGenerate} disabled={saving || generating}>
                <Download className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : generating ? 'Generating...' : 'Download PDF'}
              </Button>
            ) : (
              <Button variant="secondary" onClick={() => setCurrentTab('preview')}>
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </Button>
            )}
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
