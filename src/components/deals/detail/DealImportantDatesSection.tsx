import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, AlertCircle, Plus, Trash2, Check } from 'lucide-react';
import { format, isBefore } from 'date-fns';
import type { Deal } from '@/types/database';
import type { DealCondition } from '@/hooks/useDealConditions';
import type { DealDeposit } from '@/hooks/useDealDeposits';
import type { DealSummaryAction } from '@/hooks/useDealSummaryActions';
import { FormattedNumberInput } from '@/components/common/FormattedNumberInput';

interface DealImportantDatesSectionProps {
  deal: Deal;
  conditions: DealCondition[];
  deposits: DealDeposit[];
  actions?: DealSummaryAction[];
  onAddCondition?: (condition: { description: string; due_date?: string }) => Promise<void>;
  onUpdateCondition?: (id: string, updates: Partial<DealCondition>) => Promise<void>;
  onDeleteCondition?: (id: string) => Promise<void>;
  onAddDeposit?: (deposit: { amount: number; held_by?: string; due_date?: string }) => Promise<void>;
  onUpdateDeposit?: (id: string, updates: Partial<DealDeposit>) => Promise<void>;
  onDeleteDeposit?: (id: string) => Promise<void>;
}

type AddType = 'condition' | 'deposit' | null;

export function DealImportantDatesSection({ 
  deal, conditions, deposits, actions = [],
  onAddCondition, onUpdateCondition, onDeleteCondition,
  onAddDeposit, onUpdateDeposit, onDeleteDeposit,
}: DealImportantDatesSectionProps) {
  const today = new Date();
  const [addType, setAddType] = useState<AddType>(null);
  
  // Condition form state
  const [condDescription, setCondDescription] = useState('');
  const [condDueDate, setCondDueDate] = useState('');
  
  // Deposit form state
  const [depAmount, setDepAmount] = useState<number | null>(null);
  const [depHeldBy, setDepHeldBy] = useState('');
  const [depDueDate, setDepDueDate] = useState('');

  const resetForm = () => {
    setAddType(null);
    setCondDescription('');
    setCondDueDate('');
    setDepAmount(null);
    setDepHeldBy('');
    setDepDueDate('');
  };

  const handleAddCondition = async () => {
    if (!onAddCondition || !condDescription) return;
    await onAddCondition({ description: condDescription, due_date: condDueDate || undefined });
    resetForm();
  };

  const handleAddDeposit = async () => {
    if (!onAddDeposit || !depAmount) return;
    await onAddDeposit({ amount: depAmount, held_by: depHeldBy || undefined, due_date: depDueDate || undefined });
    resetForm();
  };

  // Gather all important dates
  const importantDates: { id: string; date: Date; label: string; type: 'condition' | 'deposit' | 'closing' | 'action'; isPast: boolean; sourceId?: string; isSatisfied?: boolean }[] = [];

  conditions.forEach((c, index) => {
    if (c.due_date) {
      const date = new Date(c.due_date);
      importantDates.push({
        id: c.id,
        date,
        label: `Condition ${index + 1} - ${c.description}`,
        type: 'condition',
        isPast: isBefore(date, today) && !c.is_satisfied,
        sourceId: c.id,
        isSatisfied: c.is_satisfied,
      });
    }
  });

  deposits.forEach((d) => {
    if (d.due_date) {
      const date = new Date(d.due_date);
      importantDates.push({
        id: d.id,
        date,
        label: `Deposit: $${d.amount.toLocaleString()} ${d.held_by ? `(${d.held_by})` : ''}`,
        type: 'deposit',
        isPast: isBefore(date, today) && !d.received,
        sourceId: d.id,
        isSatisfied: d.received,
      });
    }
  });

  actions.forEach((a) => {
    if (a.due_date && !a.date_met) {
      const date = new Date(a.due_date);
      importantDates.push({
        id: a.id,
        date,
        label: `Action: ${a.description}${a.acting_party ? ` (${a.acting_party})` : ''}`,
        type: 'action',
        isPast: isBefore(date, today),
      });
    }
  });

  if (deal.close_date) {
    const date = new Date(deal.close_date);
    importantDates.push({
      id: 'closing',
      date,
      label: 'Closing Date',
      type: 'closing',
      isPast: isBefore(date, today),
    });
  }

  importantDates.sort((a, b) => a.date.getTime() - b.date.getTime());

  const handleToggleSatisfied = async (item: typeof importantDates[0]) => {
    if (item.type === 'condition' && item.sourceId && onUpdateCondition) {
      await onUpdateCondition(item.sourceId, { is_satisfied: !item.isSatisfied });
    } else if (item.type === 'deposit' && item.sourceId && onUpdateDeposit) {
      await onUpdateDeposit(item.sourceId, { received: !item.isSatisfied });
    }
  };

  const handleDelete = async (item: typeof importantDates[0]) => {
    if (item.type === 'condition' && item.sourceId && onDeleteCondition) {
      await onDeleteCondition(item.sourceId);
    } else if (item.type === 'deposit' && item.sourceId && onDeleteDeposit) {
      await onDeleteDeposit(item.sourceId);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Important Dates
          </CardTitle>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={() => setAddType('condition')}>
              <Plus className="w-4 h-4 mr-1" />
              Condition
            </Button>
            <Button size="sm" variant="outline" onClick={() => setAddType('deposit')}>
              <Plus className="w-4 h-4 mr-1" />
              Deposit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {importantDates.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No important dates. Add conditions or deposits to track important deadlines.
            </p>
          ) : (
            <div className="space-y-2">
              {importantDates.map((d) => (
                <div 
                  key={d.id} 
                  className={`flex items-center text-sm p-2 rounded ${
                    d.isSatisfied ? 'bg-muted/30 line-through opacity-60' :
                    d.isPast ? 'bg-destructive/10 text-destructive' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {d.isPast && !d.isSatisfied && <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                    <span className="truncate flex-1">{d.label}</span>
                    <span className="text-muted-foreground mx-2 flex-shrink-0">—</span>
                    <span className="font-medium flex-shrink-0">{format(d.date, 'MMM d, yyyy')}</span>
                  </div>
                  {(d.type === 'condition' || d.type === 'deposit') && d.sourceId && (
                    <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title={d.isSatisfied ? 'Mark as pending' : 'Mark as satisfied'}
                        onClick={() => handleToggleSatisfied(d)}
                      >
                        <Check className={`w-4 h-4 ${d.isSatisfied ? 'text-green-600' : 'text-muted-foreground'}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(d)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Condition Dialog */}
      <Dialog open={addType === 'condition'} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Condition</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={condDescription}
                onChange={(e) => setCondDescription(e.target.value)}
                placeholder="e.g. Financing, Inspection..."
              />
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={condDueDate}
                onChange={(e) => setCondDueDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
            <Button onClick={handleAddCondition} disabled={!condDescription}>Add Condition</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Deposit Dialog */}
      <Dialog open={addType === 'deposit'} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Deposit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Amount ($)</Label>
              <FormattedNumberInput
                value={depAmount}
                onChange={setDepAmount}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Held By</Label>
              <Input
                value={depHeldBy}
                onChange={(e) => setDepHeldBy(e.target.value)}
                placeholder="e.g. Seller's Brokerage"
              />
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={depDueDate}
                onChange={(e) => setDepDueDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
            <Button onClick={handleAddDeposit} disabled={!depAmount}>Add Deposit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
