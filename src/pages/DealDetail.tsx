import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { useDeal, useDeleteDeal, useUpdateDeal } from '@/hooks/useDeals';
import { useDealDocuments } from '@/hooks/useDealDocuments';
import { useDealConditions } from '@/hooks/useDealConditions';
import { useDealDeposits } from '@/hooks/useDealDeposits';
import { useDealSummaryActions } from '@/hooks/useDealSummaryActions';
import { useDealImportantDates } from '@/hooks/useDealImportantDates';
import { DealViewCard } from '@/components/deals/detail/DealViewCard';
import { DealImportantDatesSection } from '@/components/deals/detail/DealImportantDatesSection';
import { DealDocumentsCard } from '@/components/deals/detail/DealDocumentsCard';
import { DealFinancialSummaryCard } from '@/components/deals/detail/DealFinancialSummaryCard';
import { DealFormDialog } from '@/components/deals/DealFormDialog';
import { GenerateDealSheetDialog } from '@/components/deals/GenerateDealSheetDialog';
import { GenerateDealSummaryDialog } from '@/components/deals/GenerateDealSummaryDialog';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, FileText, Trash2, Briefcase, FileBarChart, MoreHorizontal, Receipt } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function DealDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: deal, isLoading } = useDeal(id);
  const { documents, uploadDocument, deleteDocument, renameDocument, isUploading } = useDealDocuments(id);
  const { conditions, addCondition, updateCondition, deleteCondition } = useDealConditions(id);
  const { deposits, addDeposit, updateDeposit, deleteDeposit } = useDealDeposits(id);
  const { actions } = useDealSummaryActions(id);
  const { importantDates: genericDates, addDate: addGenericDate, updateDate: updateGenericDate, deleteDate: deleteGenericDate } = useDealImportantDates(id);
  const deleteDeal = useDeleteDeal();
  
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [generateSheetOpen, setGenerateSheetOpen] = useState(false);
  const [generateSummaryOpen, setGenerateSummaryOpen] = useState(false);

  const handleDelete = async () => {
    if (!id) return;
    
    try {
      await deleteDeal.mutateAsync(id);
      navigate('/deals');
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

  if (!deal) {
    return (
      <AppLayout>
        <div className="p-6 lg:p-8">
          <div className="flex items-center gap-4 mb-6">
            <Briefcase className="w-8 h-8" />
            <h1 className="text-2xl font-bold">Deal Not Found</h1>
          </div>
          <Button onClick={() => navigate('/deals')} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Deals
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
            <Button onClick={() => navigate('/deals')} variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-xl font-bold">{deal.address}</h1>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              onClick={() => setGenerateSheetOpen(true)}
            >
              <FileText className="w-4 h-4 mr-2" />
              GENERATE DEAL SHEET
            </Button>
            <Button
              variant="outline"
              onClick={() => setGenerateSummaryOpen(true)}
            >
              <FileBarChart className="w-4 h-4 mr-2" />
              GENERATE DEAL SUMMARY
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                localStorage.setItem('lease-comp-prefill', JSON.stringify({
                  address: deal.address,
                  size_sf: deal.size_sf,
                  submarket: deal.submarket,
                }));
                navigate('/lease-comps/new');
              }}
            >
              <Receipt className="w-4 h-4 mr-2" />
              LOG LEASE COMP
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Two-column content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <DealViewCard deal={deal} onEdit={() => setEditOpen(true)} />
            <DealImportantDatesSection 
              deal={deal} 
              conditions={conditions} 
              deposits={deposits} 
              actions={actions}
              genericDates={genericDates}
              onAddCondition={addCondition}
              onUpdateCondition={updateCondition}
              onDeleteCondition={deleteCondition}
              onAddDeposit={addDeposit}
              onUpdateDeposit={updateDeposit}
              onDeleteDeposit={deleteDeposit}
              onAddGenericDate={addGenericDate}
              onUpdateGenericDate={updateGenericDate}
              onDeleteGenericDate={deleteGenericDate}
            />
          </div>
          <div className="space-y-6">
            <DealDocumentsCard 
              documents={documents} 
              onUpload={uploadDocument} 
              onDelete={deleteDocument}
              onRename={renameDocument}
              isUploading={isUploading}
              dealAddress={deal.address}
            />
            <DealFinancialSummaryCard deal={deal} />
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <DealFormDialog 
        open={editOpen} 
        onOpenChange={setEditOpen} 
        deal={deal} 
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Deal"
        description={`Are you sure you want to delete the deal for "${deal.address}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />

      {/* Generate Deal Sheet Dialog */}
      <GenerateDealSheetDialog
        open={generateSheetOpen}
        onOpenChange={setGenerateSheetOpen}
        deal={deal}
      />

      {/* Generate Deal Summary Dialog */}
      <GenerateDealSummaryDialog
        open={generateSummaryOpen}
        onOpenChange={setGenerateSummaryOpen}
        deal={deal}
      />
    </AppLayout>
  );
}
