import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Calendar, User, Building2, Trash2, Edit2 } from 'lucide-react';
import { useInternalListingTours, InternalListingTour, TourFormData } from '@/hooks/useInternalListingTours';
import { TourFormDialog } from './TourFormDialog';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { format } from 'date-fns';

interface ToursSectionProps {
  listingId: string;
}

export function ToursSection({ listingId }: ToursSectionProps) {
  const { tours, isLoading, createTour, updateTour, deleteTour } =
    useInternalListingTours(listingId);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTour, setEditingTour] = useState<InternalListingTour | null>(null);
  const [deletingTourId, setDeletingTourId] = useState<string | null>(null);

  const handleCreate = (data: TourFormData) => {
    createTour.mutate(
      { ...data, listing_id: listingId },
      { onSuccess: () => setIsFormOpen(false) }
    );
  };

  const handleUpdate = (data: TourFormData) => {
    if (!editingTour) return;
    updateTour.mutate(
      { ...data, id: editingTour.id },
      { onSuccess: () => setEditingTour(null) }
    );
  };

  const handleDelete = () => {
    if (!deletingTourId) return;
    deleteTour.mutate(deletingTourId, {
      onSuccess: () => setDeletingTourId(null),
    });
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Property Tours
            {tours.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {tours.length}
              </Badge>
            )}
          </CardTitle>
          <Button size="sm" onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Log Tour
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading tours...</p>
          ) : tours.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No tours logged yet. Click "Log Tour" to record a property showing.
            </p>
          ) : (
            <div className="space-y-3">
              {tours.map((tour) => (
                <TourCard
                  key={tour.id}
                  tour={tour}
                  onEdit={() => setEditingTour(tour)}
                  onDelete={() => setDeletingTourId(tour.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <TourFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleCreate}
        isSubmitting={createTour.isPending}
      />

      {/* Edit Dialog */}
      <TourFormDialog
        open={!!editingTour}
        onOpenChange={(open) => !open && setEditingTour(null)}
        tour={editingTour}
        onSubmit={handleUpdate}
        isSubmitting={updateTour.isPending}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deletingTourId}
        onOpenChange={(open) => !open && setDeletingTourId(null)}
        title="Delete Tour"
        description="Are you sure you want to delete this tour record? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        variant="destructive"
      />
    </>
  );
}

interface TourCardProps {
  tour: InternalListingTour;
  onEdit: () => void;
  onDelete: () => void;
}

function TourCard({ tour, onEdit, onDelete }: TourCardProps) {
  const hasPartyInfo =
    tour.touring_party_name || tour.touring_party_company;

  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          {format(new Date(tour.tour_date), 'MMM d, yyyy h:mm a')}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onEdit}
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        {/* Touring Party */}
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            Touring Party
          </p>
          {hasPartyInfo ? (
            <div className="flex items-start gap-1.5">
              <User className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                {tour.touring_party_name && (
                  <p className="font-medium">{tour.touring_party_name}</p>
                )}
                {tour.touring_party_company && (
                  <p className="text-muted-foreground">
                    {tour.touring_party_company}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground italic">Not specified</p>
          )}
        </div>

        {/* Touring Agent */}
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            Showed By
          </p>
          {tour.touring_agent ? (
            <div className="flex items-start gap-1.5">
              <Building2 className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="font-medium">{tour.touring_agent.name}</p>
                {tour.touring_agent.brokerage?.name && (
                  <p className="text-muted-foreground text-xs">
                    {tour.touring_agent.brokerage.name}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground italic">Not specified</p>
          )}
        </div>
      </div>

      {tour.notes && (
        <div className="pt-2 border-t">
          <p className="text-sm text-muted-foreground">{tour.notes}</p>
        </div>
      )}
    </div>
  );
}
