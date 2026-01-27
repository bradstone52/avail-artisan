import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { DealsTable } from '@/components/deals/DealsTable';
import { DealFormDialog } from '@/components/deals/DealFormDialog';
import { useDeals } from '@/hooks/useDeals';
import { Button } from '@/components/ui/button';
import { Briefcase, Plus } from 'lucide-react';
import type { Deal } from '@/types/database';

export default function Deals() {
  const { data: deals, isLoading } = useDeals();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);

  const handleEdit = (deal: Deal) => {
    setEditingDeal(deal);
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setEditingDeal(null);
  };

  return (
    <AppLayout>
      <div className="p-6 lg:p-8">
        <PageHeader
          title="Deals"
          icon={Briefcase}
          actions={
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Deal
            </Button>
          }
        />
        <DealsTable deals={deals || []} isLoading={isLoading} onEdit={handleEdit} />
        <DealFormDialog open={dialogOpen} onOpenChange={handleClose} deal={editingDeal} />
      </div>
    </AppLayout>
  );
}
