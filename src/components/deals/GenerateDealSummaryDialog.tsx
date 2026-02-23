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
import { Download, Plus, Trash2, CalendarIcon } from 'lucide-react';
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
  const [propertyDescription, setPropertyDescription] = useState('');
  const [effectiveDate, setEffectiveDate] = useState<Date | undefined>(undefined);
  const [closingDate, setClosingDate] = useState<Date | undefined>(undefined);
  const [purchasePrice, setPurchasePrice] = useState('');
  const [purchasePriceDisplay, setPurchasePriceDisplay] = useState('');

  // Deposits state
  const [deposits, setDeposits] = useState<LocalDeposit[]>([]);

  // Actions state
  const [actions, setActions] = useState<LocalAction[]>([]);

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
    }
  }, [open, deal, existingDeposits, existingActions]);

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
        conditions: (existingConditions || []).map(c => ({
          description: c.description,
          due_date: c.due_date,
          is_satisfied: c.is_satisfied,
        })),
        importantDates: (existingImportantDates || []).map(d => ({
          description: d.description,
          due_date: d.due_date,
          is_completed: d.is_completed,
        })),
        listingAgents,
        sellingAgents,
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
    <div className="space-y-4">
      {deposits.map((deposit, index) => (
        <Card key={deposit.id}>
          <CardContent className="p-4 space-y-4">
            <div className="flex justify-between items-center">
              <span className="font-medium">
                {index === 0 ? 'First Deposit' : index === 1 ? 'Second Deposit' : index === 2 ? 'Third Deposit' : `Deposit ${index + 1}`}
              </span>
              {deposits.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeDeposit(deposit.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input 
                    value={deposit.amountDisplay}
                    onChange={(e) => handleDepositAmountChange(deposit.id, e.target.value)}
                    className="pl-7"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Payable To</Label>
                <Input 
                  value={deposit.payableTo}
                  onChange={(e) => updateDeposit(deposit.id, { payableTo: e.target.value })}
                  placeholder="e.g., Seller's Lawyer"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !deposit.dueDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
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
              <div className="space-y-2">
                <Label>Due Time</Label>
                <div className="flex gap-2">
                  <Select 
                    value={deposit.dueHour} 
                    onValueChange={(v) => updateDeposit(deposit.id, { dueHour: v })}
                  >
                    <SelectTrigger className="w-[70px]">
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
                    <SelectTrigger className="w-[70px]">
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
                    <SelectTrigger className="w-[70px]">
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
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        ADD DEPOSIT
      </Button>
    </div>
  );

  // Render actions list - conditionally wrapped in ScrollArea
  const actionsContent = (
    <div className="space-y-4">
      {actions.map((action, index) => (
        <Card key={action.id}>
          <CardContent className="p-4 space-y-4">
            <div className="flex justify-between items-center">
              <span className="font-medium">Action {index + 1}</span>
              {actions.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeAction(action.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !action.dueDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
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
              <div className="space-y-2">
                <Label>Due Time</Label>
                <div className="flex gap-2">
                  <Select 
                    value={action.dueHour} 
                    onValueChange={(v) => updateAction(action.id, { dueHour: v })}
                  >
                    <SelectTrigger className="w-[70px]">
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
                    <SelectTrigger className="w-[70px]">
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
                    <SelectTrigger className="w-[70px]">
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date Met</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !action.dateMet && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
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
              <div className="space-y-2">
                <Label>Acting Party</Label>
                <Select 
                  value={action.actingParty} 
                  onValueChange={(v) => updateAction(action.id, { actingParty: v })}
                >
                  <SelectTrigger>
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

            <div className="space-y-2">
              <Label>Action Description</Label>
              <Textarea 
                value={action.description}
                onChange={(e) => updateAction(action.id, { description: e.target.value })}
                placeholder="e.g., Waiver of Conditions"
                className="min-h-[60px]"
              />
            </div>
          </CardContent>
        </Card>
      ))}

      <Button 
        variant="outline" 
        onClick={addAction}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
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
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="deposits">Deposits</TabsTrigger>
          </TabsList>

          <div className="flex-1 mt-4 overflow-y-auto min-h-0">
            {/* Basic Info Tab */}
            <TabsContent value="basic" className="space-y-4 m-0">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Vendor</Label>
                  <Input 
                    value={vendor} 
                    onChange={(e) => setVendor(e.target.value)}
                    placeholder="Vendor name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Purchaser</Label>
                  <Input 
                    value={purchaser}
                    onChange={(e) => setPurchaser(e.target.value)}
                    placeholder="Buyer/Purchaser name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Property Address</Label>
                <Input 
                  value={propertyAddress}
                  onChange={(e) => setPropertyAddress(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Property Description</Label>
                <Input 
                  value={propertyDescription}
                  onChange={(e) => setPropertyDescription(e.target.value)}
                  placeholder="e.g., 100,000 SF on 2.2 AC"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Effective Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !effectiveDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
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
                <div className="space-y-2">
                  <Label>Closing Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !closingDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
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

              <div className="space-y-2">
                <Label>Purchase Price</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input 
                    value={purchasePriceDisplay}
                    onChange={handlePurchasePriceChange}
                    className="pl-7"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Deposits Tab */}
            <TabsContent value="deposits" className="m-0 h-full">
              {deposits.length > 1 ? (
                <ScrollArea className="h-[350px] pr-4">
                  {depositsContent}
                </ScrollArea>
              ) : (
                <div className="pr-4">{depositsContent}</div>
              )}

              <div className="space-y-2 pt-4 border-t mt-4">
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

          </div>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            CANCEL
          </Button>
          <Button onClick={handleGeneratePdf} disabled={generating}>
            <Download className="w-4 h-4 mr-2" />
            {generating ? 'Generating...' : 'GENERATE & DOWNLOAD'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
