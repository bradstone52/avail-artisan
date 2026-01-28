import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { useDeal, useDeleteDeal } from '@/hooks/useDeals';
import { useDealDocuments } from '@/hooks/useDealDocuments';
import { useDealConditions } from '@/hooks/useDealConditions';
import { useDealDeposits } from '@/hooks/useDealDeposits';
import { DealViewCard } from '@/components/deals/detail/DealViewCard';
import { DealImportantDatesSection } from '@/components/deals/detail/DealImportantDatesSection';
import { DealDocumentsCard } from '@/components/deals/detail/DealDocumentsCard';
import { DealFinancialSummaryCard } from '@/components/deals/detail/DealFinancialSummaryCard';
import { DealEditDialog } from '@/components/deals/detail/DealEditDialog';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, FileText, Edit, Trash2, Briefcase } from 'lucide-react';
import { toast } from 'sonner';
import { pdf } from '@react-pdf/renderer';
import { DealSheetPDF } from '@/components/documents/DealSheetPDF';
import { useAgents } from '@/hooks/useAgents';
import { useBrokerages } from '@/hooks/useBrokerages';

export default function DealDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: deal, isLoading } = useDeal(id);
  const { documents, uploadDocument, deleteDocument, isUploading } = useDealDocuments(id);
  const { conditions } = useDealConditions(id);
  const { deposits } = useDealDeposits(id);
  const deleteDeal = useDeleteDeal();
  
  const { data: agents } = useAgents();
  const { data: brokerages } = useBrokerages();
  
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Helper to get agent/brokerage names for PDF
  const getAgent = (agentId: string | null | undefined) => agents?.find(a => a.id === agentId);
  const getBrokerage = (brokerageId: string | null | undefined) => brokerages?.find(b => b.id === brokerageId);

  const handleGenerateDealSheet = async () => {
    if (!deal) return;
    
    setGenerating(true);
    try {
      const blob = await pdf(
        <DealSheetPDF 
          deal={deal} 
          conditions={conditions}
          deposits={deposits}
          getAgent={getAgent}
          getBrokerage={getBrokerage}
        />
      ).toBlob();
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${deal.address.replace(/[^a-zA-Z0-9]/g, '_')}_Dealsheet.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Deal Sheet PDF generated successfully');
    } catch (error) {
      console.error('Error generating deal sheet:', error);
      toast.error('Failed to generate deal sheet');
    } finally {
      setGenerating(false);
    }
  };

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
            <div>
              <h1 className="text-xl font-bold">
                {deal.deal_number ? `Deal #${deal.deal_number}` : 'Deal Details'}
              </h1>
              <p className="text-muted-foreground text-sm">{deal.address}</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              onClick={handleGenerateDealSheet}
              disabled={generating}
            >
              <FileText className="w-4 h-4 mr-2" />
              {generating ? 'Generating...' : 'GENERATE DEAL SHEET'}
            </Button>
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Edit className="w-4 h-4 mr-2" />
              EDIT
            </Button>
            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="w-4 h-4 mr-2" />
              DELETE
            </Button>
          </div>
        </div>

        {/* Two-column content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <DealViewCard deal={deal} />
            <DealImportantDatesSection deal={deal} conditions={conditions} deposits={deposits} />
          </div>
          <div className="space-y-6">
            <DealDocumentsCard 
              documents={documents} 
              onUpload={uploadDocument} 
              onDelete={deleteDocument}
              isUploading={isUploading}
            />
            <DealFinancialSummaryCard deal={deal} />
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <DealEditDialog 
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
    </AppLayout>
  );
}
