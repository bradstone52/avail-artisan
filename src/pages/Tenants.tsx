import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { SearchInput } from '@/components/common/SearchInput';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AllTenantsTable } from '@/components/tenants/AllTenantsTable';
import { TenantExpiriesTable } from '@/components/tenants/TenantExpiriesTable';
import { useAllTenants } from '@/hooks/useAllTenants';
import { useTenantExpiries, getExpiryStatus } from '@/hooks/useTenantExpiries';
import { Users, AlertTriangle, Clock, TrendingUp } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function Tenants() {
  const [activeTab, setActiveTab] = useState('all');
  const [allTenantsSearch, setAllTenantsSearch] = useState('');
  const [expiriesSearch, setExpiriesSearch] = useState('');
  const [timeframeFilter, setTimeframeFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');

  const { data: allTenants = [], isLoading: allTenantsLoading } = useAllTenants();
  const { data: expiries = [], isLoading: expiriesLoading } = useTenantExpiries();

  // All Tenants stats
  const totalTenants = allTenants.length;
  const totalSf = useMemo(
    () => allTenants.reduce((sum, t) => sum + (t.sizeSf || 0), 0),
    [allTenants]
  );

  // Expiries stats
  const expiriesStats = useMemo(() => {
    const expired = expiries.filter((e) => getExpiryStatus(e.expiryDate) === 'expired').length;
    const within6Months = expiries.filter((e) => {
      const status = getExpiryStatus(e.expiryDate);
      return status === 'urgent' || status === 'expired';
    }).length;
    return { total: expiries.length, expired, within6Months };
  }, [expiries]);

  // Filter expiries based on timeframe and source
  const filteredExpiries = useMemo(() => {
    return expiries.filter((expiry) => {
      // Source filter
      if (sourceFilter !== 'all' && expiry.source !== sourceFilter) {
        return false;
      }

      // Timeframe filter
      if (timeframeFilter === 'all') return true;
      const status = getExpiryStatus(expiry.expiryDate);

      switch (timeframeFilter) {
        case 'expired':
          return status === 'expired';
        case '6months':
          return status === 'expired' || status === 'urgent';
        case '9months':
          return status === 'expired' || status === 'urgent' || status === 'warning';
        case '1year':
          return status !== 'future';
        default:
          return true;
      }
    });
  }, [expiries, timeframeFilter, sourceFilter]);

  return (
    <AppLayout>
      <div className="p-4 md:p-6 lg:p-8 space-y-6">
        <PageHeader
          title="Tenants"
          description="Track tenants across all properties and monitor lease expiries"
        />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All Tenants</TabsTrigger>
            <TabsTrigger value="expiries">Expiries</TabsTrigger>
          </TabsList>

          {/* All Tenants Tab */}
          <TabsContent value="all">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <Card className="border-2 border-foreground shadow-[4px_4px_0_hsl(var(--foreground))]">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-black">
                        {allTenantsLoading ? <Skeleton className="h-8 w-16" /> : totalTenants}
                      </p>
                      <p className="text-sm text-muted-foreground font-medium">Total Tenants</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-2 border-foreground shadow-[4px_4px_0_hsl(var(--foreground))]">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-secondary/10 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-secondary-foreground" />
                    </div>
                    <div>
                      <p className="text-2xl font-black">
                        {allTenantsLoading ? (
                          <Skeleton className="h-8 w-20" />
                        ) : (
                          totalSf.toLocaleString()
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground font-medium">Total SF Tracked</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Search */}
            <div className="mb-4">
              <SearchInput
                value={allTenantsSearch}
                onChange={setAllTenantsSearch}
                placeholder="Search tenants or properties..."
                className="max-w-md"
              />
            </div>

            {/* Table */}
            {allTenantsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <AllTenantsTable tenants={allTenants} searchQuery={allTenantsSearch} />
            )}
          </TabsContent>

          {/* Expiries Tab */}
          <TabsContent value="expiries">
            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <Card className="border-2 border-foreground shadow-[4px_4px_0_hsl(var(--foreground))]">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-black">
                        {expiriesLoading ? <Skeleton className="h-8 w-12" /> : expiriesStats.total}
                      </p>
                      <p className="text-sm text-muted-foreground font-medium">Total</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-2 border-foreground shadow-[4px_4px_0_hsl(var(--foreground))]">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-destructive/10 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                      <p className="text-2xl font-black text-destructive">
                        {expiriesLoading ? (
                          <Skeleton className="h-8 w-12" />
                        ) : (
                          expiriesStats.within6Months
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground font-medium">Within 6 Months</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-2 border-foreground shadow-[4px_4px_0_hsl(var(--foreground))]">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-destructive/20 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                      <p className="text-2xl font-black text-destructive">
                        {expiriesLoading ? (
                          <Skeleton className="h-8 w-12" />
                        ) : (
                          expiriesStats.expired
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground font-medium">Expired</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <SearchInput
                value={expiriesSearch}
                onChange={setExpiriesSearch}
                placeholder="Search tenants or properties..."
                className="flex-1 max-w-md"
              />
              <div className="flex gap-2">
                <Select value={timeframeFilter} onValueChange={setTimeframeFilter}>
                  <SelectTrigger className="w-[160px]">
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
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="transaction">Transaction</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Table */}
            {expiriesLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <TenantExpiriesTable expiries={filteredExpiries} searchQuery={expiriesSearch} />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
