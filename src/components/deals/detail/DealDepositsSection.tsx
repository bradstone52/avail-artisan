import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { FormattedNumberInput } from '@/components/common/FormattedNumberInput';
import { Banknote, Plus, Trash2, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/format';
import type { DealDeposit } from '@/hooks/useDealDeposits';

interface DealDepositsSectionProps {
  deposits: DealDeposit[];
  onAdd: (deposit: { amount: number; held_by?: string; due_date?: string }) => Promise<void>;
  onUpdate: (id: string, updates: Partial<DealDeposit>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function DealDepositsSection({ 
  deposits, 
  onAdd, 
  onUpdate, 
  onDelete 
}: DealDepositsSectionProps) {
  const [newDeposit, setNewDeposit] = useState<{ amount?: number; held_by: string; due_date: string }>({ 
    amount: undefined, 
    held_by: '', 
    due_date: '' 
  });
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!newDeposit.amount) return;
    setAdding(true);
    try {
      await onAdd({
        amount: newDeposit.amount,
        held_by: newDeposit.held_by || undefined,
        due_date: newDeposit.due_date || undefined,
      });
      setNewDeposit({ amount: undefined, held_by: '', due_date: '' });
    } finally {
      setAdding(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Banknote className="w-5 h-5" />
          Deposits
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing deposits */}
        {deposits.length > 0 && (
          <div className="space-y-3">
            {deposits.map((deposit) => (
              <div 
                key={deposit.id} 
                className="flex items-start gap-3 p-3 border rounded-md bg-muted/30"
              >
                <Checkbox
                  checked={deposit.received}
                  onCheckedChange={(checked) => 
                    onUpdate(deposit.id, { received: !!checked })
                  }
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <p className={`font-medium ${deposit.received ? 'line-through text-muted-foreground' : ''}`}>
                    {formatCurrency(deposit.amount)}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                    {deposit.held_by && <span>Held by: {deposit.held_by}</span>}
                    {deposit.due_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Due: {format(new Date(deposit.due_date), 'MMM d, yyyy')}
                      </span>
                    )}
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => onDelete(deposit.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Add new deposit */}
        <div className="grid grid-cols-4 gap-3 items-end p-3 border-2 border-dashed rounded-md">
          <div className="space-y-2">
            <Label>Amount</Label>
            <FormattedNumberInput
              value={newDeposit.amount}
              onChange={(value) => setNewDeposit({ ...newDeposit, amount: value ?? undefined })}
              prefix="$"
              placeholder="0.00"
            />
          </div>
          <div className="space-y-2">
            <Label>Held By</Label>
            <Input
              value={newDeposit.held_by}
              onChange={(e) => setNewDeposit({ ...newDeposit, held_by: e.target.value })}
              placeholder="Enter name..."
            />
          </div>
          <div className="space-y-2">
            <Label>Due Date</Label>
            <Input
              type="date"
              value={newDeposit.due_date}
              onChange={(e) => setNewDeposit({ ...newDeposit, due_date: e.target.value })}
            />
          </div>
          <Button onClick={handleAdd} disabled={adding || !newDeposit.amount}>
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>

        {deposits.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No deposits added yet. Use the form above to add deposits.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
