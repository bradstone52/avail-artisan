import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTransactions } from '@/hooks/useTransactions';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  Plus,
  Search,
  ExternalLink,
  Loader2,
  Building2,
  DollarSign,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';

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
  const { transactions, isLoading } = useTransactions();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
            <p className="text-muted-foreground">
              Track completed sales and lease transactions
            </p>
          </div>
          <Button onClick={() => navigate('/transactions/new')}>
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
        <div className="flex gap-4">
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
        </div>

        {/* Transactions Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
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
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {transaction.display_address || transaction.address}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {transaction.city}
                          {transaction.submarket && ` • ${transaction.submarket}`}
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
      </div>
    </AppLayout>
  );
}
