import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { ProspectsTable } from '@/components/prospects/ProspectsTable';
import { ProspectFormDialog } from '@/components/prospects/ProspectFormDialog';
import { useProspects } from '@/hooks/useProspects';
import { Button } from '@/components/ui/button';
import { UserSearch, Plus } from 'lucide-react';
import type { Prospect } from '@/types/prospect';

export default function Prospects() {
  const { data: prospects, isLoading } = useProspects();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProspect, setEditingProspect] = useState<Prospect | null>(null);

  const handleEdit = (prospect: Prospect) => {
    setEditingProspect(prospect);
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setEditingProspect(null);
  };

  return (
    <AppLayout>
      <div className="p-6 lg:p-8">
        <PageHeader
          title="Prospects"
          icon={UserSearch}
          actions={
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Prospect
            </Button>
          }
        />
        <ProspectsTable prospects={prospects || []} isLoading={isLoading} onEdit={handleEdit} />
        <ProspectFormDialog open={dialogOpen} onOpenChange={handleClose} prospect={editingProspect} />
      </div>
    </AppLayout>
  );
}
