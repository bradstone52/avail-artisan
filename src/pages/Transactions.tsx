import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTransactions } from '@/hooks/useTransactions';
import { AppLayout } from '@/components/layout/AppLayout';
import { TransactionFormDialog } from '@/components/transactions/TransactionFormDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Plus,
  Search,
  ExternalLink,
  Loader2,
  Building2,
  DollarSign,
  FileText,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import { formatSubmarket } from '@/lib/formatters';

function formatCurrency(value: number | null): string {
  if (value === null) return '—';
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatSF(sf: number | null): string {
  if (sf === null || sf === 0) return '—';
  return sf.toLocaleString() + ' SF';
}

function TransactionTypeBadge({ type }: { type: string }) {
  const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
    Sale: 'default',
    Lease: 'secondary',
    Sublease: 'outline',
  };
  return <Badge variant={variants[type] || 'outline'}>{type}</Badge>;
}

export default function Transactions() {
  const navigate = useNavigate();
  const { transactions, isLoading, deleteTransactions } = useTransactions();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState(false);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const matchesSearch =
        !search ||
        t.address.toLowerCase().includes(search.toLowerCase()) ||
        t.buyer_tenant_company?.toLowerCase().includes(search.toLowerCase()) ||
        t.seller_landlord_company?.toLowerCase().includes(search.toLowerCase());

      const matchesType = typeFilter === 'all' || t.transaction_type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [transactions, search, typeFilter]);

  const stats = useMemo(() => {
    const sales = transactions.filter((t) => t.transaction_type === 'Sale');
    const leases = transactions.filter((t) => t.transaction_type === 'Lease' || t.transaction_type === 'Sublease');
    const totalSaleVolume = sales.reduce((sum, t) => sum + (t.sale_price || 0), 0);
    
    return {
      total: transactions.length,
      sales: sales.length,
      leases: leases.length,
      totalSaleVolume,
    };
  }, [transactions]);

  const allFilteredSelected = filteredTransactions.length > 0 && 
    filteredTransactions.every(t => selectedIds.has(t.id));
  
  const someSelected = selectedIds.size > 0;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredTransactions.map(t => t.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBatchDelete = async () => {
    setIsDeleting(true);
    const success = await deleteTransactions(Array.from(selectedIds));
    setIsDeleting(false);
    if (success) {
      setSelectedIds(new Set());
      setShowDeleteConfirm(false);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
            <p className="text-muted-foreground">
              Track completed sales and lease transactions
            </p>
          </div>
          <Button size="sm" className="w-full sm:w-auto" onClick={() => setShowNewDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Transaction
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sales</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.sales}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Leases</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.leases}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sale Volume</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalSaleVolume)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-4 items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by address or company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Sale">Sale</SelectItem>
              <SelectItem value="Lease">Lease</SelectItem>
              <SelectItem value="Sublease">Sublease</SelectItem>
            </SelectContent>
          </Select>
          {someSelected && (
            <Button 
              variant="destructive" 
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete ({selectedIds.size})
            </Button>
          )}
        </div>

        {/* Transactions Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={allFilteredSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Price/Rate</TableHead>
                <TableHead>Buyer/Tenant</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {transactions.length === 0
                      ? 'No transactions yet. Create your first transaction to get started.'
                      : 'No transactions match your filters.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((transaction) => (
                  <TableRow
                    key={transaction.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/transactions/${transaction.id}`)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(transaction.id)}
                        onCheckedChange={(checked) => handleSelectOne(transaction.id, !!checked)}
                        aria-label={`Select ${transaction.address}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {transaction.display_address || transaction.address}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {transaction.city}
                          {transaction.submarket && ` • ${formatSubmarket(transaction.submarket)}`}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <TransactionTypeBadge type={transaction.transaction_type} />
                    </TableCell>
                    <TableCell>{formatSF(transaction.size_sf)}</TableCell>
                    <TableCell>
                      {transaction.transaction_type === 'Sale'
                        ? formatCurrency(transaction.sale_price)
                        : transaction.lease_rate_psf
                        ? `$${transaction.lease_rate_psf}/SF`
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <div>
                        {transaction.buyer_tenant_name && (
                          <div className="font-medium">{transaction.buyer_tenant_name}</div>
                        )}
                        {transaction.buyer_tenant_company && (
                          <div className="text-sm text-muted-foreground">
                            {transaction.buyer_tenant_company}
                          </div>
                        )}
                        {!transaction.buyer_tenant_name && !transaction.buyer_tenant_company && '—'}
                      </div>
                    </TableCell>
                    <TableCell>
                      {transaction.closing_date
                        ? format(new Date(transaction.closing_date), 'MMM d, yyyy')
                        : transaction.transaction_date
                        ? format(new Date(transaction.transaction_date), 'MMM d, yyyy')
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {selectedIds.size} transaction{selectedIds.size > 1 ? 's' : ''}?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. The selected transactions will be permanently deleted.
                Note: This will NOT restore any associated market listings.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleBatchDelete}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* New Transaction Dialog */}
        <TransactionFormDialog
          open={showNewDialog}
          onOpenChange={setShowNewDialog}
          onSaved={(transactionId) => navigate(`/transactions/${transactionId}`)}
        />
      </div>
    </AppLayout>
  );
}
