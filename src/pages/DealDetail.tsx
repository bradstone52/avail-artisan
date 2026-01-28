import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDeal, useUpdateDeal } from '@/hooks/useDeals';
import { useDealDocuments } from '@/hooks/useDealDocuments';
import { useDealConditions } from '@/hooks/useDealConditions';
import { useDealDeposits } from '@/hooks/useDealDeposits';
import { DealBasicSection } from '@/components/deals/detail/DealBasicSection';
import { DealAgentsSection } from '@/components/deals/detail/DealAgentsSection';
import { DealPartiesSection } from '@/components/deals/detail/DealPartiesSection';
import { DealConditionsSection } from '@/components/deals/detail/DealConditionsSection';
import { DealDepositsSection } from '@/components/deals/detail/DealDepositsSection';
import { DealFinancialSection } from '@/components/deals/detail/DealFinancialSection';
import { DealDocumentsSection } from '@/components/deals/detail/DealDocumentsSection';
import { DealImportantDatesSection } from '@/components/deals/detail/DealImportantDatesSection';
import { DealSheetGenerator } from '@/components/documents/DealSheetGenerator';
import { Skeleton } from '@/components/ui/skeleton';
import { Briefcase, ArrowLeft, FileText, DollarSign, Users, Building2, FileCheck } from 'lucide-react';

export default function DealDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: deal, isLoading } = useDeal(id);
  const updateDeal = useUpdateDeal();
  const { documents, uploadDocument, deleteDocument, isUploading } = useDealDocuments(id);
  const { conditions, addCondition, updateCondition, deleteCondition } = useDealConditions(id);
  const { deposits, addDeposit, updateDeposit, deleteDeposit } = useDealDeposits(id);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6 lg:p-8">
          <Skeleton className="h-10 w-64 mb-6" />
          <Skeleton className="h-96 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!deal) {
    return (
      <AppLayout>
        <div className="p-6 lg:p-8">
          <PageHeader title="Deal Not Found" icon={Briefcase} />
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
        <div className="flex items-center gap-4 mb-6">
          <Button onClick={() => navigate('/deals')} variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <PageHeader 
            title={deal.deal_number ? `Deal #${deal.deal_number}` : deal.address} 
            icon={Briefcase} 
          />
        </div>

        <Tabs defaultValue="details" className="space-y-6">
          <TabsList className="flex-wrap">
            <TabsTrigger value="details" className="gap-2">
              <FileText className="w-4 h-4" />
              Details
            </TabsTrigger>
            <TabsTrigger value="agents" className="gap-2">
              <Users className="w-4 h-4" />
              Agents
            </TabsTrigger>
            <TabsTrigger value="parties" className="gap-2">
              <Building2 className="w-4 h-4" />
              Parties
            </TabsTrigger>
            <TabsTrigger value="conditions" className="gap-2">
              <FileCheck className="w-4 h-4" />
              Conditions
            </TabsTrigger>
            <TabsTrigger value="financial" className="gap-2">
              <DollarSign className="w-4 h-4" />
              Financial
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-2">
              <FileText className="w-4 h-4" />
              Documents
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-6">
            <DealBasicSection deal={deal} onUpdate={updateDeal.mutateAsync} />
            <DealImportantDatesSection deal={deal} conditions={conditions} deposits={deposits} />
          </TabsContent>

          <TabsContent value="agents" className="space-y-6">
            <DealAgentsSection deal={deal} onUpdate={updateDeal.mutateAsync} />
          </TabsContent>

          <TabsContent value="parties" className="space-y-6">
            <DealPartiesSection deal={deal} onUpdate={updateDeal.mutateAsync} />
          </TabsContent>

          <TabsContent value="conditions" className="space-y-6">
            <DealConditionsSection 
              conditions={conditions} 
              onAdd={addCondition}
              onUpdate={updateCondition}
              onDelete={deleteCondition}
            />
            <DealDepositsSection 
              deposits={deposits}
              onAdd={addDeposit}
              onUpdate={updateDeposit}
              onDelete={deleteDeposit}
            />
          </TabsContent>

          <TabsContent value="financial" className="space-y-6">
            <DealFinancialSection deal={deal} onUpdate={updateDeal.mutateAsync} />
          </TabsContent>

          <TabsContent value="documents" className="space-y-6">
            <DealDocumentsSection 
              documents={documents}
              onUpload={uploadDocument}
              onDelete={deleteDocument}
              isUploading={isUploading}
            />
            <DealSheetGenerator deal={deal} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
