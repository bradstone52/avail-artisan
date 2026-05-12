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
import { Switch } from '@/components/ui/switch';
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
import { SplitSquareHorizontal, Plus, Trash2, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

// ─── Types ───────────────────────────────────────────────────────────────────

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

interface RecurringExpense {
  id: string;
  description: string;
  amount: number;
  paid_by: 'Brad Stone' | 'Doug Johannson';
  frequency: 'monthly' | 'quarterly' | 'annual';
  next_due: string;
  active: boolean;
  notes: string | null;
  created_at: string;
}

type FilterTab = 'all' | 'open' | 'settled' | 'recurring';
type PresetKey = 'land-title' | 'survey-plan' | 'title-instrument' | 'subscription';

const BROKERS = ['Brad Stone', 'Doug Johannson'] as const;
const FREQUENCIES = ['monthly', 'quarterly', 'annual'] as const;

interface Preset {
  key: PresetKey;
  label: string;
  description: string;
  amount: string;
}

const PRESETS: Preset[] = [
  { key: 'land-title', label: 'Land Title', description: 'Land Title', amount: '10.00' },
  { key: 'survey-plan', label: 'Survey Plan', description: 'Survey Plan', amount: '2.00' },
  { key: 'title-instrument', label: 'Title Instrument', description: 'Title Instrument', amount: '10.00' },
  { key: 'subscription', label: 'Subscription', description: 'Subscription', amount: '' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(amount: number | null) {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 2,
  }).format(amount);
}

function PaidByBadge({ paidBy }: { paidBy: string }) {
  return (
    <Badge
      className={cn(
        'text-xs font-medium',
        paidBy === 'Brad Stone'
          ? 'bg-blue-100 text-blue-800 hover:bg-blue-100'
          : 'bg-purple-100 text-purple-800 hover:bg-purple-100',
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
          if (e.key === 'Escape') {
            setDraft(value);
            setEditing(false);
          }
        }}
        className="h-7 text-sm px-2 w-full min-w-[80px]"
      />
    );
  }

  return (
    <span
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      className="cursor-pointer hover:bg-accent rounded px-1 py-0.5 min-w-[40px] inline-block"
      title="Click to edit"
    >
      {value || (
        <span className="text-muted-foreground italic">{placeholder ?? 'Click to edit'}</span>
      )}
    </span>
  );
}

// ─── Default form state factory ───────────────────────────────────────────────

const defaultForm = () => ({
  description: '',
  amount: '',
  paid_by: '' as '' | 'Brad Stone' | 'Doug Johannson',
  expense_date: new Date().toISOString().slice(0, 10),
  notes: '',
  sub_detail: '',
});

const defaultRecurringForm = () => ({
  description: '',
  amount: '',
  paid_by: '' as '' | 'Brad Stone' | 'Doug Johannson',
  frequency: '' as '' | 'monthly' | 'quarterly' | 'annual',
  next_due: new Date().toISOString().slice(0, 10),
  notes: '',
});

// ─── Page ────────────────────────────────────────────────────────────────────

export default function SharedExpenses() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [recurringSheetOpen, setRecurringSheetOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteRecurringId, setDeleteRecurringId] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<PresetKey | null>(null);
  const [sendingSummary, setSendingSummary] = useState(false);

  const [form, setForm] = useState(defaultForm());
  const [recurringForm, setRecurringForm] = useState(defaultRecurringForm());

  // ── Queries ──────────────────────────────────────────────────────────────

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

  const { data: recurring = [], isLoading: recurringLoading } = useQuery({
    queryKey: ['recurring_expenses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recurring_expenses')
        .select('*')
        .order('next_due', { ascending: true });
      if (error) throw error;
      return data as RecurringExpense[];
    },
  });

  // ── Mutations — shared expenses ──────────────────────────────────────────

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
    mutationFn: async (
      row: Omit<SharedExpense, 'id' | 'created_at' | 'updated_at' | 'settled'>,
    ) => {
      const { error } = await supabase.from('shared_expenses').insert(row);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared_expenses'] });
      setSheetOpen(false);
      setActivePreset(null);
      setForm(defaultForm());
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

  // ── Mutations — recurring expenses ───────────────────────────────────────

  const insertRecurringMutation = useMutation({
    mutationFn: async (
      row: Omit<RecurringExpense, 'id' | 'created_at' | 'active'>,
    ) => {
      const { error } = await supabase.from('recurring_expenses').insert({ ...row, active: true });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring_expenses'] });
      setRecurringSheetOpen(false);
      setRecurringForm(defaultRecurringForm());
      toast({ title: 'Recurring expense added' });
    },
    onError: () => toast({ title: 'Failed to add recurring expense', variant: 'destructive' }),
  });

  const updateRecurringMutation = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<RecurringExpense> }) => {
      const { error } = await supabase
        .from('recurring_expenses')
        .update(patch)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recurring_expenses'] }),
    onError: () => toast({ title: 'Failed to save', variant: 'destructive' }),
  });

  const deleteRecurringMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('recurring_expenses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring_expenses'] });
      setDeleteRecurringId(null);
      toast({ title: 'Recurring expense deleted' });
    },
    onError: () => toast({ title: 'Failed to delete', variant: 'destructive' }),
  });

  // ── Derived state ────────────────────────────────────────────────────────

  const openExpenses = useMemo(() => expenses.filter((e) => !e.settled), [expenses]);
  const settledExpenses = useMemo(() => expenses.filter((e) => e.settled), [expenses]);

  const filtered = useMemo(() => {
    if (activeTab === 'open') return openExpenses;
    if (activeTab === 'settled') return settledExpenses;
    return expenses;
  }, [activeTab, expenses, openExpenses, settledExpenses]);

  // 50/50 balance: each expense is shared equally; the non-payer owes half.
  const { bradPaid, dougPaid, net } = useMemo(() => {
    const brad = openExpenses
      .filter((e) => e.paid_by === 'Brad Stone')
      .reduce((s, e) => s + (e.amount ?? 0), 0);
    const doug = openExpenses
      .filter((e) => e.paid_by === 'Doug Johannson')
      .reduce((s, e) => s + (e.amount ?? 0), 0);
    // net > 0 means Doug owes Brad; net < 0 means Brad owes Doug
    return { bradPaid: brad, dougPaid: doug, net: brad / 2 - doug / 2 };
  }, [openExpenses]);

  const verdict =
    Math.abs(net) < 0.01
      ? 'All square'
      : net > 0
      ? `Doug owes Brad ${formatCurrency(net)}`
      : `Brad owes Doug ${formatCurrency(-net)}`;

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handlePresetClick = (preset: Preset) => {
    setActivePreset(preset.key);
    setForm((f) => ({
      ...f,
      description: preset.description,
      amount: preset.amount,
      sub_detail: '',
    }));
    setSheetOpen(true);
  };

  const handleSheetClose = (open: boolean) => {
    setSheetOpen(open);
    if (!open) {
      setActivePreset(null);
      setForm(defaultForm());
    }
  };

  const handleAddExpense = () => {
    if (!form.description.trim() || !form.paid_by) {
      toast({ title: 'Description and Paid By are required', variant: 'destructive' });
      return;
    }
    const isSubscription = activePreset === 'subscription';
    const description =
      isSubscription && form.sub_detail.trim()
        ? `Subscription — ${form.sub_detail.trim()}`
        : form.description.trim();

    insertMutation.mutate({
      description,
      amount: form.amount ? parseFloat(form.amount) : null,
      paid_by: form.paid_by,
      expense_date: form.expense_date,
      notes: form.notes.trim() || null,
    });
  };

  const handleAddRecurring = () => {
    if (!recurringForm.description.trim() || !recurringForm.paid_by || !recurringForm.frequency) {
      toast({
        title: 'Description, Paid By, and Frequency are required',
        variant: 'destructive',
      });
      return;
    }
    if (!recurringForm.amount || isNaN(parseFloat(recurringForm.amount))) {
      toast({ title: 'Amount is required for recurring expenses', variant: 'destructive' });
      return;
    }
    insertRecurringMutation.mutate({
      description: recurringForm.description.trim(),
      amount: parseFloat(recurringForm.amount),
      paid_by: recurringForm.paid_by,
      frequency: recurringForm.frequency,
      next_due: recurringForm.next_due,
      notes: recurringForm.notes.trim() || null,
    });
  };

  const handleSendSummary = async () => {
    setSendingSummary(true);
    try {
      const { error } = await supabase.functions.invoke('send-expense-summary');
      if (error) throw error;
      toast({ title: 'Settlement summary sent to both brokers' });
    } catch {
      toast({ title: 'Failed to send summary', variant: 'destructive' });
    } finally {
      setSendingSummary(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <AppLayout>
      <div className="p-6 lg:p-8">
        <PageHeader
          title="Shared Expenses"
          icon={SplitSquareHorizontal}
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleSendSummary}
                disabled={sendingSummary}
              >
                <Mail className="w-4 h-4 mr-2" />
                {sendingSummary ? 'Sending…' : 'Send Settlement Summary'}
              </Button>
              <Button onClick={() => setSheetOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Expense
              </Button>
            </div>
          }
        />

        {/* Summary bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="rounded-lg border bg-card px-5 py-4">
            <p className="text-xs text-muted-foreground mb-1">Brad paid (open)</p>
            <p className="text-xl font-bold text-blue-700">{formatCurrency(bradPaid)}</p>
          </div>
          <div className="rounded-lg border bg-card px-5 py-4">
            <p className="text-xs text-muted-foreground mb-1">Doug paid (open)</p>
            <p className="text-xl font-bold text-purple-700">{formatCurrency(dougPaid)}</p>
          </div>
          <div
            className={cn(
              'rounded-lg border px-5 py-4',
              Math.abs(net) < 0.01 ? 'bg-card' : 'bg-amber-50 border-amber-200',
            )}
          >
            <p className="text-xs text-muted-foreground mb-1">Net owing</p>
            <p
              className={cn(
                'text-base font-semibold',
                Math.abs(net) < 0.01 ? 'text-green-700' : 'text-amber-800',
              )}
            >
              {verdict}
            </p>
          </div>
        </div>

        {/* Preset buttons */}
        <div className="flex flex-wrap gap-2 mb-5">
          {PRESETS.map((preset) => (
            <button
              key={preset.key}
              onClick={() => handlePresetClick(preset)}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium border transition-all',
                activePreset === preset.key
                  ? 'bg-primary text-primary-foreground border-primary ring-2 ring-primary ring-offset-1'
                  : 'bg-background text-foreground border-border hover:bg-accent',
              )}
            >
              {preset.label}
              {preset.amount && (
                <span className="ml-1.5 text-xs opacity-70">{formatCurrency(parseFloat(preset.amount))}</span>
              )}
            </button>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          {(['all', 'open', 'settled', 'recurring'] as FilterTab[]).map((tab) => {
            const count =
              tab === 'all'
                ? expenses.length
                : tab === 'open'
                ? openExpenses.length
                : tab === 'settled'
                ? settledExpenses.length
                : recurring.length;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors',
                  activeTab === tab
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                {tab} <span className="ml-1 text-xs opacity-70">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Recurring table */}
        {activeTab === 'recurring' ? (
          <>
            <div className="flex justify-end mb-3">
              <Button size="sm" onClick={() => setRecurringSheetOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Recurring
              </Button>
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Paid By</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Next Due</TableHead>
                    <TableHead className="w-20 text-center">Active</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recurringLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 7 }).map((_, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : recurring.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center text-muted-foreground py-10"
                      >
                        No recurring expenses yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    recurring.map((r) => (
                      <TableRow key={r.id} className={cn(!r.active && 'opacity-50')}>
                        <TableCell className="font-medium">{r.description}</TableCell>
                        <TableCell>{formatCurrency(r.amount)}</TableCell>
                        <TableCell>
                          <PaidByBadge paidBy={r.paid_by} />
                        </TableCell>
                        <TableCell className="capitalize text-sm">{r.frequency}</TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {r.next_due}
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={r.active}
                            onCheckedChange={(checked) =>
                              updateRecurringMutation.mutate({
                                id: r.id,
                                patch: { active: checked },
                              })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleteRecurringId(r.id)}
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
          </>
        ) : (
          /* Shared expenses table */
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
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-muted-foreground py-10"
                    >
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
                          onSave={(v) =>
                            updateMutation.mutate({
                              id: expense.id,
                              patch: { description: v },
                            })
                          }
                          placeholder="Description"
                        />
                      </TableCell>
                      <TableCell>
                        <InlineEditCell
                          value={expense.amount != null ? String(expense.amount) : ''}
                          onSave={(v) =>
                            updateMutation.mutate({
                              id: expense.id,
                              patch: { amount: v ? parseFloat(v) : null },
                            })
                          }
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
                          onSave={(v) =>
                            updateMutation.mutate({
                              id: expense.id,
                              patch: { notes: v || null },
                            })
                          }
                          placeholder="Add notes…"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={expense.settled}
                          onCheckedChange={(checked) =>
                            updateMutation.mutate({
                              id: expense.id,
                              patch: { settled: !!checked },
                            })
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
        )}
      </div>

      {/* ── Add Expense Sheet ── */}
      <Sheet open={sheetOpen} onOpenChange={handleSheetClose}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Add Expense</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-4 py-6">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="se-description">
                Description <span className="text-destructive">*</span>
              </Label>
              <Input
                id="se-description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="e.g. Office supplies"
              />
            </div>
            {/* Sub-detail only for Subscription preset */}
            {activePreset === 'subscription' && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="se-sub-detail">Sub-detail</Label>
                <Input
                  id="se-sub-detail"
                  value={form.sub_detail}
                  onChange={(e) => setForm((f) => ({ ...f, sub_detail: e.target.value }))}
                  placeholder="e.g. Adobe CC, SPIN"
                />
                {form.sub_detail.trim() && (
                  <p className="text-xs text-muted-foreground">
                    Will save as: <strong>Subscription — {form.sub_detail.trim()}</strong>
                  </p>
                )}
              </div>
            )}
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
              <Label htmlFor="se-paid-by">
                Paid By <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.paid_by}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, paid_by: v as 'Brad Stone' | 'Doug Johannson' }))
                }
              >
                <SelectTrigger id="se-paid-by">
                  <SelectValue placeholder="Select broker" />
                </SelectTrigger>
                <SelectContent>
                  {BROKERS.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
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
            <Button variant="outline" onClick={() => handleSheetClose(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddExpense} disabled={insertMutation.isPending}>
              {insertMutation.isPending ? 'Adding…' : 'Add Expense'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Add Recurring Sheet ── */}
      <Sheet open={recurringSheetOpen} onOpenChange={setRecurringSheetOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Add Recurring Expense</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-4 py-6">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="re-description">
                Description <span className="text-destructive">*</span>
              </Label>
              <Input
                id="re-description"
                value={recurringForm.description}
                onChange={(e) =>
                  setRecurringForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="e.g. Adobe CC"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="re-amount">
                Amount <span className="text-destructive">*</span>
              </Label>
              <Input
                id="re-amount"
                type="number"
                step="0.01"
                value={recurringForm.amount}
                onChange={(e) => setRecurringForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="re-paid-by">
                Paid By <span className="text-destructive">*</span>
              </Label>
              <Select
                value={recurringForm.paid_by}
                onValueChange={(v) =>
                  setRecurringForm((f) => ({
                    ...f,
                    paid_by: v as 'Brad Stone' | 'Doug Johannson',
                  }))
                }
              >
                <SelectTrigger id="re-paid-by">
                  <SelectValue placeholder="Select broker" />
                </SelectTrigger>
                <SelectContent>
                  {BROKERS.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="re-frequency">
                Frequency <span className="text-destructive">*</span>
              </Label>
              <Select
                value={recurringForm.frequency}
                onValueChange={(v) =>
                  setRecurringForm((f) => ({
                    ...f,
                    frequency: v as 'monthly' | 'quarterly' | 'annual',
                  }))
                }
              >
                <SelectTrigger id="re-frequency">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((freq) => (
                    <SelectItem key={freq} value={freq} className="capitalize">
                      {freq.charAt(0).toUpperCase() + freq.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="re-next-due">Next Due</Label>
              <Input
                id="re-next-due"
                type="date"
                value={recurringForm.next_due}
                onChange={(e) =>
                  setRecurringForm((f) => ({ ...f, next_due: e.target.value }))
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="re-notes">Notes</Label>
              <Input
                id="re-notes"
                value={recurringForm.notes}
                onChange={(e) => setRecurringForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Optional"
              />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setRecurringSheetOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddRecurring} disabled={insertRecurringMutation.isPending}>
              {insertRecurringMutation.isPending ? 'Adding…' : 'Add Recurring'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Delete shared expense ── */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete expense?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
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

      {/* ── Delete recurring expense ── */}
      <AlertDialog
        open={!!deleteRecurringId}
        onOpenChange={(o) => !o && setDeleteRecurringId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete recurring expense?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                deleteRecurringId && deleteRecurringMutation.mutate(deleteRecurringId)
              }
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
