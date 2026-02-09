import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Calendar, AlertCircle, Plus, Trash2, Check, CalendarPlus, Pencil } from 'lucide-react';
import { format, isBefore } from 'date-fns';
import type { Deal } from '@/types/database';
import type { DealCondition } from '@/hooks/useDealConditions';
import type { DealDeposit } from '@/hooks/useDealDeposits';
import type { DealSummaryAction } from '@/hooks/useDealSummaryActions';
import type { DealImportantDate } from '@/hooks/useDealImportantDates';
import { FormattedNumberInput } from '@/components/common/FormattedNumberInput';

interface DealImportantDatesSectionProps {
  deal: Deal;
  conditions: DealCondition[];
  deposits: DealDeposit[];
  actions?: DealSummaryAction[];
  genericDates?: DealImportantDate[];
  onAddCondition?: (condition: { description: string; due_date?: string }) => Promise<void>;
  onUpdateCondition?: (id: string, updates: Partial<DealCondition>) => Promise<void>;
  onDeleteCondition?: (id: string) => Promise<void>;
  onAddDeposit?: (deposit: { amount: number; held_by?: string; due_date?: string }) => Promise<void>;
  onUpdateDeposit?: (id: string, updates: Partial<DealDeposit>) => Promise<void>;
  onDeleteDeposit?: (id: string) => Promise<void>;
  onAddGenericDate?: (item: { description: string; due_date?: string }) => Promise<void>;
  onUpdateGenericDate?: (id: string, updates: Partial<DealImportantDate>) => Promise<void>;
  onDeleteGenericDate?: (id: string) => Promise<void>;
}

type AddType = 'condition' | 'deposit' | 'date' | null;

export function DealImportantDatesSection({ 
  deal, conditions, deposits, actions = [], genericDates = [],
  onAddCondition, onUpdateCondition, onDeleteCondition,
  onAddDeposit, onUpdateDeposit, onDeleteDeposit,
  onAddGenericDate, onUpdateGenericDate, onDeleteGenericDate,
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

  // Generic date form state
  const [genDescription, setGenDescription] = useState('');
  const [genDueDate, setGenDueDate] = useState('');

  type DateItem = { id: string; date: Date; label: string; type: 'condition' | 'deposit' | 'closing' | 'action' | 'generic'; isPast: boolean; sourceId?: string; isSatisfied?: boolean };

  // Edit state
  const [editingItem, setEditingItem] = useState<DateItem | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editAmount, setEditAmount] = useState<number | null>(null);
  const [editHeldBy, setEditHeldBy] = useState('');

  const resetForm = () => {
    setAddType(null);
    setCondDescription('');
    setCondDueDate('');
    setDepAmount(null);
    setDepHeldBy('');
    setDepDueDate('');
    setGenDescription('');
    setGenDueDate('');
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

  const handleAddGenericDate = async () => {
    if (!onAddGenericDate || !genDescription) return;
    await onAddGenericDate({ description: genDescription, due_date: genDueDate || undefined });
    resetForm();
  };

  const openEdit = (item: DateItem) => {
    setEditingItem(item);
    if (item.type === 'condition') {
      const cond = conditions.find(c => c.id === item.sourceId);
      setEditDescription(cond?.description || '');
      setEditDueDate(cond?.due_date || '');
    } else if (item.type === 'deposit') {
      const dep = deposits.find(d => d.id === item.sourceId);
      setEditAmount(dep?.amount ?? null);
      setEditHeldBy(dep?.held_by || '');
      setEditDueDate(dep?.due_date || '');
    } else if (item.type === 'generic') {
      const gen = genericDates.find(g => g.id === item.sourceId);
      setEditDescription(gen?.description || '');
      setEditDueDate(gen?.due_date || '');
    }
  };

  const resetEdit = () => {
    setEditingItem(null);
    setEditDescription('');
    setEditDueDate('');
    setEditAmount(null);
    setEditHeldBy('');
  };

  const handleSaveEdit = async () => {
    if (!editingItem?.sourceId) return;
    if (editingItem.type === 'condition' && onUpdateCondition) {
      await onUpdateCondition(editingItem.sourceId, { description: editDescription, due_date: editDueDate || null });
    } else if (editingItem.type === 'deposit' && onUpdateDeposit) {
      await onUpdateDeposit(editingItem.sourceId, { amount: editAmount ?? 0, held_by: editHeldBy || null, due_date: editDueDate || null });
    } else if (editingItem.type === 'generic' && onUpdateGenericDate) {
      await onUpdateGenericDate(editingItem.sourceId, { description: editDescription, due_date: editDueDate || null });
    }
    resetEdit();
  };

  // Gather all important dates
  const importantDates: DateItem[] = [];

  conditions.forEach((c, index) => {
    if (c.due_date) {
      const date = new Date(c.due_date + 'T00:00:00');
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
      const date = new Date(d.due_date + 'T00:00:00');
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
      const date = new Date(a.due_date + 'T00:00:00');
      importantDates.push({
        id: a.id,
        date,
        label: `Action: ${a.description}${a.acting_party ? ` (${a.acting_party})` : ''}`,
        type: 'action',
        isPast: isBefore(date, today),
      });
    }
  });

  genericDates.forEach((g) => {
    if (g.due_date) {
      const date = new Date(g.due_date + 'T00:00:00');
      importantDates.push({
        id: g.id,
        date,
        label: g.description,
        type: 'generic',
        isPast: isBefore(date, today) && !g.is_completed,
        sourceId: g.id,
        isSatisfied: g.is_completed,
      });
    }
  });

  if (deal.close_date) {
    const date = new Date(deal.close_date + 'T00:00:00');
    importantDates.push({
      id: 'closing',
      date,
      label: 'Closing Date',
      type: 'closing',
      isPast: isBefore(date, today),
    });
  }

  importantDates.sort((a, b) => a.date.getTime() - b.date.getTime());

  const handleToggleSatisfied = async (item: DateItem) => {
    if (item.type === 'condition' && item.sourceId && onUpdateCondition) {
      await onUpdateCondition(item.sourceId, { is_satisfied: !item.isSatisfied });
    } else if (item.type === 'deposit' && item.sourceId && onUpdateDeposit) {
      await onUpdateDeposit(item.sourceId, { received: !item.isSatisfied });
    } else if (item.type === 'generic' && item.sourceId && onUpdateGenericDate) {
      await onUpdateGenericDate(item.sourceId, { is_completed: !item.isSatisfied });
    }
  };

  const handleDelete = async (item: DateItem) => {
    if (item.type === 'condition' && item.sourceId && onDeleteCondition) {
      await onDeleteCondition(item.sourceId);
    } else if (item.type === 'deposit' && item.sourceId && onDeleteDeposit) {
      await onDeleteDeposit(item.sourceId);
    } else if (item.type === 'generic' && item.sourceId && onDeleteGenericDate) {
      await onDeleteGenericDate(item.sourceId);
    }
  };

  const canToggleOrDelete = (d: DateItem) => 
    (d.type === 'condition' || d.type === 'deposit' || d.type === 'generic') && d.sourceId;

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
            <Button size="sm" variant="outline" onClick={() => setAddType('date')}>
              <CalendarPlus className="w-4 h-4 mr-1" />
              Date
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {importantDates.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No important dates. Add conditions, deposits, or dates to track important deadlines.
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
                  {canToggleOrDelete(d) && (
                    <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Edit"
                        onClick={() => openEdit(d)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title={d.isSatisfied ? 'Mark as pending' : 'Mark as completed'}
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

      {/* Add Generic Date Dialog */}
      <Dialog open={addType === 'date'} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Important Date</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={genDescription}
                onChange={(e) => setGenDescription(e.target.value)}
                placeholder="e.g. Environmental Report Due, Zoning Approval..."
              />
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={genDueDate}
                onChange={(e) => setGenDueDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Cancel</Button>
            <Button onClick={handleAddGenericDate} disabled={!genDescription}>Add Date</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && resetEdit()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Edit {editingItem?.type === 'condition' ? 'Condition' : editingItem?.type === 'deposit' ? 'Deposit' : 'Important Date'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {editingItem?.type === 'deposit' ? (
              <>
                <div className="space-y-2">
                  <Label>Amount ($)</Label>
                  <FormattedNumberInput
                    value={editAmount}
                    onChange={setEditAmount}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Held By</Label>
                  <Input
                    value={editHeldBy}
                    onChange={(e) => setEditHeldBy(e.target.value)}
                    placeholder="e.g. Seller's Brokerage"
                  />
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetEdit}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
