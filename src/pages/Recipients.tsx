import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useRecipients, Recipient, RecipientInsert } from "@/hooks/useRecipients";
import { useBatches, Batch, RecipientWithBatchStatus } from "@/hooks/useBatches";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Users, FolderOpen, Send } from "lucide-react";
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
import { MasterRecipientTable } from "@/components/recipients/MasterRecipientTable";
import { BatchList } from "@/components/recipients/BatchList";
import { BatchDetailView } from "@/components/recipients/BatchDetailView";
import { NewBatchDialog } from "@/components/recipients/NewBatchDialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const OWNER_OPTIONS = ["Brad", "Doug", "Angel", "Unassigned"] as const;

const emptyForm: RecipientInsert = {
  company_name: "",
  contact_name: "",
  title: null,
  email: "",
  notes: null,
  default_owner: "Unassigned",
};

export default function Recipients() {
  const { recipients, isLoading: recipientsLoading, createRecipient, updateRecipient, deleteRecipient } = useRecipients();
  const { 
    allBatches, 
    allBatchesLoading,
    useBatchRecipients,
    createBatch, 
    updateBatchStatus,
    updateRecipientStatus,
  } = useBatches();

  const [activeTab, setActiveTab] = useState("recipients");
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<Set<string>>(new Set());
  const [viewingBatchId, setViewingBatchId] = useState<string | null>(null);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newBatchDialogOpen, setNewBatchDialogOpen] = useState(false);
  const [editingRecipient, setEditingRecipient] = useState<Recipient | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState<RecipientInsert>(emptyForm);

  // Get batch recipients when viewing a batch
  const { data: batchRecipients = [], isLoading: batchRecipientsLoading } = 
    useBatchRecipients(viewingBatchId);

  // Get batch stats for batch list
  const batchesWithStats = useQuery({
    queryKey: ["batch_stats", allBatches.map(b => b.id).join(",")],
    queryFn: async () => {
      if (allBatches.length === 0) return [];

      const results = await Promise.all(
        allBatches.map(async (batch) => {
          const { data, error } = await supabase
            .from("distribution_recipient_batch_status")
            .select("replied")
            .eq("batch_id", batch.id);

          if (error) throw error;

          return {
            ...batch,
            totalRecipients: data?.length || 0,
            repliedCount: data?.filter(r => r.replied).length || 0,
          };
        })
      );

      return results;
    },
    enabled: allBatches.length > 0,
  });

  // Find current batch being viewed
  const currentBatch = allBatches.find(b => b.id === viewingBatchId);

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
      default_owner: recipient.default_owner || "Unassigned",
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

  const handleNewBatchClick = () => {
    if (selectedRecipientIds.size === 0) {
      return;
    }
    setNewBatchDialogOpen(true);
  };

  const handleCreateBatch = (name: string) => {
    createBatch.mutate(
      { name, recipientIds: Array.from(selectedRecipientIds) },
      {
        onSuccess: (newBatch) => {
          setNewBatchDialogOpen(false);
          setSelectedRecipientIds(new Set());
          setViewingBatchId(newBatch.id);
          setActiveTab("batches");
        },
      }
    );
  };

  const handleOpenBatch = (batchId: string) => {
    setViewingBatchId(batchId);
  };

  const handleBackFromBatch = () => {
    setViewingBatchId(null);
  };

  const handleUpdateRecipientStatus = (recipientId: string, updates: {
    replied?: boolean;
    reply_date?: string | null;
    next_step?: string | null;
    owner?: string;
  }) => {
    if (!viewingBatchId) return;
    updateRecipientStatus.mutate({
      batchId: viewingBatchId,
      recipientId,
      updates,
    });
  };

  const handleUpdateBatchStatus = (status: string) => {
    if (!viewingBatchId) return;
    updateBatchStatus.mutate({ batchId: viewingBatchId, status });
  };

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Distribution</h1>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="recipients" className="gap-2">
                <Users className="h-4 w-4" />
                Recipients
              </TabsTrigger>
              <TabsTrigger value="batches" className="gap-2">
                <FolderOpen className="h-4 w-4" />
                Batches
              </TabsTrigger>
            </TabsList>
            
            {activeTab === "recipients" && (
              <div className="flex items-center gap-2">
                <Button 
                  onClick={handleNewBatchClick} 
                  disabled={selectedRecipientIds.size === 0}
                  variant="default"
                >
                  <Send className="h-4 w-4 mr-2" />
                  New Batch Send ({selectedRecipientIds.size})
                </Button>
                <Button onClick={openCreate} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Recipient
                </Button>
              </div>
            )}
          </div>

          <TabsContent value="recipients" className="space-y-4">
            {recipientsLoading ? (
              <div className="text-muted-foreground">Loading recipients...</div>
            ) : (
              <MasterRecipientTable
                recipients={recipients}
                selectedIds={selectedRecipientIds}
                onSelectionChange={setSelectedRecipientIds}
                onEditRecipient={openEdit}
                onDeleteRecipient={openDelete}
              />
            )}
          </TabsContent>

          <TabsContent value="batches" className="space-y-4">
            {viewingBatchId && currentBatch ? (
              <BatchDetailView
                batch={currentBatch}
                recipients={batchRecipients}
                isLoading={batchRecipientsLoading}
                onBack={handleBackFromBatch}
                onUpdateStatus={handleUpdateRecipientStatus}
                onUpdateBatchStatus={handleUpdateBatchStatus}
              />
            ) : (
              <BatchList
                batches={batchesWithStats.data || []}
                isLoading={allBatchesLoading || batchesWithStats.isLoading}
                onOpenBatch={handleOpenBatch}
              />
            )}
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
                <Label htmlFor="default_owner">Default Owner</Label>
                <Select
                  value={form.default_owner || "Unassigned"}
                  onValueChange={(value) => setForm({ ...form, default_owner: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OWNER_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                This will permanently delete this recipient and remove them from all batches.
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

        {/* New Batch Dialog */}
        <NewBatchDialog
          open={newBatchDialogOpen}
          onOpenChange={setNewBatchDialogOpen}
          onConfirm={handleCreateBatch}
          selectedCount={selectedRecipientIds.size}
          isCreating={createBatch.isPending}
        />
      </div>
    </AppLayout>
  );
}