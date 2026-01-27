import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTransactions, Transaction, MarketListingData } from '@/hooks/useTransactions';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Loader2,
  Building2,
  DollarSign,
  Users,
  ExternalLink,
  FileText,
  Pencil,
  Trash2,
  Undo2,
} from 'lucide-react';
import { format } from 'date-fns';
import { formatSubmarket } from '@/lib/formatters';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

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

function formatDate(date: string | null): string {
  if (!date) return '—';
  return format(new Date(date), 'MMMM d, yyyy');
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value || '—'}</span>
    </div>
  );
}

function TransactionTypeBadge({ type }: { type: string }) {
  const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
    Sale: 'default',
    Lease: 'secondary',
    Sublease: 'outline',
  };
  return <Badge variant={variants[type] || 'outline'} className="text-sm">{type}</Badge>;
}

export default function TransactionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getTransaction, deleteTransaction, undoTransaction } = useTransactions();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [isUndoing, setIsUndoing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!id) return;
      setIsLoading(true);
      const data = await getTransaction(id);
      if (cancelled) return;
      setTransaction(data);
      setIsLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id, getTransaction]);

  const handleDelete = async () => {
    if (!id) return;
    setIsDeleting(true);
    const success = await deleteTransaction(id);
    if (success) {
      navigate('/transactions');
    }
    setIsDeleting(false);
  };

  const handleUndo = async () => {
    if (!id) return;
    setIsUndoing(true);
    const success = await undoTransaction(id);
    if (success) {
      navigate('/transactions');
    }
    setIsUndoing(false);
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

  if (!transaction) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Transaction not found</h2>
          <p className="text-muted-foreground mb-4">
            This transaction may have been deleted or you don't have access.
          </p>
          <Button onClick={() => navigate('/transactions')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Transactions
          </Button>
        </div>
      </AppLayout>
    );
  }

  // Use snapshot for property details (since listing is deleted after transaction)
  // The snapshot is the raw JSONB data from the database
  const snapshot = transaction.market_listing_snapshot;
  const hasSnapshot = snapshot && typeof snapshot === 'object' && Object.keys(snapshot).length > 0;
  const listing: MarketListingData | null = hasSnapshot ? snapshot : (transaction.market_listing || null);
  const canUndo = hasSnapshot;

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/transactions')}
              className="mb-2 -ml-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Transactions
            </Button>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">
                {transaction.display_address || transaction.address}
              </h1>
              <TransactionTypeBadge type={transaction.transaction_type} />
            </div>
            <p className="text-muted-foreground">
              {transaction.city}
              {transaction.submarket && ` • ${formatSubmarket(transaction.submarket)}`}
            </p>
          </div>
          <div className="flex gap-2">
            {canUndo && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" disabled={isUndoing}>
                    <Undo2 className="h-4 w-4 mr-2" />
                    Undo Transaction
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Undo Transaction</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will delete the transaction and restore the linked market listing to "Active" status. Continue?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleUndo} disabled={isUndoing}>
                      {isUndoing ? 'Undoing...' : 'Undo'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button variant="outline" onClick={() => navigate(`/transactions/${id}/edit`)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isDeleting}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this transaction? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Transaction Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Transaction Details
              </CardTitle>
              <CardDescription>
                {transaction.transaction_type === 'Sale' ? 'Sale' : 'Lease'} particulars
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              <DetailRow label="Transaction Type" value={transaction.transaction_type} />
              <Separator />
              {transaction.transaction_type === 'Sale' ? (
                <DetailRow label="Sale Price" value={formatCurrency(transaction.sale_price)} />
              ) : (
                <>
                  <DetailRow
                    label="Lease Rate"
                    value={transaction.lease_rate_psf ? `$${transaction.lease_rate_psf}/SF` : null}
                  />
                  <Separator />
                  <DetailRow
                    label="Lease Term"
                    value={
                      transaction.lease_term_months
                        ? `${transaction.lease_term_months} months`
                        : null
                    }
                  />
                </>
              )}
              <Separator />
              {transaction.transaction_type === 'Unknown/Removed' ? (
                <DetailRow label="Listing Removal Date" value={formatDate(transaction.listing_removal_date)} />
              ) : (
                <>
                  <DetailRow label="Transaction Date" value={formatDate(transaction.transaction_date)} />
                  <Separator />
                  <DetailRow label="Closing Date" value={formatDate(transaction.closing_date)} />
                </>
              )}
              {transaction.commission_percent && (
                <>
                  <Separator />
                  <DetailRow
                    label="Commission"
                    value={`${transaction.commission_percent}%${
                      transaction.commission_amount
                        ? ` (${formatCurrency(transaction.commission_amount)})`
                        : ''
                    }`}
                  />
                </>
              )}
            </CardContent>
          </Card>

          {/* Parties Involved */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Parties Involved
              </CardTitle>
              <CardDescription>Buyer/tenant and seller/landlord information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-2">
                  {transaction.transaction_type === 'Sale' ? 'Buyer' : 'Tenant'}
                </h4>
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="font-medium">
                    {transaction.buyer_tenant_name || 'Not specified'}
                  </div>
                  {transaction.buyer_tenant_company && (
                    <div className="text-sm text-muted-foreground">
                      {transaction.buyer_tenant_company}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-2">
                  {transaction.transaction_type === 'Sale' ? 'Seller' : 'Landlord'}
                </h4>
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="font-medium">
                    {transaction.seller_landlord_name || 'Not specified'}
                  </div>
                  {transaction.seller_landlord_company && (
                    <div className="text-sm text-muted-foreground">
                      {transaction.seller_landlord_company}
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">Listing Broker</h4>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="font-medium text-sm">
                      {transaction.listing_broker_name || '—'}
                    </div>
                    {transaction.listing_broker_company && (
                      <div className="text-xs text-muted-foreground">
                        {transaction.listing_broker_company}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">Selling Broker</h4>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <div className="font-medium text-sm">
                      {transaction.selling_broker_name || '—'}
                    </div>
                    {transaction.selling_broker_company && (
                      <div className="text-xs text-muted-foreground">
                        {transaction.selling_broker_company}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Property Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Property Details
              </CardTitle>
              <CardDescription>Building specifications and features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              <DetailRow label="Total Size" value={formatSF(listing?.size_sf ?? transaction.size_sf)} />
              <Separator />
              <DetailRow label="Warehouse SF" value={formatSF(listing?.warehouse_sf)} />
              <Separator />
              <DetailRow label="Office SF" value={formatSF(listing?.office_sf)} />
              <Separator />
              <DetailRow
                label="Clear Height"
                value={listing?.clear_height_ft ? `${listing.clear_height_ft} ft` : null}
              />
              <Separator />
              <DetailRow label="Dock Doors" value={listing?.dock_doors} />
              <Separator />
              <DetailRow label="Drive-in Doors" value={listing?.drive_in_doors} />
              <Separator />
              <DetailRow label="Power" value={listing?.power_amps} />
              <Separator />
              <DetailRow label="Voltage" value={listing?.voltage} />
              <Separator />
              <DetailRow label="Sprinkler" value={listing?.sprinkler} />
              <Separator />
              <DetailRow label="Cranes" value={listing?.cranes} />
              <Separator />
              <DetailRow label="Zoning" value={listing?.zoning} />
              <Separator />
              <DetailRow label="Yard" value={listing?.yard} />
              <Separator />
              <DetailRow label="Yard Area" value={listing?.yard_area} />
              <Separator />
              <DetailRow label="Cross-Dock" value={listing?.cross_dock} />
              <Separator />
              <DetailRow label="Trailer Parking" value={listing?.trailer_parking} />
              <Separator />
              <DetailRow label="Land Acres" value={listing?.land_acres} />
            </CardContent>
          </Card>

          {/* Additional Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Additional Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {listing && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">
                    Original Listing
                  </h4>
                  <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                    <DetailRow label="Listing ID" value={listing.listing_id} />
                    <DetailRow label="Status" value={<Badge variant="outline">{listing.status}</Badge>} />
                    <DetailRow label="Landlord/Owner" value={listing.landlord} />
                    <DetailRow label="Listing Broker" value={listing.broker_source} />
                    {listing.link && (
                      <div className="pt-2">
                        <a
                          href={listing.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline text-sm inline-flex items-center gap-1"
                        >
                          View Brochure
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {transaction.notes && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2">Notes</h4>
                  <div className="bg-muted/50 rounded-lg p-3 text-sm whitespace-pre-wrap">
                    {transaction.notes}
                  </div>
                </div>
              )}
              <div className="text-xs text-muted-foreground pt-2">
                Created {formatDate(transaction.created_at)}
                {transaction.updated_at !== transaction.created_at && (
                  <> • Updated {formatDate(transaction.updated_at)}</>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
