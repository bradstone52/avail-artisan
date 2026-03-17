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
import { ColumnsDropdown } from '@/components/common/ColumnsDropdown';
import { DensityToggle } from '@/components/common/DensityToggle';
import { formatNumber, formatCurrency } from '@/lib/format';
import { useTableColumnPrefs } from '@/hooks/useTableColumnPrefs';
import { useTableDensity } from '@/hooks/useTableDensity';
import { MoreHorizontal, Eye, Pencil, Trash2, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { differenceInDays, differenceInWeeks, differenceInMonths, parseISO } from 'date-fns';
import { InternalListing } from '@/hooks/useInternalListings';

interface InternalListingsTableProps {
  listings: InternalListing[];
  onEdit: (listing: InternalListing) => void;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
}

const LISTINGS_COLUMNS = [
  { id: 'address', label: 'Address', defaultVisible: true },
  { id: 'type', label: 'Type', defaultVisible: true },
  { id: 'size', label: 'Size (SF)', defaultVisible: true },
  { id: 'deal', label: 'Deal', defaultVisible: true },
  { id: 'asking', label: 'Asking', defaultVisible: true },
  { id: 'status', label: 'Status', defaultVisible: true },
  { id: 'updated', label: 'Updated', defaultVisible: true },
  { id: 'agent', label: 'Agent', defaultVisible: false },
];

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

  const { isVisible, toggle, reset, columns } = useTableColumnPrefs('internal-listings', LISTINGS_COLUMNS);
  const { density, toggle: toggleDensity, isCompact } = useTableDensity('internal-listings');
  const cellPadding = isCompact ? 'py-1 text-xs' : '';
  const headPadding = isCompact ? 'py-1.5 text-xs' : '';

  const handleDelete = () => {
    if (deleteId) {
      onDelete(deleteId);
      setDeleteId(null);
    }
  };

  const visibleCount = columns.filter(c => isVisible(c.id)).length;

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <ColumnsDropdown columns={columns} isVisible={isVisible} toggle={toggle} reset={reset} />
        <DensityToggle density={density} toggle={toggleDensity} />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
             {isVisible('address') && <TableHead className={headPadding}>Address</TableHead>}
            {isVisible('type') && <TableHead className={headPadding}>Type</TableHead>}
            {isVisible('size') && <TableHead className={cn('text-right', headPadding)}>Size (SF)</TableHead>}
            {isVisible('deal') && <TableHead className={headPadding}>Deal</TableHead>}
            {isVisible('asking') && <TableHead className={cn('text-right', headPadding)}>Asking</TableHead>}
            {isVisible('status') && <TableHead className={headPadding}>Status</TableHead>}
            {isVisible('updated') && <TableHead className={cn('hidden md:table-cell', headPadding)}>Updated</TableHead>}
            {isVisible('agent') && <TableHead className={headPadding}>Agent</TableHead>}
            <TableHead className={cn('w-[60px]', headPadding)}></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {listings.length === 0 ? (
            <TableRow>
              <TableCell colSpan={visibleCount + 1} className="text-center py-12 text-muted-foreground">
                No listings found. Create your first internal listing to get started.
              </TableCell>
            </TableRow>
          ) : (
            listings.map((listing, index) => {
              const isSelected = selectedRowId === listing.id;
              const isEvenRow = index % 2 === 1;
              const rowBg = isSelected
                ? '!bg-blue-50 dark:!bg-blue-950/30'
                : isEvenRow
                  ? 'bg-table-stripe'
                  : '';
              const hoverClass = isSelected
                ? 'hover:!bg-blue-100 dark:hover:!bg-blue-950/40'
                : isEvenRow
                  ? 'hover:!bg-slate-100 dark:hover:!bg-slate-800/60'
                  : 'hover:!bg-slate-50 dark:hover:!bg-slate-800/40';
              const outlineClass = isSelected
                ? 'outline outline-2 outline-blue-400 dark:outline-blue-500 -outline-offset-1'
                : 'outline-0 hover:outline hover:outline-1 hover:outline-slate-300 dark:hover:outline-slate-600 hover:-outline-offset-1';

              return (
                <TableRow
                  key={listing.id}
                  className={cn(
                    'cursor-pointer transition-all !border-b !border-border',
                    rowBg,
                    hoverClass,
                    outlineClass,
                  )}
                  onClick={() => setSelectedRowId(isSelected ? null : listing.id)}
                  onDoubleClick={() => navigate(`/internal-listings/${listing.id}`)}
                >
                  {isVisible('address') && (
                    <TableCell className={cn('font-medium', cellPadding)}>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span>{listing.display_address || listing.address}</span>
                          {(listing as any).website_published && (
                            <Globe className="w-3.5 h-3.5 text-green-600 flex-shrink-0" title="Published to website" />
                          )}
                        </div>
                        {!isCompact && listing.listing_number && (
                          <span className="text-xs text-muted-foreground">#{listing.listing_number}</span>
                        )}
                        {!isCompact && (
                          <span className="text-xs text-muted-foreground">
                            {listing.submarket}{listing.submarket && listing.city ? ', ' : ''}{listing.city}
                          </span>
                        )}
                      </div>
                    </TableCell>
                  )}
                  {isVisible('type') && (
                    <TableCell className={cellPadding}>
                      {listing.property_type && (
                        <span className="text-sm">{listing.property_type}</span>
                      )}
                    </TableCell>
                  )}
                  {isVisible('size') && (
                    <TableCell className={cn('text-right font-mono', cellPadding)}>
                      {listing.size_sf ? formatNumber(listing.size_sf) : '-'}
                    </TableCell>
                  )}
                  {isVisible('deal') && (
                    <TableCell className={cellPadding}>
                      <Badge
                        variant="outline"
                        className={`font-medium border ${dealTypeColors[listing.deal_type] || ''}`}
                      >
                        {listing.deal_type}
                      </Badge>
                    </TableCell>
                  )}
                  {isVisible('asking') && (
                    <TableCell className={cn('text-right font-mono', cellPadding)}>
                      {listing.deal_type === 'Sale' && listing.asking_sale_price
                        ? formatCurrency(listing.asking_sale_price)
                        : listing.asking_rent_psf
                        ? `$${listing.asking_rent_psf}/sf`
                        : '-'}
                    </TableCell>
                  )}
                  {isVisible('status') && (
                    <TableCell className={cellPadding}>
                      <Badge
                        variant="outline"
                        className={`font-medium border ${statusColors[listing.status] || ''}`}
                      >
                        {listing.status}
                      </Badge>
                    </TableCell>
                  )}
                  {isVisible('updated') && (
                    <TableCell className={cn('hidden md:table-cell', cellPadding)}>
                      <UpdatedCell updatedAt={listing.updated_at} />
                    </TableCell>
                  )}
                  {isVisible('agent') && (
                    <TableCell className={cellPadding}>
                      {listing.assigned_agent?.name || (
                        <span className="text-muted-foreground">Unassigned</span>
                      )}
                    </TableCell>
                  )}
                  <TableCell className={cellPadding}>
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
