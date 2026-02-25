import * as React from 'react';
import { Button } from '@/components/ui/button';
import { ProspectsTable } from '@/components/prospects/ProspectsTable';
import { ProspectFormDialog } from '@/components/prospects/ProspectFormDialog';
import { Plus, Mail, Loader2 } from 'lucide-react';
import { useProspects } from '@/hooks/useProspects';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Prospect } from '@/types/prospect';

export function CREProspectsTab() {
  const { data: prospects, isLoading } = useProspects();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingProspect, setEditingProspect] = React.useState<Prospect | null>(null);
  const [sendingDigest, setSendingDigest] = React.useState(false);

  const handleEdit = (prospect: Prospect) => { setEditingProspect(prospect); setDialogOpen(true); };
  const handleClose = () => { setDialogOpen(false); setEditingProspect(null); };

  const handleSendDigest = async () => {
    setSendingDigest(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dormant-prospects-digest`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to send digest');
      if (result.sent === 0) {
        toast.info(result.message || 'No prospects or tasks to report. No emails sent.');
      } else {
        toast.success(`Prospects digest sent to ${result.sent} user${result.sent !== 1 ? 's' : ''}.`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send digest');
    } finally {
      setSendingDigest(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={handleSendDigest} disabled={sendingDigest}>
          {sendingDigest ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
          Send Digest
        </Button>
        <Button onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 mr-2" />New Prospect</Button>
      </div>
      <ProspectsTable prospects={prospects || []} isLoading={isLoading} onEdit={handleEdit} />
      <ProspectFormDialog open={dialogOpen} onOpenChange={handleClose} prospect={editingProspect} />
    </div>
  );
}
