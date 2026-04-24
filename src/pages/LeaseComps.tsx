import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useLeaseComps } from '@/hooks/useLeaseComps';
import { useSubmarkets } from '@/hooks/useSubmarkets';
import { formatSubmarket } from '@/lib/formatters';
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  ChevronDown,
  FileText,
  TrendingUp,
  Clock,
  BarChart2,
} from 'lucide-react';
import { subMonths, parseISO, isAfter } from 'date-fns';
import { cn } from '@/lib/utils';

export default function LeaseComps() {
  const navigate = useNavigate();
  const { leaseComps, isLoading, deleteLeaseComp } = useLeaseComps();
  const submarkets = useSubmarkets();

  // Filter state
  const [search, setSearch] = useState('');
  const [selectedSubmarkets, setSelectedSubmarkets] = useState<string[]>([]);
  const [minSf, setMinSf] = useState('');
  const [maxSf, setMaxSf] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [trackedOnly, setTrackedOnly] = useState(false);

  // Delete state
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const toggleSubmarket = (s: string) => {
    setSelectedSubmarkets((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  // Stats
  const stats = useMemo(() => {
    const cutoff = subMonths(new Date(), 12);
    const tracked = leaseComps.filter((c) => c.is_tracked).length;
    const last12 = leaseComps.filter(
      (c) => c.commencement_date && isAfter(parseISO(c.commencement_date), cutoff)
    ).length;
    const ratesWithValue = leaseComps.filter((c) => c.net_rate_psf != null);
    const avgRate =
      ratesWithValue.length > 0
        ? ratesWithValue.reduce((sum, c) => sum + (c.net_rate_psf ?? 0), 0) /
          ratesWithValue.length
        : null;
    return { total: leaseComps.length, tracked, last12, avgRate };
  }, [leaseComps]);

  // Filtered list
  const filtered = useMemo(() => {
    return leaseComps.filter((c) => {
      if (search) {
        const q = search.toLowerCase();
        const match =
          c.address.toLowerCase().includes(q) ||
          c.tenant_name?.toLowerCase().includes(q) ||
          c.submarket?.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (selectedSubmarkets.length > 0) {
        const display = formatSubmarket(c.submarket);
        if (!selectedSubmarkets.includes(display)) return false;
      }
      if (minSf && c.size_sf != null && c.size_sf < Number(minSf)) return false;
      if (maxSf && c.size_sf != null && c.size_sf > Number(maxSf)) return false;
      if (dateFrom && c.commencement_date && c.commencement_date < dateFrom) return false;
      if (dateTo && c.commencement_date && c.commencement_date > dateTo) return false;
      if (trackedOnly && !c.is_tracked) return false;
      return true;
    });
  }, [leaseComps, search, selectedSubmarkets, minSf, maxSf, dateFrom, dateTo, trackedOnly]);

  const hasFilters =
    search ||
    selectedSubmarkets.length > 0 ||
    minSf ||
    maxSf ||
    dateFrom ||
    dateTo ||
    trackedOnly;

  const clearFilters = () => {
    setSearch('');
    setSelectedSubmarkets([]);
    setMinSf('');
    setMaxSf('');
    setDateFrom('');
    setDateTo('');
    setTrackedOnly(false);
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 lg:p-8 space-y-6">
        <PageHeader
          title="Lease Comps"
          description="Industrial lease comparable data"
          actions={
            <Button size="sm" onClick={() => navigate('/lease-comps/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Add Lease Comp
            </Button>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Comps</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <div className="text-2xl font-bold">{stats.total}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tracked</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <div className="text-2xl font-bold">{stats.tracked}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last 12 Months</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <div className="text-2xl font-bold">{stats.last12}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Net Rate</CardTitle>
              <BarChart2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-bold">
                  {stats.avgRate != null ? `$${stats.avgRate.toFixed(2)}` : '—'}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Search */}
          <div className="relative min-w-[200px] max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search address or tenant…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Submarket multi-select */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                Submarket
                {selectedSubmarkets.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                    {selectedSubmarkets.length}
                  </Badge>
                )}
                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2 max-h-72 overflow-y-auto" align="start">
              {submarkets.length === 0 ? (
                <p className="text-xs text-muted-foreground px-2 py-1">No submarkets yet</p>
              ) : (
                submarkets.map((s) => (
                  <div
                    key={s}
                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
                    onClick={() => toggleSubmarket(s)}
                  >
                    <Checkbox
                      checked={selectedSubmarkets.includes(s)}
                      onCheckedChange={() => toggleSubmarket(s)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className="text-sm">{s}</span>
                  </div>
                ))
              )}
            </PopoverContent>
          </Popover>

          {/* Size range */}
          <div className="flex items-center gap-1">
            <Input
              type="number"
              placeholder="Min SF"
              value={minSf}
              onChange={(e) => setMinSf(e.target.value)}
              className="w-24 h-9 text-sm"
            />
            <span className="text-muted-foreground text-sm">–</span>
            <Input
              type="number"
              placeholder="Max SF"
              value={maxSf}
              onChange={(e) => setMaxSf(e.target.value)}
              className="w-24 h-9 text-sm"
            />
          </div>

          {/* Date range */}
          <div className="flex items-center gap-1">
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-36 h-9 text-sm"
              title="Commencement from"
            />
            <span className="text-muted-foreground text-sm">–</span>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-36 h-9 text-sm"
              title="Commencement to"
            />
          </div>

          {/* Tracked only toggle */}
          <Button
            variant={trackedOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTrackedOnly((v) => !v)}
          >
            Tracked only
          </Button>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear
            </Button>
          )}

          <span className="text-sm text-muted-foreground ml-auto">
            {filtered.length} of {leaseComps.length}
          </span>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border border-border rounded-lg bg-card">
            {leaseComps.length === 0
              ? 'No lease comps yet. Add your first comp to get started.'
              : 'No comps match your filters.'}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Address</TableHead>
                <TableHead>Submarket</TableHead>
                <TableHead className="text-right">Size (SF)</TableHead>
                <TableHead className="text-right">Net Rate</TableHead>
                <TableHead className="text-right">Term</TableHead>
                <TableHead>Commencement</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead className="w-[48px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((comp, idx) => (
                <TableRow
                  key={comp.id}
                  className={cn(
                    'cursor-pointer transition-colors',
                    idx % 2 === 1 ? 'bg-table-stripe' : '',
                    'hover:bg-muted/60'
                  )}
                  onClick={() => navigate(`/lease-comps/${comp.id}`)}
                >
                  <TableCell>
                    <div className="font-medium">{comp.address}</div>
                    {comp.is_tracked && (
                      <Badge variant="secondary" className="text-[10px] h-4 px-1 mt-0.5">
                        Tracked
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {comp.submarket ? formatSubmarket(comp.submarket) : '—'}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {comp.size_sf != null ? comp.size_sf.toLocaleString() : '—'}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {comp.net_rate_psf != null ? `$${comp.net_rate_psf.toFixed(2)}` : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    {comp.term_months != null ? `${comp.term_months}mo` : '—'}
                  </TableCell>
                  <TableCell>
                    {comp.commencement_date
                      ? new Date(comp.commencement_date + 'T00:00:00').toLocaleDateString('en-CA', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })
                      : '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {comp.tenant_name ?? '—'}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => navigate(`/lease-comps/${comp.id}/edit`)}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteId(comp.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Lease Comp"
        description="Are you sure you want to delete this lease comp? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={async () => {
          if (deleteId) {
            await deleteLeaseComp(deleteId);
            setDeleteId(null);
          }
        }}
      />
    </AppLayout>
  );
}
