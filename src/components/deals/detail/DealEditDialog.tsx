import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { useUpdateDeal } from '@/hooks/useDeals';
import type { Deal } from '@/types/database';

interface DealEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal: Deal;
}

const DEAL_STATUSES = ['Conditional', 'Firm', 'Closed'];

export function DealEditDialog({ open, onOpenChange, deal }: DealEditDialogProps) {
  const updateDeal = useUpdateDeal();
  
  const [dealNumber, setDealNumber] = useState(deal.deal_number || '');
  const [status, setStatus] = useState(deal.status);
  const [notes, setNotes] = useState(deal.notes || '');

  // Sync form state when deal changes
  useEffect(() => {
    setDealNumber(deal.deal_number || '');
    setStatus(deal.status);
    setNotes(deal.notes || '');
  }, [deal]);

  const handleSave = async () => {
    try {
      await updateDeal.mutateAsync({
        id: deal.id,
        deal_number: dealNumber || undefined,
        status: status as any,
        notes: notes || undefined,
        // Keep all other fields unchanged
        deal_type: deal.deal_type as any,
        address: deal.address,
        city: deal.city || '',
        submarket: deal.submarket || '',
      });
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Deal - {deal.address}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="deal_number">Deal Number</Label>
            <Input
              id="deal_number"
              value={dealNumber}
              onChange={(e) => setDealNumber(e.target.value)}
              placeholder="Optional"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {DEAL_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes / Comments</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateDeal.isPending}>
            {updateDeal.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
