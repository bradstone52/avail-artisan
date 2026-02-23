import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Download, Plus, Trash2, CalendarIcon, FileCheck } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { pdf } from '@react-pdf/renderer';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { DealSummaryPDF } from '@/components/documents/DealSummaryPDF';
import type { DealSummaryAgent } from '@/components/documents/DealSummaryPDF';
import { useDealDeposits } from '@/hooks/useDealDeposits';
import { useDealSummaryActions } from '@/hooks/useDealSummaryActions';
import { useDealConditions } from '@/hooks/useDealConditions';
import { useDealImportantDates } from '@/hooks/useDealImportantDates';
import type { Deal } from '@/types/database';

interface GenerateDealSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal: Deal;
}

interface LocalDeposit {
  id: string;
  amount: number;
  amountDisplay: string;
  payableTo: string;
  dueDate: Date | undefined;
  dueHour: string;
  dueMinute: string;
  duePeriod: string;
}

interface LocalAction {
  id: string;
  dueDate: Date | undefined;
  dueHour: string;
  dueMinute: string;
  duePeriod: string;
  dateMet: Date | undefined;
  actingParty: string;
  description: string;
}

export function GenerateDealSummaryDialog({ open, onOpenChange, deal }: GenerateDealSummaryDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { deposits: existingDeposits } = useDealDeposits(deal.id);
  const { actions: existingActions, saveActions } = useDealSummaryActions(deal.id);
  const { conditions: existingConditions } = useDealConditions(deal.id);
  const { importantDates: existingImportantDates } = useDealImportantDates(deal.id);
  const [generating, setGenerating] = useState(false);
  const [listingAgents, setListingAgents] = useState<DealSummaryAgent[]>([]);
  const [sellingAgents, setSellingAgents] = useState<DealSummaryAgent[]>([]);

  // Fetch agent details when dialog opens
  useEffect(() => {
    if (!open) return;
    const fetchAgents = async () => {
      const agentIds = [deal.listing_agent1_id, deal.listing_agent2_id, deal.selling_agent1_id, deal.selling_agent2_id].filter(Boolean) as string[];
      const brokerageIds = [deal.listing_brokerage_id, deal.selling_brokerage_id].filter(Boolean) as string[];
      
      let agentsMap: Record<string, any> = {};
      let brokeragesMap: Record<string, any> = {};
      
      if (agentIds.length > 0) {
        const { data } = await supabase.from('agents').select('id, name, email, phone, brokerage_id').in('id', agentIds);
        if (data) data.forEach(a => { agentsMap[a.id] = a; });
      }
      if (brokerageIds.length > 0) {
        const { data } = await supabase.from('brokerages').select('id, name').in('id', brokerageIds);
        if (data) data.forEach(b => { brokeragesMap[b.id] = b; });
      }
      
      const buildAgent = (agentId: string | null, brokerageId: string | null): DealSummaryAgent | null => {
        if (!agentId) return null;
        const a = agentsMap[agentId];
        if (!a) return null;
        const brokerage = a.brokerage_id ? brokeragesMap[a.brokerage_id]?.name : (brokerageId ? brokeragesMap[brokerageId]?.name : undefined);
        return { name: a.name, email: a.email || undefined, phone: a.phone || undefined, brokerage };
      };
      
      setListingAgents([buildAgent(deal.listing_agent1_id, deal.listing_brokerage_id), buildAgent(deal.listing_agent2_id, deal.listing_brokerage_id)].filter(Boolean) as DealSummaryAgent[]);
      setSellingAgents([buildAgent(deal.selling_agent1_id, deal.selling_brokerage_id), buildAgent(deal.selling_agent2_id, deal.selling_brokerage_id)].filter(Boolean) as DealSummaryAgent[]);
    };
    fetchAgents();
  }, [open, deal]);

  // Basic Info state
  const [vendor, setVendor] = useState('Clearview Commercial Realty Inc.');
  const [purchaser, setPurchaser] = useState('');
  const [propertyAddress, setPropertyAddress] = useState('');
  const [propertyCity, setPropertyCity] = useState('');
  const [propertyDescription, setPropertyDescription] = useState('');
  const [effectiveDate, setEffectiveDate] = useState<Date | undefined>(undefined);
  const [closingDate, setClosingDate] = useState<Date | undefined>(undefined);
  const [purchasePrice, setPurchasePrice] = useState('');
  const [purchasePriceDisplay, setPurchasePriceDisplay] = useState('');

  // Deposits state
  const [deposits, setDeposits] = useState<LocalDeposit[]>([]);

  // Actions state
  const [actions, setActions] = useState<LocalAction[]>([]);

  // Local conditions state for live editing
  interface LocalCondition {
    id: string;
    description: string;
    dueDate: Date | undefined;
    isSatisfied: boolean;
  }
  const [localConditions, setLocalConditions] = useState<LocalCondition[]>([]);

  // Format number with commas and 2 decimals for display
  const formatNumberWithCommas = (value: number): string => {
    if (!value || isNaN(value)) return '';
    return new Intl.NumberFormat('en-CA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Parse display string to get raw number
  const parseDisplayToNumber = (display: string): number => {
    const cleaned = display.replace(/[^0-9.]/g, '');
    return parseFloat(cleaned) || 0;
  };

  // Live format currency as user types
  const formatLiveCurrency = (value: string): { display: string; raw: number } => {
    // Remove all non-numeric except decimal
    const cleaned = value.replace(/[^0-9.]/g, '');
    
    // Handle multiple decimals - keep only first
    const parts = cleaned.split('.');
    let normalized = parts[0];
    if (parts.length > 1) {
      normalized += '.' + parts.slice(1).join('').slice(0, 2);
    }
    
    const num = parseFloat(normalized) || 0;
    
    // Format with commas but preserve decimal input
    if (normalized.includes('.')) {
      const [intPart, decPart] = normalized.split('.');
      const formattedInt = intPart ? parseInt(intPart).toLocaleString('en-CA') : '0';
      return { display: `${formattedInt}.${decPart}`, raw: num };
    }
    
    return { 
      display: num ? num.toLocaleString('en-CA') : '', 
      raw: num 
    };
  };

  // Reset and initialize state when dialog opens
  useEffect(() => {
    if (open) {
      setVendor(deal.seller_name || 'Clearview Commercial Realty Inc.');
      // Transfer buyer name from deal (set by Deal Sheet) to Purchaser
      setPurchaser(deal.buyer_name || '');
      setPropertyAddress(deal.address || '');
      setPropertyCity(deal.city || '');
      
      // Build property description from size/acres
      let description = '';
      if (deal.size_sf) {
        const formattedSf = deal.size_sf.toLocaleString();
        const unit = (deal as any).is_land_deal ? 'Ac' : 'SF';
        description = `${formattedSf} ${unit}`;
      }
      setPropertyDescription(description);
      
      setEffectiveDate((deal as any).effective_date ? new Date((deal as any).effective_date + 'T00:00:00') : undefined);
      // Transfer closing date from deal (set by Deal Sheet)
      setClosingDate(deal.close_date ? new Date(deal.close_date + 'T00:00:00') : undefined);
      // Transfer deal value from deal (set by Deal Sheet) to Purchase Price
      const initialPrice = deal.deal_value ? deal.deal_value : 0;
      setPurchasePrice(initialPrice.toString());
      setPurchasePriceDisplay(initialPrice ? formatNumberWithCommas(initialPrice) : '');
      
      // Auto-populate deposits from Deal Sheet if they exist
      if (existingDeposits && existingDeposits.length > 0) {
        setDeposits(existingDeposits.map(d => ({
          id: crypto.randomUUID(),
          amount: d.amount || 0,
          amountDisplay: d.amount ? formatNumberWithCommas(d.amount) : '',
          payableTo: d.held_by || '',
          dueDate: d.due_date ? new Date(d.due_date + 'T00:00:00') : undefined,
          dueHour: '4',
          dueMinute: '00',
          duePeriod: 'PM',
        })));
      } else {
        setDeposits([createEmptyDeposit()]);
      }
      
      // Auto-populate actions from saved data if they exist
      if (existingActions && existingActions.length > 0) {
        setActions(existingActions.map(a => ({
          id: crypto.randomUUID(),
          dueDate: a.due_date ? new Date(a.due_date + 'T00:00:00') : undefined,
          dueHour: a.due_time ? a.due_time.split(':')[0]?.replace(/^0/, '') || '4' : '4',
          dueMinute: a.due_time ? a.due_time.split(':')[1]?.split(' ')[0] || '00' : '00',
          duePeriod: a.due_time?.includes('AM') ? 'AM' : 'PM',
          dateMet: a.date_met ? new Date(a.date_met + 'T00:00:00') : undefined,
          actingParty: a.acting_party || '',
          description: a.description || '',
        })));
      } else {
      // Initialize with one empty action
        setActions([createEmptyAction()]);
      }

      // Auto-populate conditions from existing data
      if (existingConditions && existingConditions.length > 0) {
        setLocalConditions(existingConditions.map(c => ({
          id: crypto.randomUUID(),
          description: c.description,
          dueDate: c.due_date ? new Date(c.due_date + 'T00:00:00') : undefined,
          isSatisfied: c.is_satisfied,
        })));
      } else {
        setLocalConditions([createEmptyCondition()]);
      }
    }
  }, [open, deal, existingDeposits, existingActions, existingConditions]);

  const createEmptyDeposit = (): LocalDeposit => ({
    id: crypto.randomUUID(),
    amount: 0,
    amountDisplay: '',
    payableTo: '',
    dueDate: undefined,
    dueHour: '4',
    dueMinute: '00',
    duePeriod: 'PM',
  });

  const createEmptyCondition = (): LocalCondition => ({
    id: crypto.randomUUID(),
    description: '',
    dueDate: undefined,
    isSatisfied: false,
  });

  const addCondition = () => setLocalConditions([...localConditions, createEmptyCondition()]);
  const removeCondition = (id: string) => {
    if (localConditions.length > 1) setLocalConditions(localConditions.filter(c => c.id !== id));
  };
  const updateCondition = (id: string, updates: Partial<LocalCondition>) => {
    setLocalConditions(localConditions.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const createEmptyAction = (): LocalAction => ({
    id: crypto.randomUUID(),
    dueDate: undefined,
    dueHour: '4',
    dueMinute: '00',
    duePeriod: 'PM',
    dateMet: undefined,
    actingParty: '',
    description: '',
  });

  const formatCurrency = (value: number | string | null | undefined) => {
    const num = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
    if (!num || isNaN(num)) return '$0.00';
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const handlePurchasePriceChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { display, raw } = formatLiveCurrency(e.target.value);
    setPurchasePriceDisplay(display);
    setPurchasePrice(raw.toString());
  }, []);

  const totalDeposits = deposits.reduce((sum, d) => sum + (d.amount || 0), 0);
  const purchasePriceNum = parseFloat(purchasePrice.replace(/,/g, '')) || 0;
  const balanceOnClosing = purchasePriceNum - totalDeposits;

  const addDeposit = () => {
    setDeposits([...deposits, createEmptyDeposit()]);
  };

  const removeDeposit = (id: string) => {
    if (deposits.length > 1) {
      setDeposits(deposits.filter(d => d.id !== id));
    }
  };

  const updateDeposit = (id: string, updates: Partial<LocalDeposit>) => {
    setDeposits(deposits.map(d => d.id === id ? { ...d, ...updates } : d));
  };

  const handleDepositAmountChange = (id: string, value: string) => {
    const { display, raw } = formatLiveCurrency(value);
    updateDeposit(id, { amount: raw, amountDisplay: display });
  };

  const addAction = () => {
    setActions([...actions, createEmptyAction()]);
  };

  const removeAction = (id: string) => {
    if (actions.length > 1) {
      setActions(actions.filter(a => a.id !== id));
    }
  };

  const updateAction = (id: string, updates: Partial<LocalAction>) => {
    setActions(actions.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const handleGeneratePdf = async () => {
    if (!user?.id) {
      toast.error('You must be logged in to generate documents');
      return;
    }
    
    setGenerating(true);
    try {
      // Build PDF data
      const pdfData = {
        vendor,
        purchaser,
        propertyAddress,
        propertyCity,
        propertyDescription,
        effectiveDate: effectiveDate ? format(effectiveDate, 'yyyy-MM-dd') : null,
        closingDate: closingDate ? format(closingDate, 'yyyy-MM-dd') : null,
        purchasePrice: purchasePriceNum,
        deposits: deposits.map((d, i) => ({
          amount: d.amount,
          payable_to: d.payableTo,
          due_date: d.dueDate ? format(d.dueDate, 'yyyy-MM-dd') : '',
          due_time: d.dueHour ? `${d.dueHour}:${d.dueMinute} ${d.duePeriod}` : undefined,
        })),
        actions: actions.filter(a => a.description || a.dueDate).map((a) => ({
          due_date: a.dueDate ? format(a.dueDate, 'yyyy-MM-dd') : '',
          due_time: a.dueHour ? `${a.dueHour}:${a.dueMinute} ${a.duePeriod}` : undefined,
          date_met: a.dateMet ? format(a.dateMet, 'yyyy-MM-dd') : undefined,
          acting_party: a.actingParty,
          action: a.description,
        })),
        balanceOnClosing,
        conditions: localConditions.filter(c => c.description).map(c => ({
          description: c.description,
          due_date: c.dueDate ? format(c.dueDate, 'yyyy-MM-dd') : null,
          is_satisfied: c.isSatisfied,
        })),
        importantDates: (existingImportantDates || []).map(d => ({
          description: d.description,
          due_date: d.due_date,
          is_completed: d.is_completed,
        })),
        listingAgents,
        sellingAgents,
        usePurchaserVendor: !!(deal as any).use_purchaser_vendor,
        sellerLawyer: {
          name: deal.seller_lawyer_name,
          firm: deal.seller_lawyer_firm,
          phone: deal.seller_lawyer_phone,
          email: deal.seller_lawyer_email,
        },
        buyerLawyer: {
          name: deal.buyer_lawyer_name,
          firm: deal.buyer_lawyer_firm,
          phone: deal.buyer_lawyer_phone,
          email: deal.buyer_lawyer_email,
        },
        contacts: [],
      };

      // Save deposits to database for Important Dates tracking
      // Delete existing deposits first, then insert new ones
      await supabase
        .from('deal_deposits')
        .delete()
        .eq('deal_id', deal.id);

      const depositsWithAmounts = deposits.filter(d => d.amount > 0);
      if (depositsWithAmounts.length > 0) {
        const depositsToSave = depositsWithAmounts.map(d => ({
          deal_id: deal.id,
          amount: d.amount,
          held_by: d.payableTo || null,
          due_date: d.dueDate ? format(d.dueDate, 'yyyy-MM-dd') : null,
          due_time: d.dueHour ? `${d.dueHour}:${d.dueMinute} ${d.duePeriod}` : null,
          received: false,
        }));

        const { error: depositError } = await supabase
          .from('deal_deposits')
          .insert(depositsToSave);

        if (depositError) {
          console.error('Error saving deposits:', depositError);
          // Continue with PDF generation even if deposit save fails
        }
      }

      // Save actions to database for future regeneration
      const actionsToSave = actions.filter(a => a.description || a.dueDate).map((a, index) => ({
        deal_id: deal.id,
        due_date: a.dueDate ? format(a.dueDate, 'yyyy-MM-dd') : null,
        due_time: a.dueHour ? `${a.dueHour}:${a.dueMinute} ${a.duePeriod}` : null,
        date_met: a.dateMet ? format(a.dateMet, 'yyyy-MM-dd') : null,
        acting_party: a.actingParty || null,
        description: a.description,
        sort_order: index,
      }));
      
      await saveActions(actionsToSave);

      // Invalidate queries to refresh important dates
      queryClient.invalidateQueries({ queryKey: ['deal_deposits', deal.id] });
      queryClient.invalidateQueries({ queryKey: ['deal_summary_actions', deal.id] });
      queryClient.invalidateQueries({ queryKey: ['all_deal_important_dates'] });

      const blob = await pdf(<DealSummaryPDF {...pdfData} />).toBlob();
      
      // Save to documents section
      const fileName = `Deal Summary - ${deal.address}.pdf`;
      const filePath = `${deal.id}/${Date.now()}-deal-summary.pdf`;
      
      // Delete any existing Deal Summary for this deal
      const { data: existingDocs } = await supabase
        .from('deal_documents')
        .select('id, file_path')
        .eq('deal_id', deal.id)
        .ilike('name', '%Deal Summary%');
      
      if (existingDocs && existingDocs.length > 0) {
        // Delete old files from storage
        const pathsToDelete = existingDocs.map(doc => doc.file_path);
        await supabase.storage.from('deals').remove(pathsToDelete);
        
        // Delete old records from database
        const idsToDelete = existingDocs.map(doc => doc.id);
        await supabase.from('deal_documents').delete().in('id', idsToDelete);
      }
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('deals')
        .upload(filePath, blob, { contentType: 'application/pdf' });
      
      if (uploadError) throw uploadError;
      
      // Save to deal_documents
      const { error: dbError } = await supabase
        .from('deal_documents')
        .insert({
          deal_id: deal.id,
          name: fileName,
          file_path: filePath,
          file_size: blob.size,
          uploaded_by: user.id,
        });
      
      if (dbError) throw dbError;
      
      // Invalidate documents query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['deal_documents', deal.id] });
      
      // Also download the file
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Deal Summary saved to documents and downloaded');
      onOpenChange(false);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setGenerating(false);
    }
  };

  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
  const minutes = ['00', '15', '30', '45'];

  // Render deposits list - conditionally wrapped in ScrollArea
  const depositsContent = (
    <div className="space-y-2">
      {deposits.map((deposit, index) => (
        <Card key={deposit.id}>
          <CardContent className="p-3 space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-medium text-sm">
                {index === 0 ? 'First Deposit' : index === 1 ? 'Second Deposit' : index === 2 ? 'Third Deposit' : `Deposit ${index + 1}`}
              </span>
              {deposits.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => removeDeposit(deposit.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input 
                    value={deposit.amountDisplay}
                    onChange={(e) => handleDepositAmountChange(deposit.id, e.target.value)}
                    className="pl-7 h-8 text-sm"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Payable To</Label>
                <Input 
                  value={deposit.payableTo}
                  onChange={(e) => updateDeposit(deposit.id, { payableTo: e.target.value })}
                  placeholder="e.g., Seller's Lawyer"
                  className="h-8 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal h-8 text-sm",
                        !deposit.dueDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                      {deposit.dueDate ? format(deposit.dueDate, "yyyy-MM-dd") : "yyyy - mm - dd"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={deposit.dueDate}
                      onSelect={(date) => updateDeposit(deposit.id, { dueDate: date })}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Due Time</Label>
                <div className="flex gap-1">
                  <Select 
                    value={deposit.dueHour} 
                    onValueChange={(v) => updateDeposit(deposit.id, { dueHour: v })}
                  >
                    <SelectTrigger className="w-[72px] h-8 text-sm">
                      <SelectValue placeholder="Hr" />
                    </SelectTrigger>
                    <SelectContent>
                      {hours.map(h => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select 
                    value={deposit.dueMinute} 
                    onValueChange={(v) => updateDeposit(deposit.id, { dueMinute: v })}
                  >
                    <SelectTrigger className="w-[72px] h-8 text-sm">
                      <SelectValue placeholder=":00" />
                    </SelectTrigger>
                    <SelectContent>
                      {minutes.map(m => (
                        <SelectItem key={m} value={m}>:{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select 
                    value={deposit.duePeriod} 
                    onValueChange={(v) => updateDeposit(deposit.id, { duePeriod: v })}
                  >
                    <SelectTrigger className="w-[72px] h-8 text-sm">
                      <SelectValue placeholder="PM" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AM">AM</SelectItem>
                      <SelectItem value="PM">PM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <Button 
        variant="outline" 
        onClick={addDeposit}
        className="w-full h-8 text-sm"
      >
        <Plus className="h-3.5 w-3.5 mr-1" />
        ADD DEPOSIT
      </Button>
    </div>
  );

  // Render actions list - conditionally wrapped in ScrollArea
  const actionsContent = (
    <div className="space-y-2">
      {actions.map((action, index) => (
        <Card key={action.id}>
          <CardContent className="p-3 space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-medium text-sm">Action {index + 1}</span>
              {actions.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => removeAction(action.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal h-8 text-sm",
                        !action.dueDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                      {action.dueDate ? format(action.dueDate, "yyyy-MM-dd") : "yyyy - mm - dd"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={action.dueDate}
                      onSelect={(date) => updateAction(action.id, { dueDate: date })}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Due Time</Label>
                <div className="flex gap-1">
                  <Select 
                    value={action.dueHour} 
                    onValueChange={(v) => updateAction(action.id, { dueHour: v })}
                  >
                    <SelectTrigger className="w-[72px] h-8 text-sm">
                      <SelectValue placeholder="Hr" />
                    </SelectTrigger>
                    <SelectContent>
                      {hours.map(h => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select 
                    value={action.dueMinute} 
                    onValueChange={(v) => updateAction(action.id, { dueMinute: v })}
                  >
                    <SelectTrigger className="w-[72px] h-8 text-sm">
                      <SelectValue placeholder=":00" />
                    </SelectTrigger>
                    <SelectContent>
                      {minutes.map(m => (
                        <SelectItem key={m} value={m}>:{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select 
                    value={action.duePeriod} 
                    onValueChange={(v) => updateAction(action.id, { duePeriod: v })}
                  >
                    <SelectTrigger className="w-[72px] h-8 text-sm">
                      <SelectValue placeholder="PM" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AM">AM</SelectItem>
                      <SelectItem value="PM">PM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Date Met</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal h-8 text-sm",
                        !action.dateMet && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                      {action.dateMet ? format(action.dateMet, "yyyy-MM-dd") : "yyyy - mm - dd"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={action.dateMet}
                      onSelect={(date) => updateAction(action.id, { dateMet: date })}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Acting Party</Label>
                <Select 
                  value={action.actingParty} 
                  onValueChange={(v) => updateAction(action.id, { actingParty: v })}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Select party" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Vendor">Vendor</SelectItem>
                    <SelectItem value="Purchaser">Purchaser</SelectItem>
                    <SelectItem value="Both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Action Description</Label>
              <Textarea 
                value={action.description}
                onChange={(e) => updateAction(action.id, { description: e.target.value })}
                placeholder="e.g., Waiver of Conditions"
                className="min-h-[40px] text-sm"
              />
            </div>
          </CardContent>
        </Card>
      ))}

      <Button 
        variant="outline" 
        onClick={addAction}
        className="w-full h-8 text-sm"
      >
        <Plus className="h-3.5 w-3.5 mr-1" />
        ADD ACTION
      </Button>
    </div>
  );

  // Safety: ensure scroll lock is removed when dialog closes
  useEffect(() => {
    if (!open) {
      // Remove any stale scroll locks from Radix Dialog
      document.body.style.pointerEvents = '';
      document.body.style.overflow = '';
      const scrollLocked = document.querySelector('[data-scroll-locked]');
      if (scrollLocked) {
        scrollLocked.removeAttribute('data-scroll-locked');
        (scrollLocked as HTMLElement).style.pointerEvents = '';
        (scrollLocked as HTMLElement).style.overflow = '';
      }
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Generate Deal Summary</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basic" className="flex-1 flex flex-col min-h-0">
          <TabsList className="w-full grid grid-cols-3 h-9 border-0 shadow-none bg-muted/50">
            <TabsTrigger value="basic" className="text-xs data-[state=active]:shadow-none data-[state=active]:border data-[state=active]:border-border">Basic Info</TabsTrigger>
            <TabsTrigger value="deposits" className="text-xs data-[state=active]:shadow-none data-[state=active]:border data-[state=active]:border-border">Deposits</TabsTrigger>
            <TabsTrigger value="conditions" className="text-xs data-[state=active]:shadow-none data-[state=active]:border data-[state=active]:border-border">Conditions</TabsTrigger>
          </TabsList>

          <div className="flex-1 mt-3 overflow-y-auto min-h-0">
            {/* Basic Info Tab */}
            <TabsContent value="basic" className="space-y-2 m-0">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">{(deal as any).use_purchaser_vendor ? 'Vendor' : 'Seller'}</Label>
                  <Input 
                    value={vendor} 
                    onChange={(e) => setVendor(e.target.value)}
                    placeholder={`${(deal as any).use_purchaser_vendor ? 'Vendor' : 'Seller'} name`}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{(deal as any).use_purchaser_vendor ? 'Purchaser' : 'Buyer'}</Label>
                  <Input 
                    value={purchaser}
                    onChange={(e) => setPurchaser(e.target.value)}
                    placeholder={`${(deal as any).use_purchaser_vendor ? 'Purchaser' : 'Buyer'} name`}
                    className="h-8 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Property Address</Label>
                  <Input 
                    value={propertyAddress}
                    onChange={(e) => setPropertyAddress(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Property Description</Label>
                  <Input 
                    value={propertyDescription}
                    onChange={(e) => setPropertyDescription(e.target.value)}
                    placeholder="e.g., 100,000 SF on 2.2 AC"
                    className="h-8 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Effective Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal h-8 text-sm",
                          !effectiveDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                        {effectiveDate ? format(effectiveDate, "yyyy-MM-dd") : "yyyy - mm - dd"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={effectiveDate}
                        onSelect={setEffectiveDate}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Closing Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal h-8 text-sm",
                          !closingDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                        {closingDate ? format(closingDate, "yyyy-MM-dd") : "yyyy - mm - dd"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={closingDate}
                        onSelect={setClosingDate}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Purchase Price</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input 
                    value={purchasePriceDisplay}
                    onChange={handlePurchasePriceChange}
                    className="pl-7 h-8 text-sm"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Deposits Tab */}
            <TabsContent value="deposits" className="m-0 h-full">
              {deposits.length > 1 ? (
                <ScrollArea className="h-[300px] pr-3">
                  {depositsContent}
                </ScrollArea>
              ) : (
                <div className="pr-3">{depositsContent}</div>
              )}

              <div className="space-y-1 pt-3 border-t mt-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Deposits:</span>
                  <span>{formatCurrency(totalDeposits)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Purchase Price:</span>
                  <span>{formatCurrency(purchasePriceNum)}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Balance on Closing:</span>
                  <span className="text-primary">{formatCurrency(balanceOnClosing)}</span>
                </div>
              </div>
            </TabsContent>

            {/* Conditions Tab */}
            <TabsContent value="conditions" className="m-0 h-full">
              <p className="text-xs text-muted-foreground mb-2">
                Edit conditions that will appear on the Deal Summary.
              </p>
              <div className="space-y-2">
                {localConditions.map((condition, index) => (
                  <Card key={condition.id}>
                    <CardContent className="p-3 space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={condition.isSatisfied}
                            onCheckedChange={(checked) => updateCondition(condition.id, { isSatisfied: !!checked })}
                          />
                          <span className="font-medium text-sm">
                            Condition {index + 1} {condition.isSatisfied ? '(Satisfied)' : ''}
                          </span>
                        </div>
                        {localConditions.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => removeCondition(condition.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Description</Label>
                          <Input
                            value={condition.description}
                            onChange={(e) => updateCondition(condition.id, { description: e.target.value })}
                            placeholder="Enter condition description..."
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Removal Date</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal h-8 text-sm",
                                  !condition.dueDate && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                                {condition.dueDate ? format(condition.dueDate, "yyyy-MM-dd") : "yyyy - mm - dd"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={condition.dueDate}
                                onSelect={(date) => updateCondition(condition.id, { dueDate: date })}
                                initialFocus
                                className="pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Button variant="outline" onClick={addCondition} className="w-full h-8 text-sm">
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  ADD CONDITION
                </Button>
              </div>
            </TabsContent>

          </div>
        </Tabs>

        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            CANCEL
          </Button>
          <Button size="sm" onClick={handleGeneratePdf} disabled={generating}>
            <Download className="w-3.5 h-3.5 mr-1.5" />
            {generating ? 'Generating...' : 'GENERATE & DOWNLOAD'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
