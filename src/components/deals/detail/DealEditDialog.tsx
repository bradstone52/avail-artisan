import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DealBasicSection } from './DealBasicSection';
import { DealAgentsSection } from './DealAgentsSection';
import { DealPartiesSection } from './DealPartiesSection';
import { DealConditionsSection } from './DealConditionsSection';
import { DealDepositsSection } from './DealDepositsSection';
import { DealFinancialSection } from './DealFinancialSection';
import { useUpdateDeal } from '@/hooks/useDeals';
import { useDealConditions } from '@/hooks/useDealConditions';
import { useDealDeposits } from '@/hooks/useDealDeposits';
import { FileText, Users, Building2, FileCheck, DollarSign } from 'lucide-react';
import type { Deal } from '@/types/database';

interface DealEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal: Deal;
}

export function DealEditDialog({ open, onOpenChange, deal }: DealEditDialogProps) {
  const updateDeal = useUpdateDeal();
  const { conditions, addCondition, updateCondition, deleteCondition } = useDealConditions(deal.id);
  const { deposits, addDeposit, updateDeposit, deleteDeposit } = useDealDeposits(deal.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Edit Deal - {deal.address}</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="details" className="w-full">
          <div className="px-6">
            <TabsList className="w-full justify-start flex-wrap h-auto gap-1 bg-transparent p-0">
              <TabsTrigger value="details" className="gap-2 data-[state=active]:bg-muted">
                <FileText className="w-4 h-4" />
                Details
              </TabsTrigger>
              <TabsTrigger value="agents" className="gap-2 data-[state=active]:bg-muted">
                <Users className="w-4 h-4" />
                Agents
              </TabsTrigger>
              <TabsTrigger value="parties" className="gap-2 data-[state=active]:bg-muted">
                <Building2 className="w-4 h-4" />
                Parties
              </TabsTrigger>
              <TabsTrigger value="conditions" className="gap-2 data-[state=active]:bg-muted">
                <FileCheck className="w-4 h-4" />
                Conditions
              </TabsTrigger>
              <TabsTrigger value="financial" className="gap-2 data-[state=active]:bg-muted">
                <DollarSign className="w-4 h-4" />
                Financial
              </TabsTrigger>
            </TabsList>
          </div>
          
          <ScrollArea className="h-[calc(90vh-180px)] px-6 pb-6">
            <TabsContent value="details" className="mt-4 space-y-6">
              <DealBasicSection deal={deal} onUpdate={updateDeal.mutateAsync} />
            </TabsContent>

            <TabsContent value="agents" className="mt-4 space-y-6">
              <DealAgentsSection deal={deal} onUpdate={updateDeal.mutateAsync} />
            </TabsContent>

            <TabsContent value="parties" className="mt-4 space-y-6">
              <DealPartiesSection deal={deal} onUpdate={updateDeal.mutateAsync} />
            </TabsContent>

            <TabsContent value="conditions" className="mt-4 space-y-6">
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

            <TabsContent value="financial" className="mt-4 space-y-6">
              <DealFinancialSection deal={deal} onUpdate={updateDeal.mutateAsync} />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
