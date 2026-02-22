import * as React from 'react';
import { Button } from '@/components/ui/button';
import { DealsTable } from '@/components/deals/DealsTable';
import { DealFormDialog } from '@/components/deals/DealFormDialog';
import { Plus } from 'lucide-react';
import type { Deal } from '@/types/database';
import type { DealImportantDate } from '@/hooks/useAllDealImportantDates';

interface CREDealsTabProps {
  deals: Deal[];
  importantDates?: DealImportantDate[];
}

export function CREDealsTab({ deals, importantDates }: CREDealsTabProps) {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingDeal, setEditingDeal] = React.useState<Deal | null>(null);
  const handleEdit = (deal: Deal) => { setEditingDeal(deal); setDialogOpen(true); };
  const handleClose = () => { setDialogOpen(false); setEditingDeal(null); };
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 mr-2" />New Deal</Button>
      </div>
      <DealsTable deals={deals} onEdit={handleEdit} importantDates={importantDates} />
      <DealFormDialog open={dialogOpen} onOpenChange={handleClose} deal={editingDeal} />
    </div>
  );
}
