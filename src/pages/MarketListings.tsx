import { AppLayout } from '@/components/layout/AppLayout';
import { useMarketListings, MarketListing } from '@/hooks/useMarketListings';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Database, ExternalLink, MapPin, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';

function formatSF(sf: number | null): string {
  if (!sf) return '-';
  return sf.toLocaleString() + ' SF';
}

function LinkStatusBadge({ status }: { status: string | null }) {
  if (!status) return <Badge variant="outline">Unchecked</Badge>;
  
  switch (status) {
    case 'ok':
      return <Badge className="bg-green-500/10 text-green-600 border-green-500/20"><CheckCircle className="w-3 h-3 mr-1" />OK</Badge>;
    case 'broken':
      return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Broken</Badge>;
    default:
      return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />{status}</Badge>;
  }
}

export default function MarketListings() {
  const { 
    listings, 
    syncLogs,
    loading, 
    isSyncing, 
    syncMarketListings,
  } = useMarketListings();

  const lastSync = syncLogs[0];
  const distributionCount = listings.filter(l => l.is_distribution_warehouse).length;

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 lg:p-8 flex items-center justify-center min-h-[50vh]">
          <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold">Market Listings</h1>
            <p className="text-muted-foreground mt-1">
              {listings.length} total listings • {distributionCount} distribution warehouses
            </p>
          </div>
          <Button 
            onClick={syncMarketListings}
            disabled={isSyncing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Market Data'}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Listings</CardDescription>
              <CardTitle className="text-3xl">{listings.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Distribution Warehouses</CardDescription>
              <CardTitle className="text-3xl">{distributionCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Geocoded</CardDescription>
              <CardTitle className="text-3xl">
                {listings.filter(l => l.latitude && l.longitude).length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Last Sync</CardDescription>
              <CardTitle className="text-lg">
                {lastSync 
                  ? format(new Date(lastSync.started_at), 'MMM d, h:mm a')
                  : 'Never'}
              </CardTitle>
            </CardHeader>
            {lastSync && (
              <CardContent className="pt-0">
                <Badge variant={lastSync.status === 'completed' ? 'default' : 'destructive'}>
                  {lastSync.status}
                </Badge>
              </CardContent>
            )}
          </Card>
        </div>

        {/* Sync Logs */}
        {syncLogs.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Recent Syncs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {syncLogs.slice(0, 5).map(log => (
                  <div key={log.id} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                    <div className="flex items-center gap-3">
                      <Badge variant={log.status === 'completed' ? 'default' : 'destructive'}>
                        {log.status}
                      </Badge>
                      <span className="text-muted-foreground">
                        {format(new Date(log.started_at), 'MMM d, h:mm a')}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-muted-foreground">
                      <span>{log.rows_read || 0} read</span>
                      <span>{log.rows_imported || 0} imported</span>
                      <span>{log.rows_skipped || 0} skipped</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Listings Table */}
        {listings.length === 0 ? (
          <div className="text-center py-16 bg-muted/30 rounded-xl border border-dashed border-border">
            <Database className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-display font-semibold mb-2">No Market Listings</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Click "Sync Market Data" to import listings from the Vacancy_List sheet.
            </p>
            <Button onClick={syncMarketListings} disabled={isSyncing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              Sync Market Data
            </Button>
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Address</TableHead>
                      <TableHead>Submarket</TableHead>
                      <TableHead className="text-right">Size</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Dist WH?</TableHead>
                      <TableHead>Geocoded</TableHead>
                      <TableHead>Link</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {listings.slice(0, 100).map((listing) => (
                      <TableRow key={listing.id}>
                        <TableCell className="font-medium max-w-[250px]">
                          <div className="truncate" title={listing.address}>
                            {listing.display_address || listing.address}
                          </div>
                          <div className="text-xs text-muted-foreground">{listing.listing_id}</div>
                        </TableCell>
                        <TableCell>{listing.submarket}</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatSF(listing.size_sf)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={listing.status === 'Active' ? 'default' : 'secondary'}>
                            {listing.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {listing.listing_type || '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {listing.is_distribution_warehouse ? (
                            <Badge className="bg-primary/10 text-primary">Yes</Badge>
                          ) : (
                            <span className="text-muted-foreground">No</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {listing.latitude && listing.longitude ? (
                            <MapPin className="w-4 h-4 text-green-500" />
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {listing.link ? (
                            <a 
                              href={listing.link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-primary hover:underline"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {listings.length > 100 && (
                <div className="p-4 text-center text-sm text-muted-foreground border-t">
                  Showing first 100 of {listings.length} listings
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
