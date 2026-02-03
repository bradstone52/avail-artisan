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
import { MoreHorizontal, Eye, Pencil, Trash2, ExternalLink } from 'lucide-react';
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

export function InternalListingsTable({
  listings,
  onEdit,
  onDelete,
  isDeleting,
}: InternalListingsTableProps) {
  const navigate = useNavigate();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = () => {
    if (deleteId) {
      onDelete(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <>
      <div className="border-2 border-foreground shadow-[4px_4px_0_hsl(var(--foreground))] bg-card overflow-hidden" style={{ borderRadius: 'var(--radius)' }}>
        <Table>
          <TableHeader>
            <TableRow className="border-b-2 border-foreground bg-muted/50">
              <TableHead className="font-bold uppercase text-xs tracking-wider">Address</TableHead>
              <TableHead className="font-bold uppercase text-xs tracking-wider">City</TableHead>
              <TableHead className="font-bold uppercase text-xs tracking-wider">Type</TableHead>
              <TableHead className="font-bold uppercase text-xs tracking-wider text-right">Size (SF)</TableHead>
              <TableHead className="font-bold uppercase text-xs tracking-wider">Deal</TableHead>
              <TableHead className="font-bold uppercase text-xs tracking-wider text-right">Asking</TableHead>
              <TableHead className="font-bold uppercase text-xs tracking-wider">Status</TableHead>
              <TableHead className="font-bold uppercase text-xs tracking-wider">Agent</TableHead>
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
              listings.map((listing) => (
                <TableRow
                  key={listing.id}
                  className="border-b border-foreground/20 hover:bg-muted/30 cursor-pointer"
                  onClick={() => navigate(`/internal-listings/${listing.id}`)}
                >
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{listing.display_address || listing.address}</span>
                      {listing.listing_number && (
                        <span className="text-xs text-muted-foreground">#{listing.listing_number}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{listing.city}</TableCell>
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
              ))
            )}
          </TableBody>
        </Table>
      </div>

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
