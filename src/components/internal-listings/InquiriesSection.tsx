import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  useInternalListingInquiries,
  InternalListingInquiry,
  InquiryFormData,
  INQUIRY_STAGES,
} from '@/hooks/useInternalListingInquiries';
import { InquiryFormDialog } from './InquiryFormDialog';
import { InquiryCard } from './InquiryCard';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Mail, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InquiriesSectionProps {
  listingId: string;
}

const stageColors: Record<string, string> = {
  New: 'bg-blue-500',
  Contacted: 'bg-cyan-500',
  'Tour Booked': 'bg-amber-500',
  'Tour Completed': 'bg-yellow-500',
  'Offer Sent': 'bg-orange-500',
  'LOI Pending': 'bg-purple-500',
  Completed: 'bg-green-500',
  Lost: 'bg-gray-400',
};

export function InquiriesSection({ listingId }: InquiriesSectionProps) {
  const {
    inquiries,
    isLoading,
    createInquiry,
    updateInquiry,
    deleteInquiry,
    updateStage,
  } = useInternalListingInquiries(listingId);

  const [formOpen, setFormOpen] = useState(false);
  const [editingInquiry, setEditingInquiry] = useState<InternalListingInquiry | null>(
    null
  );
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState<string | null>(null);

  const handleSubmit = (data: InquiryFormData) => {
    if (editingInquiry) {
      updateInquiry.mutate(
        { id: editingInquiry.id, ...data },
        {
          onSuccess: () => {
            setFormOpen(false);
            setEditingInquiry(null);
          },
        }
      );
    } else {
      createInquiry.mutate(
        { listing_id: listingId, ...data },
        {
          onSuccess: () => setFormOpen(false),
        }
      );
    }
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteInquiry.mutate(deleteId, {
        onSuccess: () => setDeleteId(null),
      });
    }
  };

  const handleEdit = (inquiry: InternalListingInquiry) => {
    setEditingInquiry(inquiry);
    setFormOpen(true);
  };

  // Calculate stage counts
  const stageCounts = INQUIRY_STAGES.reduce((acc, stage) => {
    acc[stage] = inquiries.filter((i) => i.stage === stage).length;
    return acc;
  }, {} as Record<string, number>);

  const filteredInquiries = stageFilter
    ? inquiries.filter((i) => i.stage === stageFilter)
    : inquiries;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          <h3 className="font-bold text-lg">Inquiries</h3>
          <Badge variant="secondary">{inquiries.length}</Badge>
        </div>
        <Button className="gap-2" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Inquiry
        </Button>
      </div>

      {/* Stage Pipeline */}
      {inquiries.length > 0 && (
        <Card className="border-2 border-foreground shadow-[3px_3px_0_hsl(var(--foreground))]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={stageFilter === null ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStageFilter(null)}
                className="h-7 text-xs"
              >
                All ({inquiries.length})
              </Button>
              {INQUIRY_STAGES.map((stage) => {
                const count = stageCounts[stage];
                if (count === 0) return null;
                return (
                  <Button
                    key={stage}
                    variant={stageFilter === stage ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStageFilter(stage)}
                    className="h-7 text-xs gap-1.5"
                  >
                    <div
                      className={cn('w-2 h-2 rounded-full', stageColors[stage])}
                    />
                    {stage} ({count})
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inquiry Cards */}
      {filteredInquiries.length === 0 ? (
        <EmptyState
          icon={Mail}
          title={stageFilter ? `No ${stageFilter} inquiries` : 'No inquiries yet'}
          description={
            stageFilter
              ? 'Try selecting a different stage filter'
              : 'Add your first inquiry to start tracking leads for this listing'
          }
          actionLabel={!stageFilter ? 'Add Inquiry' : undefined}
          onAction={!stageFilter ? () => setFormOpen(true) : undefined}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredInquiries.map((inquiry) => (
            <InquiryCard
              key={inquiry.id}
              inquiry={inquiry}
              onEdit={() => handleEdit(inquiry)}
              onDelete={() => setDeleteId(inquiry.id)}
              onStageChange={(stage) =>
                updateStage.mutate({ id: inquiry.id, stage })
              }
            />
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <InquiryFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingInquiry(null);
        }}
        inquiry={editingInquiry}
        onSubmit={handleSubmit}
        isSubmitting={createInquiry.isPending || updateInquiry.isPending}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Inquiry"
        description="This will permanently delete this inquiry and all associated activity. This action cannot be undone."
        onConfirm={handleDelete}
        confirmLabel="Delete"
        variant="destructive"
      />
    </div>
  );
}
