import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { ProspectsTable } from '@/components/prospects/ProspectsTable';
import { ProspectFormDialog } from '@/components/prospects/ProspectFormDialog';
import { useProspects } from '@/hooks/useProspects';
import { Button } from '@/components/ui/button';
import { UserSearch, Plus, Mail, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Prospect } from '@/types/prospect';

export default function Prospects() {
  const { data: prospects, isLoading } = useProspects();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProspect, setEditingProspect] = useState<Prospect | null>(null);
  const [sendingDigest, setSendingDigest] = useState(false);

  const handleEdit = (prospect: Prospect) => {
    setEditingProspect(prospect);
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setEditingProspect(null);
  };

  const handleSendDigest = async () => {
    setSendingDigest(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dormant-prospects-digest`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send digest');
      }

      if (result.sent === 0) {
        toast.info(result.message || 'No prospects or tasks to report. No emails sent.');
      } else {
        toast.success(`Prospects digest sent to ${result.sent} user${result.sent !== 1 ? 's' : ''}.`);
      }
    } catch (error) {
      console.error('Error sending digest:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send digest');
    } finally {
      setSendingDigest(false);
    }
  };

  return (
    <AppLayout>
      <div className="p-6 lg:p-8">
        <PageHeader
          title="Prospects"
          icon={UserSearch}
          actions={
            <div className="flex gap-2">
              <Button onClick={handleSendDigest} disabled={sendingDigest} className="bg-amber-500 hover:bg-amber-600 text-white border-0 shadow-md">
                {sendingDigest ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4 mr-2" />
                )}
                Send Digest
              </Button>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                New Prospect
              </Button>
            </div>
          }
        />
        <ProspectsTable prospects={prospects || []} isLoading={isLoading} onEdit={handleEdit} />
        <ProspectFormDialog open={dialogOpen} onOpenChange={handleClose} prospect={editingProspect} />
      </div>
    </AppLayout>
  );
}
