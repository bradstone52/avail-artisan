import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { useProspect, useDeleteProspect } from '@/hooks/useProspects';
import { ProspectViewCard } from '@/components/prospects/ProspectViewCard';
import { FollowUpDatesSection } from '@/components/prospects/FollowUpDatesSection';
import { MatchingListingsSection } from '@/components/prospects/MatchingListingsSection';
import { ProspectFormDialog } from '@/components/prospects/ProspectFormDialog';
import { ProspectTasksSection } from '@/components/prospects/ProspectTasksSection';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Trash2, UserSearch } from 'lucide-react';

export default function ProspectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: prospect, isLoading } = useProspect(id);
  const deleteProspect = useDeleteProspect();
  
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleDelete = async () => {
    if (!id) return;
    
    try {
      await deleteProspect.mutateAsync(id);
      navigate('/prospects');
    } catch (error) {
      // Error handled by mutation
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6 lg:p-8">
          <Skeleton className="h-10 w-64 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!prospect) {
    return (
      <AppLayout>
        <div className="p-6 lg:p-8">
          <div className="flex items-center gap-4 mb-6">
            <UserSearch className="w-8 h-8" />
            <h1 className="text-2xl font-bold">Prospect Not Found</h1>
          </div>
          <Button onClick={() => navigate('/prospects')} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Prospects
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Button onClick={() => navigate(-1)} variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-xl font-bold">{prospect.name}</h1>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="w-4 h-4 mr-2" />
              DELETE
            </Button>
          </div>
        </div>

        {/* Two-column content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <ProspectViewCard prospect={prospect} onEdit={() => setEditOpen(true)} />
            <FollowUpDatesSection prospect={prospect} />
          </div>
          <div className="space-y-6">
            <MatchingListingsSection prospect={prospect} />
            <ProspectTasksSection prospect={prospect} />
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <ProspectFormDialog 
        open={editOpen} 
        onOpenChange={setEditOpen} 
        prospect={prospect} 
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Prospect"
        description={`Are you sure you want to delete "${prospect.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </AppLayout>
  );
}
