import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { SplitSquareHorizontal, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface SharedExpense {
  id: string;
  description: string;
  amount: number | null;
  paid_by: 'Brad Stone' | 'Doug Johannson';
  expense_date: string;
  settled: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

type FilterTab = 'all' | 'open' | 'settled';

const BROKERS = ['Brad Stone', 'Doug Johannson'] as const;

function formatCurrency(amount: number | null) {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 2 }).format(amount);
}

function PaidByBadge({ paidBy }: { paidBy: string }) {
  return (
    <Badge
      className={cn(
        'text-xs font-medium',
        paidBy === 'Brad Stone'
          ? 'bg-blue-100 text-blue-800 hover:bg-blue-100'
          : 'bg-purple-100 text-purple-800 hover:bg-purple-100'
      )}
      variant="secondary"
    >
      {paidBy}
    </Badge>
  );
}

function InlineEditCell({
  value,
  onSave,
  type = 'text',
  placeholder,
}: {
  value: string;
  onSave: (v: string) => void;
  type?: 'text' | 'number';
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const commit = () => {
    setEditing(false);
    if (draft !== value) onSave(draft);
  };

  if (editing) {
    return (
      <Input
        autoFocus
        type={type}
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') { setDraft(value); setEditing(false); }
        }}
        className="h-7 text-sm px-2 w-full min-w-[80px]"
      />
    );
  }

  return (
    <span
      onClick={() => { setDraft(value); setEditing(true); }}
      className="cursor-pointer hover:bg-accent rounded px-1 py-0.5 min-w-[40px] inline-block"
      title="Click to edit"
    >
      {value || <span className="text-muted-foreground italic">{placeholder ?? 'Click to edit'}</span>}
    </span>
  );
}

export default function SharedExpenses() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Add form state
  const [form, setForm] = useState({
    description: '',
    amount: '',
    paid_by: '' as '' | 'Brad Stone' | 'Doug Johannson',
    expense_date: new Date().toISOString().slice(0, 10),
    notes: '',
  });

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['shared_expenses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shared_expenses')
        .select('*')
        .order('expense_date', { ascending: false });
      if (error) throw error;
      return data as SharedExpense[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<SharedExpense> }) => {
      const { error } = await supabase
        .from('shared_expenses')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shared_expenses'] }),
    onError: () => toast({ title: 'Failed to save', variant: 'destructive' }),
  });

  const insertMutation = useMutation({
    mutationFn: async (row: Omit<SharedExpense, 'id' | 'created_at' | 'updated_at' | 'settled'>) => {
      const { error } = await supabase.from('shared_expenses').insert(row);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared_expenses'] });
      setSheetOpen(false);
      setForm({ description: '', amount: '', paid_by: '', expense_date: new Date().toISOString().slice(0, 10), notes: '' });
      toast({ title: 'Expense added' });
    },
    onError: () => toast({ title: 'Failed to add expense', variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('shared_expenses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared_expenses'] });
      setDeleteId(null);
      toast({ title: 'Expense deleted' });
    },
    onError: () => toast({ title: 'Failed to delete', variant: 'destructive' }),
  });

  const openExpenses = useMemo(() => expenses.filter((e) => !e.settled), [expenses]);
  const settledExpenses = useMemo(() => expenses.filter((e) => e.settled), [expenses]);

  const filtered = useMemo(() => {
    if (activeTab === 'open') return openExpenses;
    if (activeTab === 'settled') return settledExpenses;
    return expenses;
  }, [activeTab, expenses, openExpenses, settledExpenses]);

  // Summary: only open expenses count toward the balance
  const { bradTotal, dougTotal, balance } = useMemo(() => {
    const brad = openExpenses.filter((e) => e.paid_by === 'Brad Stone').reduce((s, e) => s + (e.amount ?? 0), 0);
    const doug = openExpenses.filter((e) => e.paid_by === 'Doug Johannson').reduce((s, e) => s + (e.amount ?? 0), 0);
    return { bradTotal: brad, dougTotal: doug, balance: brad - doug };
  }, [openExpenses]);

  const verdict =
    Math.abs(balance) < 0.01
      ? 'All square'
      : balance > 0
      ? `Doug owes Brad ${formatCurrency(balance)}`
      : `Brad owes Doug ${formatCurrency(-balance)}`;

  const handleAddExpense = () => {
    if (!form.description.trim() || !form.paid_by) {
      toast({ title: 'Description and Paid By are required', variant: 'destructive' });
      return;
    }
    insertMutation.mutate({
      description: form.description.trim(),
      amount: form.amount ? parseFloat(form.amount) : null,
      paid_by: form.paid_by,
      expense_date: form.expense_date,
      notes: form.notes.trim() || null,
    });
  };

  return (
    <AppLayout>
      <div className="p-6 lg:p-8">
        <PageHeader
          title="Shared Expenses"
          icon={SplitSquareHorizontal}
          actions={
            <Button onClick={() => setSheetOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Expense
            </Button>
          }
        />

        {/* Summary bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="rounded-lg border bg-card px-5 py-4">
            <p className="text-xs text-muted-foreground mb-1">Brad paid (open)</p>
            <p className="text-xl font-bold text-blue-700">{formatCurrency(bradTotal)}</p>
          </div>
          <div className="rounded-lg border bg-card px-5 py-4">
            <p className="text-xs text-muted-foreground mb-1">Doug paid (open)</p>
            <p className="text-xl font-bold text-purple-700">{formatCurrency(dougTotal)}</p>
          </div>
          <div className={cn(
            'rounded-lg border px-5 py-4',
            Math.abs(balance) < 0.01 ? 'bg-card' : 'bg-amber-50 border-amber-200'
          )}>
            <p className="text-xs text-muted-foreground mb-1">Net verdict</p>
            <p className={cn(
              'text-base font-semibold',
              Math.abs(balance) < 0.01 ? 'text-green-700' : 'text-amber-800'
            )}>
              {verdict}
            </p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-4">
          {(['all', 'open', 'settled'] as FilterTab[]).map((tab) => {
            const count = tab === 'all' ? expenses.length : tab === 'open' ? openExpenses.length : settledExpenses.length;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors',
                  activeTab === tab
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                {tab} <span className="ml-1 text-xs opacity-70">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Paid By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-20 text-center">Settled</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                    No expenses found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((expense) => (
                  <TableRow
                    key={expense.id}
                    className={cn(expense.settled && 'opacity-50')}
                  >
                    <TableCell className="font-medium max-w-[200px]">
                      <InlineEditCell
                        value={expense.description}
                        onSave={(v) => updateMutation.mutate({ id: expense.id, patch: { description: v } })}
                        placeholder="Description"
                      />
                    </TableCell>
                    <TableCell>
                      <InlineEditCell
                        value={expense.amount != null ? String(expense.amount) : ''}
                        onSave={(v) => updateMutation.mutate({ id: expense.id, patch: { amount: v ? parseFloat(v) : null } })}
                        type="number"
                        placeholder="0.00"
                      />
                    </TableCell>
                    <TableCell>
                      <PaidByBadge paidBy={expense.paid_by} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {expense.expense_date}
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <InlineEditCell
                        value={expense.notes ?? ''}
                        onSave={(v) => updateMutation.mutate({ id: expense.id, patch: { notes: v || null } })}
                        placeholder="Add notes…"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={expense.settled}
                        onCheckedChange={(checked) =>
                          updateMutation.mutate({ id: expense.id, patch: { settled: !!checked } })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteId(expense.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add Expense Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Add Expense</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-4 py-6">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="se-description">Description <span className="text-destructive">*</span></Label>
              <Input
                id="se-description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="e.g. Office supplies"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="se-amount">Amount</Label>
              <Input
                id="se-amount"
                type="number"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="se-paid-by">Paid By <span className="text-destructive">*</span></Label>
              <Select
                value={form.paid_by}
                onValueChange={(v) => setForm((f) => ({ ...f, paid_by: v as 'Brad Stone' | 'Doug Johannson' }))}
              >
                <SelectTrigger id="se-paid-by">
                  <SelectValue placeholder="Select broker" />
                </SelectTrigger>
                <SelectContent>
                  {BROKERS.map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="se-date">Date</Label>
              <Input
                id="se-date"
                type="date"
                value={form.expense_date}
                onChange={(e) => setForm((f) => ({ ...f, expense_date: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="se-notes">Notes</Label>
              <Input
                id="se-notes"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Optional"
              />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
            <Button onClick={handleAddExpense} disabled={insertMutation.isPending}>
              {insertMutation.isPending ? 'Adding…' : 'Add Expense'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete expense?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
