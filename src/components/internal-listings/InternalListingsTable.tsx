import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { formatNumber, formatCurrency } from '@/lib/format';
import { MoreHorizontal, Eye, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { differenceInDays, differenceInWeeks, differenceInMonths, parseISO } from 'date-fns';
import { InternalListing } from '@/hooks/useInternalListings';

interface InternalListingsTableProps {
  listings: InternalListing[];
  onEdit: (listing: InternalListing) => void;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
}

const statusColors: Record<string, string> = {
  Active: 'bg-green-100 text-green-800 border-green-300',
  Pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  Leased: 'bg-blue-100 text-blue-800 border-blue-300',
  Sold: 'bg-purple-100 text-purple-800 border-purple-300',
  Expired: 'bg-gray-100 text-gray-800 border-gray-300',
  Archived: 'bg-gray-100 text-gray-500 border-gray-300',
};

const dealTypeColors: Record<string, string> = {
  Lease: 'bg-cyan-100 text-cyan-800 border-cyan-300',
  Sale: 'bg-orange-100 text-orange-800 border-orange-300',
  Both: 'bg-violet-100 text-violet-800 border-violet-300',
};

function UpdatedCell({ updatedAt }: { updatedAt: string }) {
  const now = new Date();
  const date = parseISO(updatedAt);
  const days = differenceInDays(now, date);
  const isStale = days > 30;

  let label: string;
  if (days === 0) label = 'Today';
  else if (days === 1) label = '1d ago';
  else if (days < 7) label = `${days}d ago`;
  else if (days < 30) label = `${differenceInWeeks(now, date)}w ago`;
  else label = `${differenceInMonths(now, date)}mo ago`;

  return (
    <span className={cn('text-xs', isStale ? 'text-warning-foreground font-semibold' : 'text-muted-foreground')}>
      {label}
    </span>
  );
}

export function InternalListingsTable({
  listings,
  onEdit,
  onDelete,
  isDeleting,
}: InternalListingsTableProps) {
  const navigate = useNavigate();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  const handleDelete = () => {
    if (deleteId) {
      onDelete(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Address</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Size (SF)</TableHead>
            <TableHead>Deal</TableHead>
            <TableHead className="text-right">Asking</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden md:table-cell">Updated</TableHead>
            <TableHead>Agent</TableHead>
            <TableHead className="w-[60px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {listings.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                No listings found. Create your first internal listing to get started.
              </TableCell>
            </TableRow>
          ) : (
            listings.map((listing, index) => {
              const isSelected = selectedRowId === listing.id;
              const isEvenRow = index % 2 === 1;
              const rowBg = isSelected
                ? '!bg-secondary'
                : isEvenRow
                  ? 'bg-table-stripe'
                  : '';
              const hoverClass = isSelected
                ? 'hover:!bg-secondary/90'
                : isEvenRow
                  ? 'hover:!bg-pink-300 dark:hover:!bg-pink-800'
                  : 'hover:!bg-pink-200 dark:hover:!bg-pink-900/50';
              const outlineClass = isSelected
                ? 'outline outline-2 outline-amber-600 dark:outline-amber-500 -outline-offset-1'
                : 'outline-0 hover:outline hover:outline-2 hover:outline-pink-500 dark:hover:outline-pink-400 hover:-outline-offset-1';

              return (
                <TableRow
                  key={listing.id}
                  className={cn(
                    'cursor-pointer transition-all !border-b-2 !border-foreground',
                    rowBg,
                    hoverClass,
                    outlineClass,
                  )}
                  onClick={() => setSelectedRowId(isSelected ? null : listing.id)}
                  onDoubleClick={() => navigate(`/internal-listings/${listing.id}`)}
                >
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{listing.display_address || listing.address}</span>
                      {listing.listing_number && (
                        <span className="text-xs text-muted-foreground">#{listing.listing_number}</span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {listing.submarket}{listing.submarket && listing.city ? ', ' : ''}{listing.city}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {listing.property_type && (
                      <span className="text-sm">{listing.property_type}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {listing.size_sf ? formatNumber(listing.size_sf) : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`font-medium border ${dealTypeColors[listing.deal_type] || ''}`}
                    >
                      {listing.deal_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {listing.deal_type === 'Sale' && listing.asking_sale_price
                      ? formatCurrency(listing.asking_sale_price)
                      : listing.asking_rent_psf
                      ? `$${listing.asking_rent_psf}/sf`
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`font-medium border ${statusColors[listing.status] || ''}`}
                    >
                      {listing.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <UpdatedCell updatedAt={listing.updated_at} />
                  </TableCell>
                  <TableCell>
                    {listing.assigned_agent?.name || (
                      <span className="text-muted-foreground">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/internal-listings/${listing.id}`);
                          }}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(listing);
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteId(listing.id);
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Listing"
        description="Are you sure you want to delete this listing? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        variant="destructive"
      />
    </>
  );
}
