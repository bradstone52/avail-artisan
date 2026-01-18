import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useRecipients, Recipient, RecipientInsert } from "@/hooks/useRecipients";
import { useBatches, useAppUsers } from "@/hooks/useBatches";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Users, History } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SendHistoryTable } from "@/components/recipients/SendHistoryTable";
import { BatchHeader } from "@/components/recipients/BatchHeader";
import { RecipientTrackingTable } from "@/components/recipients/RecipientTrackingTable";

const emptyForm: RecipientInsert = {
  company_name: "",
  contact_name: "",
  title: null,
  email: "",
  notes: null,
};

export default function Recipients() {
  const { createRecipient, updateRecipient, deleteRecipient } = useRecipients();
  const { 
    activeBatch, 
    activeBatchLoading, 
    allBatches, 
    useRecipientsWithStatus, 
    createBatch, 
    updateRecipientStatus 
  } = useBatches();
  const { data: appUsers = [] } = useAppUsers();

  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingRecipient, setEditingRecipient] = useState<Recipient | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState<RecipientInsert>(emptyForm);

  // Set selected batch to active batch on load
  useEffect(() => {
    if (activeBatch && !selectedBatchId) {
      setSelectedBatchId(activeBatch.id);
    }
  }, [activeBatch, selectedBatchId]);

  // Get recipients with status for selected batch
  const { data: recipientsWithStatus = [], isLoading: recipientsLoading } = 
    useBatches().useRecipientsWithStatus(selectedBatchId);

  // Calculate stats
  const stats = useMemo(() => {
    const total = recipientsWithStatus.length;
    const replied = recipientsWithStatus.filter(r => r.status?.replied).length;
    return {
      total,
      replied,
      notReplied: total - replied,
    };
  }, [recipientsWithStatus]);

  const isActiveBatch = selectedBatchId === activeBatch?.id;

  const openCreate = () => {
    setEditingRecipient(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (recipient: Recipient) => {
    setEditingRecipient(recipient);
    setForm({
      company_name: recipient.company_name,
      contact_name: recipient.contact_name,
      title: recipient.title,
      email: recipient.email,
      notes: recipient.notes,
    });
    setDialogOpen(true);
  };

  const openDelete = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRecipient) {
      await updateRecipient.mutateAsync({ id: editingRecipient.id, ...form });
    } else {
      await createRecipient.mutateAsync(form);
    }
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (deletingId) {
      await deleteRecipient.mutateAsync(deletingId);
      setDeleteDialogOpen(false);
      setDeletingId(null);
    }
  };

  const handleUpdateStatus = (recipientId: string, updates: {
    replied?: boolean;
    reply_date?: string | null;
    next_step?: string | null;
    owner_user_id?: string | null;
  }) => {
    if (!selectedBatchId) return;
    updateRecipientStatus.mutate({
      batchId: selectedBatchId,
      recipientId,
      updates,
    });
  };

  const handleCreateBatch = () => {
    createBatch.mutate(undefined, {
      onSuccess: (newBatch) => {
        setSelectedBatchId(newBatch.id);
      },
    });
  };

  const isLoading = activeBatchLoading || recipientsLoading;

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Distribution</h1>
          </div>
        </div>

        <Tabs defaultValue="recipients" className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="recipients" className="gap-2">
                <Users className="h-4 w-4" />
                Recipients
              </TabsTrigger>
              <TabsTrigger value="sends" className="gap-2">
                <History className="h-4 w-4" />
                Send History
              </TabsTrigger>
            </TabsList>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add Recipient
            </Button>
          </div>

          <TabsContent value="recipients" className="space-y-4">
            {/* Batch Header */}
            <BatchHeader
              activeBatch={activeBatch || null}
              allBatches={allBatches}
              selectedBatchId={selectedBatchId}
              onSelectBatch={setSelectedBatchId}
              onCreateBatch={handleCreateBatch}
              isCreating={createBatch.isPending}
              stats={stats}
            />

            {/* Recipients Table */}
            {isLoading ? (
              <div className="text-muted-foreground">Loading...</div>
            ) : !selectedBatchId ? (
              <div className="border rounded-lg p-8 text-center text-muted-foreground">
                Click "New Batch Send" to start tracking replies for a new distribution.
              </div>
            ) : (
              <RecipientTrackingTable
                recipients={recipientsWithStatus}
                batchId={selectedBatchId}
                isActiveBatch={isActiveBatch}
                appUsers={appUsers}
                onUpdateStatus={handleUpdateStatus}
                onEditRecipient={openEdit}
                onDeleteRecipient={openDelete}
              />
            )}
          </TabsContent>

          <TabsContent value="sends">
            <SendHistoryTable />
          </TabsContent>
        </Tabs>

        {/* Add/Edit Recipient Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingRecipient ? "Edit Recipient" : "Add Recipient"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company_name">Company Name *</Label>
                <Input
                  id="company_name"
                  value={form.company_name}
                  onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_name">Contact Name *</Label>
                <Input
                  id="contact_name"
                  value={form.contact_name}
                  onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={form.title || ""}
                  onChange={(e) => setForm({ ...form, title: e.target.value || null })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={form.notes || ""}
                  onChange={(e) => setForm({ ...form, notes: e.target.value || null })}
                  rows={3}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createRecipient.isPending || updateRecipient.isPending}>
                  {editingRecipient ? "Save Changes" : "Add Recipient"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Recipient?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this recipient and all associated send records.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
