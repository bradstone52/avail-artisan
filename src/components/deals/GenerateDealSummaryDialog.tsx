import { useState, useEffect } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Download, ArrowLeft, Info, DollarSign, Play } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { pdf } from '@react-pdf/renderer';
import { supabase } from '@/integrations/supabase/client';
import { useDealDeposits } from '@/hooks/useDealDeposits';
import { DealSummaryPDF } from '@/components/documents/DealSummaryPDF';
import type { Deal, DealDeposit } from '@/types/database';

interface GenerateDealSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal: Deal;
}

export function GenerateDealSummaryDialog({ open, onOpenChange, deal }: GenerateDealSummaryDialogProps) {
  const { deposits } = useDealDeposits(deal.id);
  const [viewState, setViewState] = useState<'form' | 'preview'>('form');
  const [generating, setGenerating] = useState(false);
  const [generationDate] = useState(format(new Date(), 'MMM d, yyyy'));

  // Local state for deposits
  const [localDeposits, setLocalDeposits] = useState<DealDeposit[]>([]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setViewState('form');
      setLocalDeposits(deposits || []);
    }
  }, [open, deposits]);

  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return '—';
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleGeneratePdf = async () => {
    setGenerating(true);
    try {
      const blob = await pdf(<DealSummaryPDF deal={deal} deposits={localDeposits} />).toBlob();
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Deal Summary - ${deal.address}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Deal Summary PDF generated successfully');
      onOpenChange(false);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setGenerating(false);
    }
  };

  const toggleDepositReceived = (depositId: string) => {
    setLocalDeposits(prev => 
      prev.map(d => d.id === depositId ? { ...d, received: !d.received } : d)
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Generate Deal Summary</DialogTitle>
        </DialogHeader>

        {viewState === 'form' ? (
          <>
            <Tabs defaultValue="basic" className="flex-1">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="basic" className="gap-2">
                  <Info className="w-4 h-4" />
                  Basic Info
                </TabsTrigger>
                <TabsTrigger value="deposits" className="gap-2">
                  <DollarSign className="w-4 h-4" />
                  Deposits
                </TabsTrigger>
                <TabsTrigger value="actions" className="gap-2">
                  <Play className="w-4 h-4" />
                  Actions
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="h-[400px] mt-4">
                <TabsContent value="basic" className="space-y-4 pr-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input value={generationDate} disabled className="bg-muted" />
                    </div>
                    <div className="space-y-2">
                      <Label>Deal Type</Label>
                      <Input value={deal.deal_type} disabled className="bg-muted" />
                    </div>
                    <div className="space-y-2">
                      <Label>Address</Label>
                      <Input value={deal.address} disabled className="bg-muted" />
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Input value={deal.status} disabled className="bg-muted" />
                    </div>
                    <div className="space-y-2">
                      <Label>Deal Value</Label>
                      <Input value={formatCurrency(deal.deal_value)} disabled className="bg-muted" />
                    </div>
                    <div className="space-y-2">
                      <Label>Close Date</Label>
                      <Input 
                        value={deal.close_date ? format(new Date(deal.close_date), 'MMM d, yyyy') : '—'} 
                        disabled 
                        className="bg-muted" 
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="deposits" className="space-y-4 pr-4">
                  {localDeposits.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No deposits configured for this deal.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {localDeposits.map((deposit, index) => (
                        <Card key={deposit.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">Deposit {index + 1}</p>
                                <p className="text-sm text-muted-foreground">
                                  {formatCurrency(deposit.amount)}
                                  {deposit.due_date && ` — Due: ${format(new Date(deposit.due_date), 'MMM d, yyyy')}`}
                                </p>
                                {deposit.held_by && (
                                  <p className="text-xs text-muted-foreground">Held by: {deposit.held_by}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id={`received-${deposit.id}`}
                                  checked={deposit.received}
                                  onCheckedChange={() => toggleDepositReceived(deposit.id)}
                                />
                                <Label htmlFor={`received-${deposit.id}`} className="text-sm">
                                  Received
                                </Label>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="actions" className="space-y-4 pr-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Generate Options</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Review the deal information and deposits, then click "Show Preview" to see the summary before generating the PDF.
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{deal.deal_type}</Badge>
                        <Badge variant={deal.status === 'Closed' ? 'default' : 'secondary'}>
                          {deal.status}
                        </Badge>
                        {localDeposits.length > 0 && (
                          <Badge variant="outline">
                            {localDeposits.filter(d => d.received).length}/{localDeposits.length} deposits received
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </ScrollArea>
            </Tabs>

            <Separator className="my-4" />
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={() => setViewState('preview')}>
                Show Preview
              </Button>
            </div>
          </>
        ) : (
          <>
            <ScrollArea className="h-[450px]">
              <div className="space-y-4 pr-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Deal Summary Preview</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Address</p>
                        <p className="font-medium">{deal.address}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Deal Type</p>
                        <p className="font-medium">{deal.deal_type}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <Badge variant={deal.status === 'Closed' ? 'default' : 'secondary'}>
                          {deal.status}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Deal Value</p>
                        <p className="font-medium">{formatCurrency(deal.deal_value)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Close Date</p>
                        <p className="font-medium">
                          {deal.close_date ? format(new Date(deal.close_date), 'MMM d, yyyy') : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">City</p>
                        <p className="font-medium">{deal.city || '—'}</p>
                      </div>
                    </div>

                    {localDeposits.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <p className="text-sm font-medium mb-2">Deposits</p>
                          <div className="space-y-2">
                            {localDeposits.map((deposit, index) => (
                              <div key={deposit.id} className="flex items-center justify-between text-sm">
                                <span>Deposit {index + 1}: {formatCurrency(deposit.amount)}</span>
                                <Badge variant={deposit.received ? 'default' : 'outline'}>
                                  {deposit.received ? 'Received' : 'Pending'}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>

            <Separator className="my-4" />

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setViewState('form')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Edit
              </Button>
              <Button onClick={handleGeneratePdf} disabled={generating}>
                <Download className="w-4 h-4 mr-2" />
                {generating ? 'Generating...' : 'Generate PDF'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
