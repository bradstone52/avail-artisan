import * as React from 'react';
import { Button } from '@/components/ui/button';
import { ProspectsTable } from '@/components/prospects/ProspectsTable';
import { ProspectFormDialog } from '@/components/prospects/ProspectFormDialog';
import { Plus } from 'lucide-react';
import { useProspects } from '@/hooks/useProspects';
import type { Prospect } from '@/types/prospect';

export function CREProspectsTab() {
  const { data: prospects, isLoading } = useProspects();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingProspect, setEditingProspect] = React.useState<Prospect | null>(null);
  const handleEdit = (prospect: Prospect) => { setEditingProspect(prospect); setDialogOpen(true); };
  const handleClose = () => { setDialogOpen(false); setEditingProspect(null); };
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 mr-2" />New Prospect</Button>
      </div>
      <ProspectsTable prospects={prospects || []} isLoading={isLoading} onEdit={handleEdit} />
      <ProspectFormDialog open={dialogOpen} onOpenChange={handleClose} prospect={editingProspect} />
    </div>
  );
}
