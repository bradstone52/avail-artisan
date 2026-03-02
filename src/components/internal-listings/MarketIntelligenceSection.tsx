import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useMarketIntelligence, ComparableListing, RecentTransaction, PricingPosition } from '@/hooks/useMarketIntelligence';
import { InternalListing } from '@/hooks/useInternalListings';
import { formatNumber, formatCurrency } from '@/lib/format';
import { format } from 'date-fns';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Building2,
  DollarSign,
  BarChart3,
  History,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface MarketIntelligenceSectionProps {
  listing: InternalListing;
}

function PricingIndicator({ 
  position, 
  label, 
  yourPrice, 
  marketAvg 
}: { 
  position: PricingPosition; 
  label: string;
  yourPrice: string;
  marketAvg: string | null;
}) {
  const getPositionDisplay = () => {
    switch (position.position) {
      case 'below':
        return {
          icon: <TrendingDown className="h-5 w-5" />,
          color: 'text-green-600 bg-green-50 border-green-200',
          label: 'Below Market',
        };
      case 'above':
        return {
          icon: <TrendingUp className="h-5 w-5" />,
          color: 'text-amber-600 bg-amber-50 border-amber-200',
          label: 'Above Market',
        };
      case 'at':
        return {
          icon: <Minus className="h-5 w-5" />,
          color: 'text-blue-600 bg-blue-50 border-blue-200',
          label: 'At Market',
        };
      default:
        return {
          icon: <AlertCircle className="h-5 w-5" />,
          color: 'text-muted-foreground bg-muted border-muted',
          label: 'Insufficient Data',
        };
    }
  };

  const display = getPositionDisplay();

  return (
    <div className={`p-4 rounded-lg border-2 ${display.color}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium uppercase tracking-wide">{label}</span>
        <div className="flex items-center gap-1">
          {display.icon}
          <span className="font-semibold">{display.label}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 mt-3">
        <div>
          <p className="text-xs opacity-70">Your Price</p>
          <p className="text-lg font-bold">{yourPrice}</p>
        </div>
        <div>
          <p className="text-xs opacity-70">Market Avg</p>
          <p className="text-lg font-bold">{marketAvg || '—'}</p>
        </div>
      </div>
      {position.percentDiff !== null && (
        <p className="text-xs mt-2 opacity-70">
          {position.percentDiff > 0 ? '+' : ''}{position.percentDiff.toFixed(1)}% vs market average
        </p>
      )}
    </div>
  );
}

function ComparableCard({ listing }: { listing: ComparableListing }) {
  return (
    <div className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">
            {listing.display_address || listing.address}
          </p>
          <p className="text-sm text-muted-foreground">
            {listing.submarket} • {formatNumber(listing.size_sf)} SF
          </p>
        </div>
        <Badge variant="outline" className="shrink-0">
          {listing.status}
        </Badge>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {listing.asking_rate_psf && (
          <span className="text-primary font-medium">
            {formatCurrency(parseFloat(String(listing.asking_rate_psf)))}/SF
          </span>
        )}
        {listing.sale_price && (
          <span className="text-primary font-medium">
            {formatCurrency(parseFloat(String(listing.sale_price)))}
          </span>
        )}
        {listing.clear_height_ft && (
          <span className="text-muted-foreground">
            {listing.clear_height_ft}' clear
          </span>
        )}
        {(listing.dock_doors || listing.drive_in_doors) && (
          <span className="text-muted-foreground">
            {listing.dock_doors ? `${listing.dock_doors} dock` : ''}
            {listing.dock_doors && listing.drive_in_doors ? ', ' : ''}
            {listing.drive_in_doors ? `${listing.drive_in_doors} DI` : ''}
          </span>
        )}
      </div>
      {listing.broker_source && (
        <p className="text-xs text-muted-foreground mt-1">
          {listing.broker_source}
        </p>
      )}
    </div>
  );
}

function TransactionCard({ transaction }: { transaction: RecentTransaction }) {
  const typeColors: Record<string, string> = {
    Sale: 'bg-purple-100 text-purple-800 border-purple-300',
    Lease: 'bg-blue-100 text-blue-800 border-blue-300',
    Sublease: 'bg-amber-100 text-amber-800 border-amber-300',
    Renewal: 'bg-green-100 text-green-800 border-green-300',
  };

  return (
    <Link 
      to={`/transactions/${transaction.id}`}
      className="block p-3 border rounded-lg hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">
            {transaction.display_address || transaction.address}
          </p>
          <p className="text-sm text-muted-foreground">
            {formatNumber(transaction.size_sf)} SF
            {transaction.transaction_date && (
              <> • {format(new Date(transaction.transaction_date), 'MMM yyyy')}</>
            )}
          </p>
        </div>
        <Badge 
          variant="outline" 
          className={`shrink-0 ${typeColors[transaction.transaction_type] || ''}`}
        >
          {transaction.transaction_type}
        </Badge>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {transaction.sale_price && (
          <span className="text-primary font-medium">
            {formatCurrency(transaction.sale_price)}
          </span>
        )}
        {transaction.lease_rate_psf && (
          <span className="text-primary font-medium">
            ${transaction.lease_rate_psf.toFixed(2)}/SF
          </span>
        )}
        {transaction.buyer_tenant_company && (
          <span className="text-muted-foreground">
            {transaction.buyer_tenant_company}
          </span>
        )}
      </div>
    </Link>
  );
}

export function MarketIntelligenceSection({ listing }: MarketIntelligenceSectionProps) {
  const {
    comparables,
    recentTransactions,
    marketStats,
    rentPosition,
    salePosition,
    isLoading,
  } = useMarketIntelligence(listing);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const showRentIndicator = listing.deal_type === 'Lease' || listing.deal_type === 'Both';
  const showSaleIndicator = listing.deal_type === 'Sale' || listing.deal_type === 'Both';

  return (
    <div className="space-y-6">
      {/* Pricing Indicators */}
      <div className="grid md:grid-cols-2 gap-4">
        {showRentIndicator && (
          <PricingIndicator
            position={rentPosition}
            label="Lease Rate"
            yourPrice={listing.asking_rent_psf ? `$${listing.asking_rent_psf}/SF` : '—'}
            marketAvg={marketStats.avgAskingRent ? `$${marketStats.avgAskingRent.toFixed(2)}/SF` : null}
          />
        )}
        {showSaleIndicator && (
          <PricingIndicator
            position={salePosition}
            label="Sale Price"
            yourPrice={listing.asking_sale_price && listing.size_sf 
              ? `$${(listing.asking_sale_price / listing.size_sf).toFixed(0)}/SF` 
              : '—'}
            marketAvg={marketStats.avgSalePrice ? `$${marketStats.avgSalePrice.toFixed(0)}/SF` : null}
          />
        )}
      </div>

      {/* Market Stats Summary */}
      <Card className="border-2 border-foreground shadow-[4px_4px_0_hsl(var(--foreground))]">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5" />
            Market Summary — {listing.city}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Active Listings
              </p>
              <p className="text-xl font-bold">{marketStats.totalActiveListings}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Avg Size
              </p>
              <p className="text-xl font-bold">
                {marketStats.avgSizeSf ? `${formatNumber(Math.round(marketStats.avgSizeSf))} SF` : '—'}
              </p>
            </div>
            {marketStats.avgAskingRent && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  Rent Range
                </p>
                <p className="text-xl font-bold">
                  ${marketStats.minAskingRent?.toFixed(2)} - ${marketStats.maxAskingRent?.toFixed(2)}
                </p>
              </div>
            )}
            {marketStats.avgSalePrice && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  Avg Sale $/SF
                </p>
                <p className="text-xl font-bold">
                  ${marketStats.avgSalePrice.toFixed(0)}/SF
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Comparable Listings */}
      <Card className="border-2 border-foreground shadow-[4px_4px_0_hsl(var(--foreground))]">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5" />
            Comparable Active Listings
            <Badge variant="secondary" className="ml-auto">
              {comparables.length}
            </Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Similar-sized listings in {listing.city}
          </p>
        </CardHeader>
        <CardContent>
          {comparables.length > 0 ? (
            <div className="grid gap-2 max-h-[400px] overflow-y-auto">
              {comparables.map((comp) => (
                <ComparableCard key={comp.id} listing={comp} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No comparable listings found</p>
              <p className="text-sm">
                Try expanding your search criteria or check other submarkets
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card className="border-2 border-foreground shadow-[4px_4px_0_hsl(var(--foreground))]">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5" />
            Recent Transactions
            <Badge variant="secondary" className="ml-auto">
              {recentTransactions.length}
            </Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Deals closed in the last 24 months in {listing.city}
          </p>
        </CardHeader>
        <CardContent>
          {recentTransactions.length > 0 ? (
            <div className="grid gap-2 max-h-[400px] overflow-y-auto">
              {recentTransactions.map((tx) => (
                <TransactionCard key={tx.id} transaction={tx} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No recent transactions found</p>
              <p className="text-sm">
                Log transactions to build market intelligence
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
