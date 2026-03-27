import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useInternalListing,
  useInternalListingStatusHistory,
  useInternalListings,
  InternalListingFormData,
} from '@/hooks/useInternalListings';
import { InternalListingEditDialog } from '@/components/internal-listings/InternalListingEditDialog';
import { InternalListingDocumentsSection } from '@/components/internal-listings/InternalListingDocumentsSection';
import { InquiriesSection } from '@/components/internal-listings/InquiriesSection';
import { ToursSection } from '@/components/internal-listings/ToursSection';
import { MarketingSection } from '@/components/internal-listings/MarketingSection';
import { MarketIntelligenceSection } from '@/components/internal-listings/MarketIntelligenceSection';
import { LinkedDealPanel } from '@/components/internal-listings/LinkedDealPanel';
import { formatNumber, formatCurrency } from '@/lib/format';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Pencil,
  MapPin,
  Building2,
  DollarSign,
  Users,
  FileText,
  History,
  Mail,
  BarChart3,
  Sparkles,
  LineChart,
} from 'lucide-react';
import { useNavigate as useNav } from 'react-router-dom';

const statusColors: Record<string, string> = {
  Active: 'bg-green-100 text-green-800 border-green-300',
  Pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  Leased: 'bg-blue-100 text-blue-800 border-blue-300',
  Sold: 'bg-purple-100 text-purple-800 border-purple-300',
  Expired: 'bg-gray-100 text-gray-800 border-gray-300',
  Archived: 'bg-gray-100 text-gray-500 border-gray-300',
};

export default function InternalListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: listing, isLoading, refetch } = useInternalListing(id);
  const { data: statusHistory } = useInternalListingStatusHistory(id);
  const { updateListing } = useInternalListings();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const handleEditSubmit = (data: InternalListingFormData) => {
    if (!listing) return;
    updateListing.mutate(
      { id: listing.id, ...data },
      {
        onSuccess: () => {
          setEditDialogOpen(false);
          refetch();
        },
      }
    );
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-4 md:p-6 space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid md:grid-cols-3 gap-6">
            <Skeleton className="h-64 md:col-span-2" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!listing) {
    return (
      <AppLayout>
        <div className="p-4 md:p-6">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Listing not found</p>
            <Button
              variant="outline"
              onClick={() => navigate('/internal-listings')}
              className="mt-4"
            >
              Back to Listings
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/internal-listings')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">
                {listing.display_address || listing.address}
              </h1>
              <Badge
                variant="outline"
                className={`font-medium border ${statusColors[listing.status] || ''}`}
              >
                {listing.status}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {listing.city}
              {listing.submarket && ` • ${listing.submarket}`}
              {listing.listing_number && ` • #${listing.listing_number}`}
            </p>
          </div>
           <div className="flex items-center gap-2">
             <Button
               variant="outline"
               className="gap-2"
               onClick={() => setActiveTab('marketing')}
             >
               <Sparkles className="h-4 w-4" />
               <span className="hidden sm:inline">Generate Brochure</span>
             </Button>
             <Button className="gap-2" onClick={() => setEditDialogOpen(true)}>
               <Pencil className="h-4 w-4" />
               Edit
             </Button>
           </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-y-1">
            <TabsTrigger value="overview" className="gap-2">
              <Building2 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="market" className="gap-2">
              <LineChart className="h-4 w-4" />
              Market Intel
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-2">
              <FileText className="h-4 w-4" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="inquiries" className="gap-2">
              <Mail className="h-4 w-4" />
              Inquiries/Tours
            </TabsTrigger>
            <TabsTrigger value="marketing" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Marketing
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-2">
              <History className="h-4 w-4" />
              Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              {/* Property Details */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Property Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        Property Type
                      </p>
                      <p className="font-medium">{listing.property_type || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        Zoning
                      </p>
                      <p className="font-medium">{listing.zoning || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        Total Size
                      </p>
                      <p className="font-medium">
                        {listing.size_sf ? `${formatNumber(listing.size_sf)} SF` : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        Warehouse / Office
                      </p>
                      <p className="font-medium">
                        {listing.warehouse_sf
                          ? `${formatNumber(listing.warehouse_sf)} SF`
                          : '-'}
                        {' / '}
                        {listing.office_sf
                          ? `${formatNumber(listing.office_sf)} SF`
                          : '-'}
                      </p>
                    </div>
                    {listing.second_floor_office_sf && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">
                          Second Floor Office
                        </p>
                        <p className="font-medium">
                          {formatNumber(listing.second_floor_office_sf)} SF
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        Clear Height
                      </p>
                      <p className="font-medium">
                        {listing.clear_height_ft ? `${listing.clear_height_ft} ft` : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        Loading
                      </p>
                      <p className="font-medium">
                        {listing.loading_type || '-'}
                        {listing.dock_doors ? ` • ${listing.dock_doors} Dock` : ''}
                        {listing.drive_in_doors
                          ? ` • ${listing.drive_in_doors} Drive-In`
                          : ''}
                      </p>
                    </div>
                    {listing.drive_in_door_dimensions && listing.drive_in_door_dimensions.length > 0 && (
                      <div className="sm:col-span-2">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                          Drive-In Door Dimensions
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {listing.drive_in_door_dimensions.map((dim, idx) => (
                            <span key={idx} className="text-sm bg-muted px-2 py-1 rounded">
                              Door {idx + 1}: {dim}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        Power
                      </p>
                      <p className="font-medium">{listing.power || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        Yard
                      </p>
                      <p className="font-medium">{listing.yard || '-'}</p>
                    </div>
                    {listing.land_acres && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">
                          Land
                        </p>
                        <p className="font-medium">{listing.land_acres} acres</p>
                      </div>
                    )}
                    {listing.additional_features && (
                      <div className="sm:col-span-2">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                          Additional Features
                        </p>
                        <p className="text-sm whitespace-pre-wrap">{listing.additional_features}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Right sidebar: Financial + Linked Deal stacked */}
              <div className="space-y-6">
              {/* Financial Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Financial
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      Listing Type
                    </p>
                    <p className="font-medium">{listing.deal_type}</p>
                  </div>
                  {(listing.deal_type === 'Lease' || listing.deal_type === 'Both') &&
                    listing.asking_rent_psf && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">
                          Asking Rent
                        </p>
                        <p className="text-xl font-bold">
                          ${listing.asking_rent_psf}/SF
                        </p>
                      </div>
                    )}
                  {(listing.deal_type === 'Sale' || listing.deal_type === 'Both') &&
                    listing.asking_sale_price && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">
                          Asking Price
                        </p>
                        <p className="text-xl font-bold">
                          {formatCurrency(listing.asking_sale_price)}
                        </p>
                      </div>
                    )}
                  {listing.op_costs && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        Operating Costs
                      </p>
                      <p className="font-medium">${listing.op_costs}/SF</p>
                    </div>
                  )}
                  {listing.taxes && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        Taxes ($/SF)
                      </p>
                      <p className="font-medium">${listing.taxes}/SF</p>
                    </div>
                  )}
                  {listing.assessed_value && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        Assessed Value
                      </p>
                      <p className="font-medium">{formatCurrency(listing.assessed_value)}</p>
                    </div>
                  )}
                  {listing.estimated_annual_tax && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        Est. Annual Tax
                      </p>
                      <p className="font-medium">{formatCurrency(listing.estimated_annual_tax)}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Linked Deal */}
              <LinkedDealPanel listing={listing} />
              </div>
            </div>

            {/* Assignment & Owner */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Assignment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      Primary Agent
                    </p>
                    <p className="font-medium">
                      {listing.assigned_agent?.name || 'Unassigned'}
                    </p>
                  </div>
                  {listing.secondary_agent && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        Secondary Agent
                      </p>
                      <p className="font-medium">{listing.secondary_agent.name}</p>
                    </div>
                  )}
                  {listing.owner_name && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        Owner/Landlord
                      </p>
                      <p className="font-medium">{listing.owner_name}</p>
                      {listing.owner_contact && (
                        <p className="text-sm text-muted-foreground">
                          {listing.owner_contact}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Marketing Content */}
              {(listing.description || listing.broker_remarks) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Marketing Content
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {listing.description && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                          Description
                        </p>
                        <p className="text-sm whitespace-pre-wrap">
                          {listing.description}
                        </p>
                      </div>
                    )}
                    {listing.broker_remarks && (
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                          Broker Remarks
                        </p>
                        <p className="text-sm whitespace-pre-wrap">
                          {listing.broker_remarks}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="market">
            <MarketIntelligenceSection listing={listing} />
          </TabsContent>

          <TabsContent value="documents">
            <InternalListingDocumentsSection listingId={listing.id} />
          </TabsContent>

          <TabsContent value="inquiries" className="space-y-6">
            <ToursSection listingId={listing.id} listingAddress={listing.address} listingNumber={listing.listing_number} />
            <InquiriesSection listingId={listing.id} />
          </TabsContent>

          <TabsContent value="marketing">
           <MarketingSection 
             listing={listing} 
             onPhotoUpdate={(url) => refetch()}
           />
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Status History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {statusHistory && statusHistory.length > 0 ? (
                  <div className="space-y-4">
                    {statusHistory.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-start gap-3 pb-4 border-b last:border-0"
                      >
                        <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                        <div className="flex-1">
                          <p className="font-medium">
                            Status changed from{' '}
                            <span className="text-muted-foreground">
                              {entry.previous_status || 'New'}
                            </span>{' '}
                            to{' '}
                            <Badge
                              variant="outline"
                              className={`font-medium border ${
                                statusColors[entry.new_status] || ''
                              }`}
                            >
                              {entry.new_status}
                            </Badge>
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(entry.changed_at), 'PPp')}
                          </p>
                          {entry.notes && (
                            <p className="text-sm mt-1">{entry.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No status changes recorded yet
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <InternalListingEditDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          listing={listing}
          onSubmit={handleEditSubmit}
          isSubmitting={updateListing.isPending}
        />
      </div>
    </AppLayout>
  );
}
