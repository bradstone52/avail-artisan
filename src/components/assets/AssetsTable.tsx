import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AssetWithLinks } from '@/hooks/useAssets';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  ExternalLink, 
  Link as LinkIcon,
  Building2,
  User
} from 'lucide-react';
import { LinkListingDialog } from './LinkListingDialog';

interface AssetsTableProps {
  assets: AssetWithLinks[];
  onEdit: (asset: AssetWithLinks) => void;
  onDelete: (id: string) => void;
  onLinkListing: (assetId: string, marketListingId: string) => Promise<boolean>;
  onUnlinkListing: (assetId: string, marketListingId: string) => Promise<boolean>;
}

function formatSF(sf: number | null): string {
  if (!sf) return '-';
  return sf.toLocaleString() + ' SF';
}

function formatCurrency(value: number | null): string {
  if (!value) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function AssetsTable({ 
  assets, 
  onEdit, 
  onDelete,
  onLinkListing,
  onUnlinkListing 
}: AssetsTableProps) {
  const navigate = useNavigate();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [linkDialogAsset, setLinkDialogAsset] = useState<AssetWithLinks | null>(null);

  const handleViewListing = (listingId: string) => {
    // Navigate to market listings with search for this listing
    navigate(`/market-listings?search=${encodeURIComponent(listingId)}`);
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 z-30 bg-zinc-700 dark:bg-zinc-600 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]">
              Property
            </TableHead>
            <TableHead>City</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Size</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead className="text-center">Listings</TableHead>
            <TableHead className="text-right">Purchase Price</TableHead>
            <TableHead className="sticky right-0 z-30 bg-zinc-700 dark:bg-zinc-600 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.3)]">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assets.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                No assets found. Add your first asset to get started.
              </TableCell>
            </TableRow>
          ) : (
            assets.map((asset, index) => {
              const isEvenRow = index % 2 === 1;
              const stickyBg = isEvenRow ? 'bg-table-stripe' : 'bg-card';
              const hoverClass = isEvenRow 
                ? 'hover:!bg-pink-300 dark:hover:!bg-pink-800' 
                : 'hover:!bg-pink-200 dark:hover:!bg-pink-900';

              return (
                <TableRow 
                  key={asset.id}
                  className={`${hoverClass} group`}
                >
                  {/* Property - Sticky */}
                  <TableCell className={`sticky left-0 z-20 ${stickyBg} shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] group-hover:bg-pink-200 dark:group-hover:bg-pink-900`}>
                    <div className="min-w-[200px]">
                      <div className="font-semibold flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {asset.name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {asset.display_address || asset.address}
                      </div>
                    </div>
                  </TableCell>

                  {/* City */}
                  <TableCell>{asset.city || '-'}</TableCell>

                  {/* Type */}
                  <TableCell>
                    {asset.property_type ? (
                      <Badge variant="secondary">{asset.property_type}</Badge>
                    ) : '-'}
                  </TableCell>

                  {/* Size */}
                  <TableCell className="text-right font-mono">
                    {formatSF(asset.size_sf)}
                  </TableCell>

                  {/* Owner */}
                  <TableCell>
                    <div className="min-w-[150px]">
                      {asset.owner_company || asset.owner_name ? (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">
                              {asset.owner_company || asset.owner_name}
                            </div>
                            {asset.owner_company && asset.owner_name && (
                              <div className="text-xs text-muted-foreground">
                                {asset.owner_name}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </div>
                  </TableCell>

                  {/* Listings */}
                  <TableCell className="text-center">
                    {asset.linked_listings && asset.linked_listings.length > 0 ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex justify-center">
                            <Badge 
                              variant={asset.active_listing_count ? "default" : "secondary"}
                              className="cursor-pointer"
                            >
                              {asset.active_listing_count || 0} active / {asset.linked_listings.length} total
                            </Badge>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="max-w-xs">
                          <div className="space-y-1">
                            <p className="font-semibold">Linked Listings:</p>
                            {asset.linked_listings.map(listing => (
                              <div 
                                key={listing.id} 
                                className="text-xs flex items-center justify-between gap-2 cursor-pointer hover:text-primary"
                                onClick={() => handleViewListing(listing.listing_id)}
                              >
                                <span>{listing.listing_id}</span>
                                <Badge variant="outline" className="text-[10px]">
                                  {listing.status}
                                </Badge>
                                {listing.link_type === 'auto' && (
                                  <span className="text-muted-foreground">(auto)</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>

                  {/* Purchase Price */}
                  <TableCell className="text-right font-mono">
                    {formatCurrency(asset.purchase_price)}
                  </TableCell>

                  {/* Actions - Sticky */}
                  <TableCell className={`sticky right-0 z-20 ${stickyBg} shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)] group-hover:bg-pink-200 dark:group-hover:bg-pink-900`}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(asset)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setLinkDialogAsset(asset)}>
                          <LinkIcon className="h-4 w-4 mr-2" />
                          Manage Links
                        </DropdownMenuItem>
                        {asset.linked_listings && asset.linked_listings.length > 0 && (
                          <DropdownMenuItem onClick={() => handleViewListing(asset.linked_listings![0].listing_id)}>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View Listing
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => setDeleteConfirmId(asset.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
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

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Asset</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this asset? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteConfirmId) {
                  onDelete(deleteConfirmId);
                  setDeleteConfirmId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Link Listing Dialog */}
      <LinkListingDialog
        asset={linkDialogAsset}
        open={!!linkDialogAsset}
        onOpenChange={(open) => !open && setLinkDialogAsset(null)}
        onLink={onLinkListing}
        onUnlink={onUnlinkListing}
      />
    </>
  );
}
