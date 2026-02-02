import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PropertyWithLinks } from '@/hooks/useProperties';
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
  LayoutDashboard
} from 'lucide-react';
import { LinkListingDialog } from './LinkListingDialog';

interface PropertiesTableProps {
  properties: PropertyWithLinks[];
  onEdit: (property: PropertyWithLinks) => void;
  onDelete: (id: string) => void;
  onViewDashboard: (property: PropertyWithLinks) => void;
  onLinkListing: (propertyId: string, marketListingId: string) => Promise<boolean>;
  onUnlinkListing: (propertyId: string, marketListingId: string) => Promise<boolean>;
}

function formatSF(sf: number | null): string {
  if (!sf) return '-';
  return sf.toLocaleString() + ' SF';
}

export function PropertiesTable({ 
  properties, 
  onEdit, 
  onDelete,
  onViewDashboard,
  onLinkListing,
  onUnlinkListing 
}: PropertiesTableProps) {
  const navigate = useNavigate();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [linkDialogProperty, setLinkDialogProperty] = useState<PropertyWithLinks | null>(null);

  const handleViewListing = (listingId: string) => {
    navigate(`/market-listings?search=${encodeURIComponent(listingId)}`);
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 z-30 bg-zinc-700 dark:bg-zinc-600 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.3)]">
              Address
            </TableHead>
            <TableHead>Name</TableHead>
            <TableHead>City</TableHead>
            <TableHead className="text-right">Size</TableHead>
            <TableHead className="text-center">Listings</TableHead>
            <TableHead className="sticky right-0 z-30 bg-zinc-700 dark:bg-zinc-600 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.3)]">
              Actions
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {properties.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                No properties found. Add your first property to get started.
              </TableCell>
            </TableRow>
          ) : (
            properties.map((property, index) => {
              const isEvenRow = index % 2 === 1;
              const stickyBg = isEvenRow ? 'bg-table-stripe' : 'bg-card';
              const hoverClass = isEvenRow 
                ? 'hover:!bg-pink-300 dark:hover:!bg-pink-800' 
                : 'hover:!bg-pink-200 dark:hover:!bg-pink-900';

              return (
                <TableRow 
                  key={property.id}
                  className={`${hoverClass} group cursor-pointer`}
                  onClick={() => onViewDashboard(property)}
                >
                  {/* Address - Sticky */}
                  <TableCell className={`sticky left-0 z-20 ${stickyBg} shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] group-hover:bg-pink-200 dark:group-hover:bg-pink-900`}>
                    <div className="min-w-[200px]">
                      <div className="font-semibold flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {property.display_address || property.address}
                      </div>
                    </div>
                  </TableCell>

                  {/* Name */}
                  <TableCell className="text-muted-foreground">
                    {property.name && property.name !== property.address ? property.name : '-'}
                  </TableCell>

                  {/* City */}
                  <TableCell>{property.city || '-'}</TableCell>

                  {/* Size */}
                  <TableCell className="text-right font-mono">
                    {formatSF(property.size_sf)}
                  </TableCell>

                  {/* Listings */}
                  <TableCell className="text-center">
                    {property.linked_listings && property.linked_listings.length > 0 ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex justify-center">
                            <Badge 
                              variant={property.active_listing_count ? "default" : "secondary"}
                              className="cursor-pointer"
                            >
                              {property.active_listing_count || 0} active / {property.linked_listings.length} total
                            </Badge>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="max-w-xs">
                          <div className="space-y-1">
                            <p className="font-semibold">Linked Listings:</p>
                            {property.linked_listings.map(listing => (
                              <div 
                                key={listing.id} 
                                className="text-xs flex items-center justify-between gap-2 cursor-pointer hover:text-primary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewListing(listing.listing_id);
                                }}
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

                  {/* Actions - Sticky */}
                  <TableCell 
                    className={`sticky right-0 z-20 ${stickyBg} shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)] group-hover:bg-pink-200 dark:group-hover:bg-pink-900`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onViewDashboard(property)}>
                          <LayoutDashboard className="h-4 w-4 mr-2" />
                          View Dashboard
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit(property)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setLinkDialogProperty(property)}>
                          <LinkIcon className="h-4 w-4 mr-2" />
                          Manage Links
                        </DropdownMenuItem>
                        {property.linked_listings && property.linked_listings.length > 0 && (
                          <DropdownMenuItem onClick={() => handleViewListing(property.linked_listings![0].listing_id)}>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View Listing
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => setDeleteConfirmId(property.id)}
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
            <AlertDialogTitle>Delete Property</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this property? This will also delete all associated photos, brochures, and permit records. This action cannot be undone.
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
        property={linkDialogProperty}
        open={!!linkDialogProperty}
        onOpenChange={(open) => !open && setLinkDialogProperty(null)}
        onLink={onLinkListing}
        onUnlink={onUnlinkListing}
      />
    </>
  );
}
