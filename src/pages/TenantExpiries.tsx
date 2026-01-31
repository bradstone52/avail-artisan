import { useState, useMemo } from 'react';
import { differenceInMonths } from 'date-fns';
import { Calendar, AlertTriangle, Clock } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { SearchInput } from '@/components/common/SearchInput';
import { TenantExpiriesTable } from '@/components/tenants/TenantExpiriesTable';
import { useTenantExpiries, TenantExpiry } from '@/hooks/useTenantExpiries';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

type TimeframeFilter = 'all' | 'expired' | '6months' | '9months' | '1year';
type SourceFilter = 'all' | 'manual' | 'transaction';

export default function TenantExpiries() {
  const { data: expiries, isLoading } = useTenantExpiries();
  const [search, setSearch] = useState('');
  const [timeframeFilter, setTimeframeFilter] = useState<TimeframeFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');

  const filteredExpiries = useMemo(() => {
    if (!expiries) return [];

    return expiries.filter((expiry) => {
      // Search filter
      const searchLower = search.toLowerCase();
      const matchesSearch =
        !search ||
        expiry.tenantName.toLowerCase().includes(searchLower) ||
        expiry.propertyAddress?.toLowerCase().includes(searchLower) ||
        expiry.propertyName?.toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;

      // Source filter
      if (sourceFilter !== 'all' && expiry.source !== sourceFilter) return false;

      // Timeframe filter
      const today = new Date();
      const expiryDate = new Date(expiry.expiryDate);
      const monthsUntil = differenceInMonths(expiryDate, today);

      switch (timeframeFilter) {
        case 'expired':
          return monthsUntil < 0;
        case '6months':
          return monthsUntil <= 6;
        case '9months':
          return monthsUntil <= 9;
        case '1year':
          return monthsUntil <= 12;
        default:
          return true;
      }
    });
  }, [expiries, search, timeframeFilter, sourceFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!expiries) return { total: 0, within6Months: 0, expired: 0 };

    const today = new Date();
    let within6Months = 0;
    let expired = 0;

    expiries.forEach((expiry) => {
      const expiryDate = new Date(expiry.expiryDate);
      const monthsUntil = differenceInMonths(expiryDate, today);

      if (monthsUntil < 0) {
        expired++;
      } else if (monthsUntil <= 6) {
        within6Months++;
      }
    });

    return {
      total: expiries.length,
      within6Months,
      expired,
    };
  }, [expiries]);

  return (
    <AppLayout>
      <div className="container py-6 space-y-6">
        <PageHeader
          title="Tenant Expiries"
          description="Track lease expiration dates across all properties"
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Tracked</p>
                  {isLoading ? (
                    <Skeleton className="h-7 w-12" />
                  ) : (
                    <p className="text-2xl font-bold">{stats.total}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="h-5 w-5 text-yellow-700" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Within 6 Months</p>
                  {isLoading ? (
                    <Skeleton className="h-7 w-12" />
                  ) : (
                    <p className="text-2xl font-bold">{stats.within6Months}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-700" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Expired</p>
                  {isLoading ? (
                    <Skeleton className="h-7 w-12" />
                  ) : (
                    <p className="text-2xl font-bold">{stats.expired}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search tenant or property..."
            className="flex-1 max-w-sm"
          />

          <Select
            value={timeframeFilter}
            onValueChange={(v) => setTimeframeFilter(v as TimeframeFilter)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Expiries</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="6months">Within 6 Months</SelectItem>
              <SelectItem value="9months">Within 9 Months</SelectItem>
              <SelectItem value="1year">Within 1 Year</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={sourceFilter}
            onValueChange={(v) => setSourceFilter(v as SourceFilter)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="manual">Manual Only</SelectItem>
              <SelectItem value="transaction">Transaction Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : (
          <TenantExpiriesTable expiries={filteredExpiries} />
        )}
      </div>
    </AppLayout>
  );
}
